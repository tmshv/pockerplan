package hub

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"pockerplan/ppback/model"
	"pockerplan/ppback/room"

	"github.com/centrifugal/centrifuge"
	centrifugecli "github.com/centrifugal/centrifuge-go"
)

type testEnv struct {
	hub   *Hub
	rooms *room.Manager
	srv   *httptest.Server
	wsURL string
}

func newTestEnv(t *testing.T) *testEnv {
	t.Helper()
	rm := room.NewManager()
	h, err := New(rm)
	if err != nil {
		t.Fatalf("create hub: %v", err)
	}
	if err := h.Run(); err != nil {
		t.Fatalf("run hub: %v", err)
	}

	mux := http.NewServeMux()
	wsHandler := centrifuge.NewWebsocketHandler(h.Node(), centrifuge.WebsocketConfig{
		CheckOrigin: func(r *http.Request) bool { return true },
	})
	mux.Handle("/connection/websocket", wsHandler)
	srv := httptest.NewServer(mux)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/connection/websocket"

	t.Cleanup(func() {
		srv.Close()
		_ = h.Shutdown()
	})

	return &testEnv{hub: h, rooms: rm, srv: srv, wsURL: wsURL}
}

func (e *testEnv) newClient(t *testing.T) *centrifugecli.Client {
	t.Helper()
	client := centrifugecli.NewJsonClient(e.wsURL, centrifugecli.Config{})
	if err := client.Connect(); err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(func() { client.Close() })
	return client
}

func rpcCreateRoom(t *testing.T, client *centrifugecli.Client, scaleID, userName, avatarID string) model.CreateRoomResponse {
	t.Helper()
	data, _ := json.Marshal(model.CreateRoomRequest{
		ScaleID:  scaleID,
		UserName: userName,
		AvatarID: avatarID,
	})
	result, err := client.RPC(context.Background(), "create_room", data)
	if err != nil {
		t.Fatalf("create_room: %v", err)
	}
	var resp model.CreateRoomResponse
	if err := json.Unmarshal(result.Data, &resp); err != nil {
		t.Fatalf("unmarshal create response: %v", err)
	}
	return resp
}

func rpcJoinRoom(t *testing.T, client *centrifugecli.Client, roomID, userName, avatarID, userID string) model.JoinRoomResponse {
	t.Helper()
	data, _ := json.Marshal(model.JoinRoomRequest{
		RoomID:   roomID,
		UserName: userName,
		AvatarID: avatarID,
		UserID:   userID,
	})
	result, err := client.RPC(context.Background(), "join_room", data)
	if err != nil {
		t.Fatalf("join_room: %v", err)
	}
	var resp model.JoinRoomResponse
	if err := json.Unmarshal(result.Data, &resp); err != nil {
		t.Fatalf("unmarshal join response: %v", err)
	}
	return resp
}

func TestCreateRoom(t *testing.T) {
	env := newTestEnv(t)
	client := env.newClient(t)

	resp := rpcCreateRoom(t, client, "fibonacci", "Alice", "cat")

	if resp.RoomID == "" {
		t.Error("expected non-empty room ID")
	}
	if resp.AdminSecret == "" {
		t.Error("expected non-empty admin secret")
	}
	if resp.UserID == "" {
		t.Error("expected non-empty user ID")
	}
	if resp.State != model.RoomStateIdle {
		t.Errorf("expected state idle, got %s", resp.State)
	}

	r, err := env.rooms.Get(resp.RoomID)
	if err != nil {
		t.Fatalf("room not found: %v", err)
	}
	if len(r.Users) != 1 {
		t.Errorf("expected 1 user, got %d", len(r.Users))
	}
	u := r.Users[resp.UserID]
	if u == nil {
		t.Fatal("user not found")
	}
	if !u.IsAdmin {
		t.Error("expected admin")
	}
	if u.Name != "Alice" {
		t.Errorf("expected name Alice, got %s", u.Name)
	}
	if u.AvatarID != "cat" {
		t.Errorf("expected avatar cat, got %s", u.AvatarID)
	}
}

func TestCreateRoomValidation(t *testing.T) {
	env := newTestEnv(t)
	client := env.newClient(t)

	tests := []struct {
		name string
		req  model.CreateRoomRequest
	}{
		{"missing scale", model.CreateRoomRequest{UserName: "A", AvatarID: "cat"}},
		{"missing name", model.CreateRoomRequest{ScaleID: "fibonacci", AvatarID: "cat"}},
		{"missing avatar", model.CreateRoomRequest{ScaleID: "fibonacci", UserName: "A"}},
		{"invalid scale", model.CreateRoomRequest{ScaleID: "invalid", UserName: "A", AvatarID: "cat"}},
		{"invalid avatar", model.CreateRoomRequest{ScaleID: "fibonacci", UserName: "A", AvatarID: "invalid"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, _ := json.Marshal(tt.req)
			_, err := client.RPC(context.Background(), "create_room", data)
			if err == nil {
				t.Error("expected error")
			}
		})
	}
}

func TestJoinRoom(t *testing.T) {
	env := newTestEnv(t)
	admin := env.newClient(t)
	created := rpcCreateRoom(t, admin, "fibonacci", "Alice", "cat")

	user := env.newClient(t)
	joined := rpcJoinRoom(t, user, created.RoomID, "Bob", "dog", "")

	if joined.UserID == "" {
		t.Error("expected non-empty user ID")
	}
	if joined.State == nil {
		t.Fatal("expected non-nil state")
	}
	if len(joined.State.Users) != 2 {
		t.Errorf("expected 2 users, got %d", len(joined.State.Users))
	}
}

func TestJoinRoomNotFound(t *testing.T) {
	env := newTestEnv(t)
	client := env.newClient(t)

	data, _ := json.Marshal(model.JoinRoomRequest{
		RoomID:   "nonexistent",
		UserName: "Bob",
		AvatarID: "dog",
	})
	_, err := client.RPC(context.Background(), "join_room", data)
	if err == nil {
		t.Error("expected error for nonexistent room")
	}
}

func TestVotingFlow(t *testing.T) {
	env := newTestEnv(t)

	admin := env.newClient(t)
	created := rpcCreateRoom(t, admin, "fibonacci", "Alice", "cat")

	user := env.newClient(t)
	joined := rpcJoinRoom(t, user, created.RoomID, "Bob", "dog", "")

	// Add ticket
	addData, _ := json.Marshal(model.AddTicketRequest{
		RoomID:      created.RoomID,
		AdminSecret: created.AdminSecret,
		Title:       "Ticket 1",
		Description: "Do the thing",
	})
	addResult, err := admin.RPC(context.Background(), "add_ticket", addData)
	if err != nil {
		t.Fatalf("add_ticket: %v", err)
	}
	var addResp model.AddTicketResponse
	if err := json.Unmarshal(addResult.Data, &addResp); err != nil {
		t.Fatalf("unmarshal add_ticket response: %v", err)
	}
	if addResp.TicketID == "" {
		t.Error("expected non-empty ticket ID")
	}

	// Start voting
	nextData, _ := json.Marshal(model.AdminActionRequest{
		RoomID:      created.RoomID,
		AdminSecret: created.AdminSecret,
	})
	_, err = admin.RPC(context.Background(), "next_ticket", nextData)
	if err != nil {
		t.Fatalf("next_ticket: %v", err)
	}

	r, _ := env.rooms.Get(created.RoomID)
	if r.State != model.RoomStateVoting {
		t.Errorf("expected voting, got %s", r.State)
	}

	// Both vote
	vote1, _ := json.Marshal(model.SubmitVoteRequest{
		RoomID: created.RoomID,
		UserID: created.UserID,
		Value:  "5",
	})
	if _, err := admin.RPC(context.Background(), "submit_vote", vote1); err != nil {
		t.Fatalf("vote admin: %v", err)
	}

	vote2, _ := json.Marshal(model.SubmitVoteRequest{
		RoomID: created.RoomID,
		UserID: joined.UserID,
		Value:  "8",
	})
	if _, err := user.RPC(context.Background(), "submit_vote", vote2); err != nil {
		t.Fatalf("vote user: %v", err)
	}

	// Reveal
	revealData, _ := json.Marshal(model.AdminActionRequest{
		RoomID:      created.RoomID,
		AdminSecret: created.AdminSecret,
	})
	if _, err := admin.RPC(context.Background(), "reveal_votes", revealData); err != nil {
		t.Fatalf("reveal: %v", err)
	}

	r, _ = env.rooms.Get(created.RoomID)
	if r.State != model.RoomStateRevealed {
		t.Errorf("expected revealed, got %s", r.State)
	}

	// Reset
	resetData, _ := json.Marshal(model.AdminActionRequest{
		RoomID:      created.RoomID,
		AdminSecret: created.AdminSecret,
	})
	if _, err := admin.RPC(context.Background(), "reset_votes", resetData); err != nil {
		t.Fatalf("reset: %v", err)
	}

	r, _ = env.rooms.Get(created.RoomID)
	if r.State != model.RoomStateVoting {
		t.Errorf("expected voting after reset, got %s", r.State)
	}
}

func TestAdminAuthRequired(t *testing.T) {
	env := newTestEnv(t)
	client := env.newClient(t)
	created := rpcCreateRoom(t, client, "fibonacci", "Alice", "cat")

	wrongSecret := "wrong-secret"
	tests := []struct {
		name   string
		method string
		data   interface{}
	}{
		{"add_ticket", "add_ticket", model.AddTicketRequest{
			RoomID: created.RoomID, AdminSecret: wrongSecret, Title: "T",
		}},
		{"reveal_votes", "reveal_votes", model.AdminActionRequest{
			RoomID: created.RoomID, AdminSecret: wrongSecret,
		}},
		{"reset_votes", "reset_votes", model.AdminActionRequest{
			RoomID: created.RoomID, AdminSecret: wrongSecret,
		}},
		{"next_ticket", "next_ticket", model.AdminActionRequest{
			RoomID: created.RoomID, AdminSecret: wrongSecret,
		}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, _ := json.Marshal(tt.data)
			_, err := client.RPC(context.Background(), tt.method, data)
			if err == nil {
				t.Error("expected permission denied")
			}
		})
	}
}

func TestUnknownMethod(t *testing.T) {
	env := newTestEnv(t)
	client := env.newClient(t)

	_, err := client.RPC(context.Background(), "nonexistent", []byte(`{}`))
	if err == nil {
		t.Error("expected error for unknown method")
	}
}

func TestDisconnect(t *testing.T) {
	env := newTestEnv(t)

	client := centrifugecli.NewJsonClient(env.wsURL, centrifugecli.Config{})
	if err := client.Connect(); err != nil {
		t.Fatalf("connect: %v", err)
	}

	created := rpcCreateRoom(t, client, "fibonacci", "Alice", "cat")

	r, _ := env.rooms.Get(created.RoomID)
	if !r.Users[created.UserID].Connected {
		t.Error("expected connected")
	}

	client.Close()
	time.Sleep(200 * time.Millisecond)

	r, _ = env.rooms.Get(created.RoomID)
	if r.Users[created.UserID].Connected {
		t.Error("expected disconnected")
	}
}

func TestReconnect(t *testing.T) {
	env := newTestEnv(t)

	client1 := centrifugecli.NewJsonClient(env.wsURL, centrifugecli.Config{})
	if err := client1.Connect(); err != nil {
		t.Fatalf("connect: %v", err)
	}
	created := rpcCreateRoom(t, client1, "fibonacci", "Alice", "cat")
	client1.Close()
	time.Sleep(200 * time.Millisecond)

	client2 := env.newClient(t)
	joined := rpcJoinRoom(t, client2, created.RoomID, "Alice", "cat", created.UserID)

	if joined.UserID != created.UserID {
		t.Errorf("expected same user ID %s, got %s", created.UserID, joined.UserID)
	}

	r, _ := env.rooms.Get(created.RoomID)
	if !r.Users[created.UserID].IsAdmin {
		t.Error("expected admin preserved")
	}
	if !r.Users[created.UserID].Connected {
		t.Error("expected connected after rejoin")
	}
}

func TestSubscribeBroadcast(t *testing.T) {
	env := newTestEnv(t)
	client := env.newClient(t)
	created := rpcCreateRoom(t, client, "fibonacci", "Alice", "cat")

	sub, err := client.NewSubscription("room:" + created.RoomID)
	if err != nil {
		t.Fatalf("new subscription: %v", err)
	}

	published := make(chan []byte, 10)
	sub.OnPublication(func(e centrifugecli.PublicationEvent) {
		published <- e.Data
	})

	if err := sub.Subscribe(); err != nil {
		t.Fatalf("subscribe: %v", err)
	}

	// Trigger broadcast
	addData, _ := json.Marshal(model.AddTicketRequest{
		RoomID:      created.RoomID,
		AdminSecret: created.AdminSecret,
		Title:       "Test",
	})
	if _, err := client.RPC(context.Background(), "add_ticket", addData); err != nil {
		t.Fatalf("add_ticket: %v", err)
	}

	select {
	case data := <-published:
		var snap model.RoomSnapshot
		if err := json.Unmarshal(data, &snap); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		if len(snap.Tickets) != 1 {
			t.Errorf("expected 1 ticket, got %d", len(snap.Tickets))
		}
	case <-time.After(2 * time.Second):
		t.Error("timed out waiting for broadcast")
	}
}

func TestSubscribeInvalidChannel(t *testing.T) {
	env := newTestEnv(t)
	client := env.newClient(t)

	sub, err := client.NewSubscription("invalid:channel")
	if err != nil {
		t.Fatalf("new subscription: %v", err)
	}

	errCh := make(chan error, 1)
	sub.OnError(func(e centrifugecli.SubscriptionErrorEvent) {
		errCh <- e.Error
	})

	if err := sub.Subscribe(); err != nil {
		return // direct error is also fine
	}

	select {
	case <-errCh:
		// expected
	case <-time.After(2 * time.Second):
		t.Error("expected error for invalid channel")
	}
}

func TestSubscribeNonexistentRoom(t *testing.T) {
	env := newTestEnv(t)
	client := env.newClient(t)

	sub, err := client.NewSubscription("room:nonexistent")
	if err != nil {
		t.Fatalf("new subscription: %v", err)
	}

	errCh := make(chan error, 1)
	sub.OnError(func(e centrifugecli.SubscriptionErrorEvent) {
		errCh <- e.Error
	})

	if err := sub.Subscribe(); err != nil {
		return
	}

	select {
	case <-errCh:
		// expected
	case <-time.After(2 * time.Second):
		t.Error("expected error for nonexistent room channel")
	}
}
