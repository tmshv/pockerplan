package model

import "time"

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
	CreatedAt       time.Time        `json:"createdAt"`
	LastActivityAt  time.Time        `json:"lastActivityAt"`
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
