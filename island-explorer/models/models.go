package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Position struct {
	X float64 `bson:"x" json:"x"`
	Y float64 `bson:"y" json:"y"`
	Z float64 `bson:"z" json:"z"`
}

type Player struct {
	ID             bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Name           string        `bson:"name" json:"name"`
	AvatarType     int           `bson:"avatarType" json:"avatarType"`
	XP             int           `bson:"xp" json:"xp"`
	Coins          int           `bson:"coins" json:"coins"`
	CollectedItems []string      `bson:"collectedItems" json:"collectedItems"`
	Position       Position      `bson:"position" json:"position"`
	CreatedAt      time.Time     `bson:"createdAt" json:"createdAt"`
	UpdatedAt      time.Time     `bson:"updatedAt" json:"updatedAt"`
}

type Achievement struct {
	ID          bson.ObjectID `bson:"_id,omitempty" json:"id"`
	PlayerID    bson.ObjectID `bson:"playerId" json:"playerId"`
	AchieveID   string        `bson:"achieveId" json:"achieveId"`
	Name        string        `bson:"name" json:"name"`
	Description string        `bson:"description" json:"description"`
	Reward      int           `bson:"reward" json:"reward"`
	UnlockedAt  time.Time     `bson:"unlockedAt" json:"unlockedAt"`
}
