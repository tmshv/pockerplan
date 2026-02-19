package hub

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"pockerplan/ppback/avatar"
	"pockerplan/ppback/model"
	"pockerplan/ppback/room"
	"pockerplan/ppback/scale"

	"github.com/centrifugal/centrifuge"
	"github.com/google/uuid"
)

var errorNotFound = &centrifuge.Error{Code: 404, Message: "not found"}

// clientInfo stores the mapping from a centrifuge client to the app-level user/room.
type clientInfo struct {
	UserID string
	RoomID string
}

// Hub wraps the centrifuge node and the room manager.
type Hub struct {
	node    *centrifuge.Node
	rooms   *room.Manager
	mu      sync.RWMutex
	clients map[string]clientInfo // centrifuge client ID -> clientInfo
}

// New creates and configures a new Hub.
func New(rm *room.Manager) (*Hub, error) {
	node, err := centrifuge.New(centrifuge.Config{
		LogLevel:   centrifuge.LogLevelInfo,
		LogHandler: func(e centrifuge.LogEntry) { log.Printf("[centrifuge] %s: %v", e.Message, e.Fields) },
	})
	if err != nil {
		return nil, fmt.Errorf("create centrifuge node: %w", err)
	}

	h := &Hub{
		node:    node,
		rooms:   rm,
		clients: make(map[string]clientInfo),
	}

	node.OnConnecting(func(ctx context.Context, e centrifuge.ConnectEvent) (centrifuge.ConnectReply, error) {
		return centrifuge.ConnectReply{
			Credentials: &centrifuge.Credentials{
				UserID: "",
			},
		}, nil
	})

	node.OnConnect(func(client *centrifuge.Client) {
		client.OnSubscribe(func(e centrifuge.SubscribeEvent, cb centrifuge.SubscribeCallback) {
			if !strings.HasPrefix(e.Channel, "room:") {
				cb(centrifuge.SubscribeReply{}, centrifuge.ErrorPermissionDenied)
				return
			}
			roomID := strings.TrimPrefix(e.Channel, "room:")
			if _, err := rm.Get(roomID); err != nil {
				cb(centrifuge.SubscribeReply{}, centrifuge.ErrorPermissionDenied)
				return
			}
			cb(centrifuge.SubscribeReply{}, nil)
		})

		client.OnRPC(func(e centrifuge.RPCEvent, cb centrifuge.RPCCallback) {
			reply, err := h.handleRPC(client, e.Method, e.Data)
			if err != nil {
				cb(centrifuge.RPCReply{}, err)
				return
			}
			cb(centrifuge.RPCReply{Data: reply}, nil)
		})

		client.OnDisconnect(func(e centrifuge.DisconnectEvent) {
			h.handleDisconnect(client.ID())
		})
	})

	return h, nil
}

// Node returns the underlying centrifuge node.
func (h *Hub) Node() *centrifuge.Node {
	return h.node
}

// Run starts the centrifuge node.
func (h *Hub) Run() error {
	return h.node.Run()
}

// Shutdown gracefully shuts down the centrifuge node.
func (h *Hub) Shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return h.node.Shutdown(ctx)
}

// registerClient stores the mapping from centrifuge client ID to user/room.
func (h *Hub) registerClient(clientID, userID, roomID string) {
	h.mu.Lock()
	h.clients[clientID] = clientInfo{UserID: userID, RoomID: roomID}
	h.mu.Unlock()
}

// unregisterClient removes the mapping and returns the info.
func (h *Hub) unregisterClient(clientID string) (clientInfo, bool) {
	h.mu.Lock()
	info, ok := h.clients[clientID]
	if ok {
		delete(h.clients, clientID)
	}
	h.mu.Unlock()
	return info, ok
}

// broadcastRoomState publishes the current room state to all subscribers.
func (h *Hub) broadcastRoomState(roomID string) {
	var snap *model.RoomSnapshot
	err := h.rooms.WithRoom(roomID, func(r *model.Room) error {
		snap = room.Snapshot(r)
		return nil
	})
	if err != nil {
		return
	}
	data, err := json.Marshal(snap)
	if err != nil {
		log.Printf("marshal room snapshot: %v", err)
		return
	}
	_, err = h.node.Publish("room:"+roomID, data)
	if err != nil {
		log.Printf("publish room state: %v", err)
	}
}

// handleRPC dispatches RPC calls by method name.
func (h *Hub) handleRPC(client *centrifuge.Client, method string, data []byte) ([]byte, error) {
	switch method {
	case "create_room":
		return h.rpcCreateRoom(client, data)
	case "join_room":
		return h.rpcJoinRoom(client, data)
	case "submit_vote":
		return h.rpcSubmitVote(data)
	case "add_ticket":
		return h.rpcAddTicket(data)
	case "reveal_votes":
		return h.rpcRevealVotes(data)
	case "reset_votes":
		return h.rpcResetVotes(data)
	case "next_ticket":
		return h.rpcNextTicket(data)
	default:
		return nil, centrifuge.ErrorMethodNotFound
	}
}

func (h *Hub) rpcCreateRoom(client *centrifuge.Client, data []byte) ([]byte, error) {
	var req model.CreateRoomRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, centrifuge.ErrorBadRequest
	}
	if req.ScaleID == "" || req.UserName == "" || req.AvatarID == "" {
		return nil, centrifuge.ErrorBadRequest
	}
	if _, err := scale.Get(req.ScaleID); err != nil {
		return nil, centrifuge.ErrorBadRequest
	}
	if !avatar.Valid(req.AvatarID) {
		return nil, centrifuge.ErrorBadRequest
	}

	r, err := h.rooms.Create(req.ScaleID)
	if err != nil {
		return nil, centrifuge.ErrorInternal
	}

	userID := uuid.New().String()
	u := &model.User{
		ID:       userID,
		Name:     req.UserName,
		AvatarID: req.AvatarID,
		IsAdmin:  true,
	}

	err = h.rooms.WithRoom(r.ID, func(r *model.Room) error {
		room.AddUser(r, u)
		return nil
	})
	if err != nil {
		return nil, centrifuge.ErrorInternal
	}

	h.registerClient(client.ID(), userID, r.ID)

	resp := model.CreateRoomResponse{
		RoomID:      r.ID,
		AdminSecret: r.AdminSecret,
		UserID:      userID,
		State:       r.State,
	}
	return json.Marshal(resp)
}

func (h *Hub) rpcJoinRoom(client *centrifuge.Client, data []byte) ([]byte, error) {
	var req model.JoinRoomRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, centrifuge.ErrorBadRequest
	}
	if req.RoomID == "" || req.UserName == "" || req.AvatarID == "" {
		return nil, centrifuge.ErrorBadRequest
	}
	if !avatar.Valid(req.AvatarID) {
		return nil, centrifuge.ErrorBadRequest
	}

	userID := req.UserID
	if userID == "" {
		userID = uuid.New().String()
	}

	var snap *model.RoomSnapshot
	err := h.rooms.WithRoom(req.RoomID, func(r *model.Room) error {
		existing, exists := r.Users[userID]
		u := &model.User{
			ID:       userID,
			Name:     req.UserName,
			AvatarID: req.AvatarID,
		}
		if exists {
			u.IsAdmin = existing.IsAdmin
		}
		room.AddUser(r, u)
		snap = room.Snapshot(r)
		return nil
	})
	if err != nil {
		if errors.Is(err, room.ErrRoomNotFound) {
			return nil, errorNotFound
		}
		return nil, centrifuge.ErrorInternal
	}

	h.registerClient(client.ID(), userID, req.RoomID)
	h.broadcastRoomState(req.RoomID)

	resp := model.JoinRoomResponse{
		UserID: userID,
		State:  snap,
	}
	return json.Marshal(resp)
}

func (h *Hub) rpcSubmitVote(data []byte) ([]byte, error) {
	var req model.SubmitVoteRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, centrifuge.ErrorBadRequest
	}
	if req.RoomID == "" || req.UserID == "" || req.Value == "" {
		return nil, centrifuge.ErrorBadRequest
	}

	err := h.rooms.WithRoom(req.RoomID, func(r *model.Room) error {
		return room.SubmitVote(r, req.UserID, req.Value)
	})
	if err != nil {
		if errors.Is(err, room.ErrRoomNotFound) {
			return nil, errorNotFound
		}
		return nil, &centrifuge.Error{Code: 400, Message: err.Error()}
	}

	h.broadcastRoomState(req.RoomID)
	return []byte(`{}`), nil
}

func (h *Hub) rpcAddTicket(data []byte) ([]byte, error) {
	var req model.AddTicketRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, centrifuge.ErrorBadRequest
	}
	if req.RoomID == "" || req.AdminSecret == "" || req.Title == "" {
		return nil, centrifuge.ErrorBadRequest
	}

	ticketID := uuid.New().String()
	err := h.rooms.WithRoom(req.RoomID, func(r *model.Room) error {
		if r.AdminSecret != req.AdminSecret {
			return room.ErrInvalidAdmin
		}
		room.AddTicket(r, &model.Ticket{
			ID:          ticketID,
			Title:       req.Title,
			Description: req.Description,
		})
		return nil
	})
	if err != nil {
		if errors.Is(err, room.ErrRoomNotFound) {
			return nil, errorNotFound
		}
		if errors.Is(err, room.ErrInvalidAdmin) {
			return nil, centrifuge.ErrorPermissionDenied
		}
		return nil, centrifuge.ErrorInternal
	}

	h.broadcastRoomState(req.RoomID)
	resp := model.AddTicketResponse{TicketID: ticketID}
	return json.Marshal(resp)
}

func (h *Hub) rpcRevealVotes(data []byte) ([]byte, error) {
	var req model.AdminActionRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, centrifuge.ErrorBadRequest
	}
	if req.RoomID == "" || req.AdminSecret == "" {
		return nil, centrifuge.ErrorBadRequest
	}

	err := h.rooms.WithRoom(req.RoomID, func(r *model.Room) error {
		if r.AdminSecret != req.AdminSecret {
			return room.ErrInvalidAdmin
		}
		return room.RevealVotes(r)
	})
	if err != nil {
		if errors.Is(err, room.ErrRoomNotFound) {
			return nil, errorNotFound
		}
		if errors.Is(err, room.ErrInvalidAdmin) {
			return nil, centrifuge.ErrorPermissionDenied
		}
		return nil, &centrifuge.Error{Code: 400, Message: err.Error()}
	}

	h.broadcastRoomState(req.RoomID)
	return []byte(`{}`), nil
}

func (h *Hub) rpcResetVotes(data []byte) ([]byte, error) {
	var req model.AdminActionRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, centrifuge.ErrorBadRequest
	}
	if req.RoomID == "" || req.AdminSecret == "" {
		return nil, centrifuge.ErrorBadRequest
	}

	err := h.rooms.WithRoom(req.RoomID, func(r *model.Room) error {
		if r.AdminSecret != req.AdminSecret {
			return room.ErrInvalidAdmin
		}
		return room.ResetVotes(r)
	})
	if err != nil {
		if errors.Is(err, room.ErrRoomNotFound) {
			return nil, errorNotFound
		}
		if errors.Is(err, room.ErrInvalidAdmin) {
			return nil, centrifuge.ErrorPermissionDenied
		}
		return nil, &centrifuge.Error{Code: 400, Message: err.Error()}
	}

	h.broadcastRoomState(req.RoomID)
	return []byte(`{}`), nil
}

func (h *Hub) rpcNextTicket(data []byte) ([]byte, error) {
	var req model.AdminActionRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, centrifuge.ErrorBadRequest
	}
	if req.RoomID == "" || req.AdminSecret == "" {
		return nil, centrifuge.ErrorBadRequest
	}

	err := h.rooms.WithRoom(req.RoomID, func(r *model.Room) error {
		if r.AdminSecret != req.AdminSecret {
			return room.ErrInvalidAdmin
		}
		return room.NextTicket(r)
	})
	if err != nil {
		if errors.Is(err, room.ErrRoomNotFound) {
			return nil, errorNotFound
		}
		if errors.Is(err, room.ErrInvalidAdmin) {
			return nil, centrifuge.ErrorPermissionDenied
		}
		return nil, &centrifuge.Error{Code: 400, Message: err.Error()}
	}

	h.broadcastRoomState(req.RoomID)
	return []byte(`{}`), nil
}

// handleDisconnect marks the user as disconnected and broadcasts updated state.
func (h *Hub) handleDisconnect(clientID string) {
	info, ok := h.unregisterClient(clientID)
	if !ok {
		return
	}

	err := h.rooms.WithRoom(info.RoomID, func(r *model.Room) error {
		room.RemoveUser(r, info.UserID)
		return nil
	})
	if err != nil {
		return
	}

	h.broadcastRoomState(info.RoomID)
}
