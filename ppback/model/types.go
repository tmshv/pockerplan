package model

import (
	"encoding/json"
	"time"
)

// ThemeType identifies which theme a room uses.
type ThemeType string

const ThemeTypeCampfire ThemeType = "campfire"

// ThemeState is a generic envelope stored on the Room.
type ThemeState struct {
	Theme ThemeType       `json:"theme"`
	Data  json.RawMessage `json:"data"`
}

// TreeState represents a single tree in the campfire theme.
// Nil BurnedAt/RespawnAt means the tree is alive.
type TreeState struct {
	ID        int        `json:"id"`
	X         float64    `json:"x"`
	Y         float64    `json:"y"`
	Size      float64    `json:"size"`
	BurnedAt  *time.Time `json:"burnedAt,omitempty"`
	RespawnAt *time.Time `json:"respawnAt,omitempty"`
}

// CampfireState holds fire level and tree positions.
type CampfireState struct {
	FireLevel int         `json:"fireLevel"`
	LastFedAt time.Time   `json:"lastFedAt"`
	Trees     []TreeState `json:"trees"`
}

// FeedFirePayload is embedded in a RoomEvent when a tree is thrown onto the fire.
type FeedFirePayload struct {
	TreeID int     `json:"treeId"`
	FromX  float64 `json:"fromX"`
	FromY  float64 `json:"fromY"`
}

// ThemeInteractRequest is the RPC request body for "theme_interact".
type ThemeInteractRequest struct {
	RoomID string          `json:"roomId"`
	UserID string          `json:"userId"`
	Action string          `json:"action"`
	Data   json.RawMessage `json:"data"`
}

// FeedFireRequest is the action-specific data for the "feed_fire" action.
type FeedFireRequest struct {
	TreeID int     `json:"treeId"`
	FromX  float64 `json:"fromX"`
	FromY  float64 `json:"fromY"`
}

type RoomState string

const (
	RoomStateIdle         RoomState = "idle"
	RoomStateVoting       RoomState = "voting"
	RoomStateRevealed     RoomState = "revealed"
	RoomStateCountingDown RoomState = "counting_down"
)

type TicketStatus string

const (
	TicketStatusPending  TicketStatus = "pending"
	TicketStatusVoting   TicketStatus = "voting"
	TicketStatusRevealed TicketStatus = "revealed"
	TicketStatusSkipped  TicketStatus = "skipped"
)

type Vote struct {
	UserID string `json:"userId"`
	Value  string `json:"value"`
}

type Ticket struct {
	ID      string          `json:"id"`
	Content string          `json:"content"`
	Status  TicketStatus    `json:"status"`
	Votes   map[string]Vote `json:"votes"`
}

type User struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	AvatarID  string `json:"avatarId"`
	IsAdmin   bool   `json:"isAdmin"`
	Connected bool   `json:"connected"`
	Thinking  bool   `json:"thinking"`
}

type RoomEvent struct {
	Type    string          `json:"type"`             // "player_interaction" or "theme_interaction"
	Action  string          `json:"action"`           // "paper_throw", "feed_fire", etc.
	FromID  string          `json:"fromId"`
	ToID    string          `json:"toId"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

type Room struct {
	ID              string           `json:"id"`
	Name            string           `json:"name"`
	AdminSecret     string           `json:"-"`
	Scale           string           `json:"scale"`
	State           RoomState        `json:"state"`
	Countdown       int              `json:"countdown"`
	Users           map[string]*User `json:"users"`
	Tickets         []*Ticket        `json:"tickets"`
	CurrentTicketID string           `json:"currentTicketId"`
	PendingEvents   []RoomEvent      `json:"pendingEvents,omitempty"`
	CreatedAt       time.Time        `json:"createdAt"`
	LastActivityAt  time.Time        `json:"lastActivityAt"`
	ThemeState      *ThemeState      `json:"themeState,omitempty"`
}

// RPC request types

type CreateRoomRequest struct {
	ScaleID  string `json:"scaleId"`
	UserName string `json:"userName"`
	AvatarID string `json:"avatarId"`
}

type CreateRoomResponse struct {
	RoomID      string    `json:"roomId"`
	AdminSecret string    `json:"adminSecret"`
	UserID      string    `json:"userId"`
	State       RoomState `json:"state"`
}

type JoinRoomRequest struct {
	RoomID   string `json:"roomId"`
	UserName string `json:"userName"`
	AvatarID string `json:"avatarId"`
	UserID   string `json:"userId,omitempty"`
}

type JoinRoomResponse struct {
	UserID string        `json:"userId"`
	State  *RoomSnapshot `json:"state"`
}

type SubmitVoteRequest struct {
	RoomID string `json:"roomId"`
	UserID string `json:"userId"`
	Value  string `json:"value"`
}

type RemoveVoteRequest struct {
	RoomID string `json:"roomId"`
	UserID string `json:"userId"`
}

type AddTicketRequest struct {
	RoomID      string `json:"roomId"`
	AdminSecret string `json:"adminSecret"`
	Content     string `json:"content"`
}

type AddTicketResponse struct {
	TicketID string `json:"ticketId"`
}

type AdminActionRequest struct {
	RoomID      string `json:"roomId"`
	AdminSecret string `json:"adminSecret"`
}

type UpdateRoomNameRequest struct {
	RoomID      string `json:"roomId"`
	AdminSecret string `json:"adminSecret"`
	Name        string `json:"name"`
}

type SetTicketRequest struct {
	RoomID      string `json:"roomId"`
	AdminSecret string `json:"adminSecret"`
	TicketID    string `json:"ticketId"`
}

type SetThinkingRequest struct {
	RoomID   string `json:"roomId"`
	UserID   string `json:"userId"`
	Thinking bool   `json:"thinking"`
}

type InteractPlayerRequest struct {
	RoomID       string `json:"roomId"`
	UserID       string `json:"userId"`
	TargetUserID string `json:"targetUserId"`
	Action       string `json:"action"` // e.g. "paper_throw"
}

// RoomSnapshot is the sanitized room state sent to clients.
// When state is "voting", vote values are hidden.
type RoomSnapshot struct {
	ID              string            `json:"id"`
	Name            string            `json:"name"`
	Scale           string            `json:"scale"`
	State           RoomState         `json:"state"`
	Countdown       int               `json:"countdown"`
	Users           []*User           `json:"users"`
	Tickets         []*TicketSnapshot `json:"tickets"`
	CurrentTicketID string            `json:"currentTicketId"`
	TicketsEnabled  bool              `json:"ticketsEnabled"`
	Events          []RoomEvent       `json:"events,omitempty"`
	ThemeState      *ThemeState       `json:"themeState,omitempty"`
}

type TicketSnapshot struct {
	ID      string       `json:"id"`
	Content string       `json:"content"`
	Status  TicketStatus `json:"status"`
	Votes   []VoteInfo   `json:"votes"`
}

// VoteInfo represents a vote in a snapshot.
// Value is empty when votes are hidden (during voting).
type VoteInfo struct {
	UserID string `json:"userId"`
	Value  string `json:"value,omitempty"`
}
