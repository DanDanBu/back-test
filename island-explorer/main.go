package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"island-explorer/db"
	"island-explorer/graph"
	"island-explorer/middleware"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/v2/bson"
)

// WebSocket hub
type Hub struct {
	clients   map[string]*websocket.Conn
	broadcast chan WSMessage
	mu        sync.RWMutex
}

type WSMessage struct {
	Event    string `json:"event"`
	PlayerID string `json:"playerId"`
	Data     any    `json:"data"`
}

var hub = &Hub{
	clients:   make(map[string]*websocket.Conn),
	broadcast: make(chan WSMessage, 256),
}

func (h *Hub) run() {
	for msg := range h.broadcast {
		data, _ := json.Marshal(msg)
		h.mu.RLock()
		for id, conn := range h.clients {
			if id == msg.PlayerID {
				continue
			}
			if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
				log.Printf("ws write error for %s: %v", id, err)
			}
		}
		h.mu.RUnlock()
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func wsHandler(c *gin.Context) {
	playerID := c.Query("playerId")
	if playerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "playerId required"})
		return
	}
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}
	hub.mu.Lock()
	hub.clients[playerID] = conn
	hub.mu.Unlock()
	defer func() {
		hub.mu.Lock()
		delete(hub.clients, playerID)
		hub.mu.Unlock()
		conn.Close()
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var wsMsg WSMessage
		if json.Unmarshal(msg, &wsMsg) == nil {
			wsMsg.PlayerID = playerID
			hub.broadcast <- wsMsg
		}
	}
}

func graphqlHandler(r *graph.Resolver) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Query     string         `json:"query"`
			Variables map[string]any `json:"variables"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		result, err := dispatchQuery(c.Request.Context(), r, req.Query, req.Variables)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"errors": []gin.H{{"message": err.Error()}}})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": result})
	}
}

func dispatchQuery(ctx context.Context, r *graph.Resolver, query string, vars map[string]any) (any, error) {
	q := r.Query()
	m := r.Mutation()

	switch {
	case strContains(query, "createPlayer"):
		name, _ := vars["name"].(string)
		var at *int
		if v, ok := vars["avatarType"]; ok {
			if f, ok := v.(float64); ok {
				i := int(f); at = &i
			}
		}
		return m.CreatePlayer(ctx, name, at)

	case strContains(query, "getPlayer"):
		id, _ := vars["id"].(string)
		return q.GetPlayer(ctx, id)

	case strContains(query, "getAchievements"):
		pid, _ := vars["playerId"].(string)
		return q.GetAchievements(ctx, pid)

	case strContains(query, "listPlayers"):
		return q.ListPlayers(ctx)

	case strContains(query, "updatePlayer"):
		id, _ := vars["id"].(string)
		var xp, coins *int
		if v, ok := vars["xp"]; ok {
			if f, ok := v.(float64); ok { i := int(f); xp = &i }
		}
		if v, ok := vars["coins"]; ok {
			if f, ok := v.(float64); ok { i := int(f); coins = &i }
		}
		var items []string
		if v, ok := vars["collectedItems"]; ok {
			if arr, ok := v.([]any); ok {
				for _, s := range arr {
					if str, ok := s.(string); ok {
						items = append(items, str)
					}
				}
			}
		}
		var pos *graph.PositionGQL
		if v, ok := vars["position"]; ok {
			if p, ok := v.(map[string]any); ok {
				pos = &graph.PositionGQL{X: toFloat(p["x"]), Y: toFloat(p["y"]), Z: toFloat(p["z"])}
			}
		}
		return m.UpdatePlayer(ctx, id, xp, coins, items, pos)

	case strContains(query, "unlockAchievement"):
		pid, _ := vars["playerId"].(string)
		aid, _ := vars["achieveId"].(string)
		name, _ := vars["name"].(string)
		desc, _ := vars["description"].(string)
		reward := int(toFloat(vars["reward"]))
		return m.UnlockAchievement(ctx, pid, aid, name, desc, reward)
	}
	return nil, fmt.Errorf("unknown operation")
}

func strContains(s, sub string) bool {
	if len(sub) > len(s) { return false }
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub { return true }
	}
	return false
}

func toFloat(v any) float64 {
	switch val := v.(type) {
	case float64: return val
	case int: return float64(val)
	}
	return 0
}

func leaderboardHandler(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	cursor, err := db.Players().Find(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)
	type Entry struct {
		Name  string `json:"name"`
		XP    int    `json:"xp"`
		Coins int    `json:"coins"`
		Items int    `json:"items"`
	}
	var entries []Entry
	for cursor.Next(ctx) {
		var p struct {
			Name           string   `bson:"name"`
			XP             int      `bson:"xp"`
			Coins          int      `bson:"coins"`
			CollectedItems []string `bson:"collectedItems"`
		}
		if err := cursor.Decode(&p); err != nil { continue }
		entries = append(entries, Entry{Name: p.Name, XP: p.XP, Coins: p.Coins, Items: len(p.CollectedItems)})
	}
	if entries == nil { entries = []Entry{} }
	c.JSON(http.StatusOK, entries)
}

func loginHandler(c *gin.Context) {
	var body struct {
		PlayerID string `json:"playerId"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.PlayerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "playerId required"})
		return
	}
	oid, err := bson.ObjectIDFromHex(body.PlayerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid playerId"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	count, err := db.Players().CountDocuments(ctx, bson.M{"_id": oid})
	if err != nil || count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "player not found"})
		return
	}
	token, err := middleware.GenerateToken(body.PlayerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token generation failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token, "expiresIn": 604800})
}

func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"service":   "island-explorer",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

func main() {
	db.Connect()
	go hub.run()

	r := gin.Default()
	r.Use(corsMiddleware())
	resolver := &graph.Resolver{}

	r.GET("/health", healthHandler)
	r.POST("/auth/login", loginHandler)
	r.GET("/ws", wsHandler)
	r.GET("/leaderboard", leaderboardHandler)
	r.POST("/graphql", graphqlHandler(resolver))
	r.GET("/graphql", func(c *gin.Context) {
		c.Header("Content-Type", "text/html")
		c.String(http.StatusOK, graphiQLHTML)
	})

	port := os.Getenv("PORT")
	if port == "" { port = "8080" }
	log.Printf("Island Explorer API on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" { c.AbortWithStatus(204); return }
		c.Next()
	}
}

const graphiQLHTML = `<!DOCTYPE html>
<html><head><title>Island Explorer API</title>
<link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css"/></head>
<body style="margin:0">
<div id="graphiql" style="height:100vh"></div>
<script src="https://unpkg.com/react/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/graphiql/graphiql.min.js"></script>
<script>
ReactDOM.createRoot(document.getElementById('graphiql')).render(
  React.createElement(GraphiQL,{fetcher:GraphiQL.createFetcher({url:'/graphql'})})
);
</script></body></html>`

// keep middleware import used
var _ = middleware.AuthRequired
