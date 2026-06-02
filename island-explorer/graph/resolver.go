package graph

import (
	"context"
	"fmt"
	"time"

	"island-explorer/db"
	"island-explorer/models"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type PlayerGQL struct {
	ID             string      `json:"id"`
	Name           string      `json:"name"`
	AvatarType     int         `json:"avatarType"`
	XP             int         `json:"xp"`
	Coins          int         `json:"coins"`
	CollectedItems []string    `json:"collectedItems"`
	Position       PositionGQL `json:"position"`
	CreatedAt      string      `json:"createdAt"`
}

type PositionGQL struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

type AchievementGQL struct {
	ID          string `json:"id"`
	PlayerID    string `json:"playerId"`
	AchieveID   string `json:"achieveId"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Reward      int    `json:"reward"`
	UnlockedAt  string `json:"unlockedAt"`
}

func toPlayerGQL(p models.Player) PlayerGQL {
	items := p.CollectedItems
	if items == nil {
		items = []string{}
	}
	return PlayerGQL{
		ID:             p.ID.Hex(),
		Name:           p.Name,
		AvatarType:     p.AvatarType,
		XP:             p.XP,
		Coins:          p.Coins,
		CollectedItems: items,
		Position:       PositionGQL{X: p.Position.X, Y: p.Position.Y, Z: p.Position.Z},
		CreatedAt:      p.CreatedAt.Format(time.RFC3339),
	}
}

type Resolver struct{}

func (r *Resolver) Query() QueryResolver    { return &queryResolver{r} }
func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

type queryResolver struct{ *Resolver }
type mutationResolver struct{ *Resolver }

func (q *queryResolver) GetPlayer(ctx context.Context, id string) (*PlayerGQL, error) {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid id")
	}
	var player models.Player
	if err := db.Players().FindOne(ctx, bson.M{"_id": oid}).Decode(&player); err != nil {
		return nil, fmt.Errorf("player not found")
	}
	p := toPlayerGQL(player)
	return &p, nil
}

func (q *queryResolver) GetAchievements(ctx context.Context, playerID string) ([]AchievementGQL, error) {
	oid, err := bson.ObjectIDFromHex(playerID)
	if err != nil {
		return nil, fmt.Errorf("invalid playerId")
	}
	cursor, err := db.Achievements().Find(ctx, bson.M{"playerId": oid})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var results []AchievementGQL
	for cursor.Next(ctx) {
		var a models.Achievement
		if err := cursor.Decode(&a); err != nil {
			continue
		}
		results = append(results, AchievementGQL{
			ID: a.ID.Hex(), PlayerID: a.PlayerID.Hex(),
			AchieveID: a.AchieveID, Name: a.Name,
			Description: a.Description, Reward: a.Reward,
			UnlockedAt: a.UnlockedAt.Format(time.RFC3339),
		})
	}
	if results == nil {
		results = []AchievementGQL{}
	}
	return results, nil
}

func (q *queryResolver) ListPlayers(ctx context.Context) ([]PlayerGQL, error) {
	opts := options.Find().SetLimit(50).SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := db.Players().Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var results []PlayerGQL
	for cursor.Next(ctx) {
		var p models.Player
		if err := cursor.Decode(&p); err != nil {
			continue
		}
		results = append(results, toPlayerGQL(p))
	}
	if results == nil {
		results = []PlayerGQL{}
	}
	return results, nil
}

func (m *mutationResolver) CreatePlayer(ctx context.Context, name string, avatarType *int) (*PlayerGQL, error) {
	at := 0
	if avatarType != nil {
		at = *avatarType
	}
	player := models.Player{
		ID:             bson.NewObjectID(),
		Name:           name,
		AvatarType:     at,
		XP:             0,
		Coins:          0,
		CollectedItems: []string{},
		Position:       models.Position{X: 0, Y: 2, Z: 0},
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	if _, err := db.Players().InsertOne(ctx, player); err != nil {
		return nil, err
	}
	p := toPlayerGQL(player)
	return &p, nil
}

func (m *mutationResolver) UpdatePlayer(ctx context.Context, id string, xp, coins *int, collectedItems []string, position *PositionGQL) (*PlayerGQL, error) {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid id")
	}
	update := bson.M{"updatedAt": time.Now()}
	if xp != nil { update["xp"] = *xp }
	if coins != nil { update["coins"] = *coins }
	if collectedItems != nil { update["collectedItems"] = collectedItems }
	if position != nil {
		update["position"] = models.Position{X: position.X, Y: position.Y, Z: position.Z}
	}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updated models.Player
	if err := db.Players().FindOneAndUpdate(ctx, bson.M{"_id": oid}, bson.M{"$set": update}, opts).Decode(&updated); err != nil {
		return nil, err
	}
	p := toPlayerGQL(updated)
	return &p, nil
}

func (m *mutationResolver) UnlockAchievement(ctx context.Context, playerID, achieveID, name, description string, reward int) (*AchievementGQL, error) {
	oid, err := bson.ObjectIDFromHex(playerID)
	if err != nil {
		return nil, fmt.Errorf("invalid playerId")
	}
	var existing models.Achievement
	if err := db.Achievements().FindOne(ctx, bson.M{"playerId": oid, "achieveId": achieveID}).Decode(&existing); err == nil {
		return &AchievementGQL{
			ID: existing.ID.Hex(), PlayerID: existing.PlayerID.Hex(),
			AchieveID: existing.AchieveID, Name: existing.Name,
			Description: existing.Description, Reward: existing.Reward,
			UnlockedAt: existing.UnlockedAt.Format(time.RFC3339),
		}, nil
	}
	a := models.Achievement{
		ID: bson.NewObjectID(), PlayerID: oid,
		AchieveID: achieveID, Name: name, Description: description,
		Reward: reward, UnlockedAt: time.Now(),
	}
	if _, err := db.Achievements().InsertOne(ctx, a); err != nil {
		return nil, err
	}
	return &AchievementGQL{
		ID: a.ID.Hex(), PlayerID: a.PlayerID.Hex(),
		AchieveID: a.AchieveID, Name: a.Name,
		Description: a.Description, Reward: a.Reward,
		UnlockedAt: a.UnlockedAt.Format(time.RFC3339),
	}, nil
}

// Resolver interfaces
type QueryResolver interface {
	GetPlayer(ctx context.Context, id string) (*PlayerGQL, error)
	GetAchievements(ctx context.Context, playerID string) ([]AchievementGQL, error)
	ListPlayers(ctx context.Context) ([]PlayerGQL, error)
}

type MutationResolver interface {
	CreatePlayer(ctx context.Context, name string, avatarType *int) (*PlayerGQL, error)
	UpdatePlayer(ctx context.Context, id string, xp, coins *int, collectedItems []string, position *PositionGQL) (*PlayerGQL, error)
	UnlockAchievement(ctx context.Context, playerID, achieveID, name, description string, reward int) (*AchievementGQL, error)
}
