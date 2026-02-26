package campfire

import (
	"encoding/json"
	"pockerplan/ppback/model"
	"testing"
	"time"
)

func newCampfireRoom() *model.Room {
	r := &model.Room{
		ID:    "test-room-id",
		Users: make(map[string]*model.User),
	}
	Init(r)
	return r
}

func getState(t *testing.T, r *model.Room) model.CampfireState {
	t.Helper()
	if r.ThemeState == nil {
		t.Fatal("ThemeState is nil")
	}
	var s model.CampfireState
	if err := json.Unmarshal(r.ThemeState.Data, &s); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	return s
}

func TestInit(t *testing.T) {
	r := newCampfireRoom()
	s := getState(t, r)

	if len(s.Trees) != treeCount {
		t.Errorf("want %d trees, got %d", treeCount, len(s.Trees))
	}
	if s.FireLevel != 0 {
		t.Errorf("want FireLevel 0, got %d", s.FireLevel)
	}
}

func TestFeedFire_HappyPath(t *testing.T) {
	r := newCampfireRoom()
	s0 := getState(t, r)

	treeID := s0.Trees[0].ID
	fromX := s0.Trees[0].X
	fromY := s0.Trees[0].Y

	if err := FeedFire(r, "user1", treeID, fromX, fromY); err != nil {
		t.Fatalf("FeedFire: %v", err)
	}

	s := getState(t, r)
	if s.Trees[0].BurnedAt == nil {
		t.Error("BurnedAt should be set")
	}
	if s.Trees[0].RespawnAt == nil {
		t.Error("RespawnAt should be set")
	}
	if s.FireLevel != 1 {
		t.Errorf("want FireLevel 1, got %d", s.FireLevel)
	}

	// Event appended
	if len(r.PendingEvents) != 1 {
		t.Fatalf("want 1 event, got %d", len(r.PendingEvents))
	}
	ev := r.PendingEvents[0]
	if ev.Type != "theme_interaction" || ev.Action != "feed_fire" {
		t.Errorf("unexpected event: %+v", ev)
	}

	var payload model.FeedFirePayload
	if err := json.Unmarshal(ev.Payload, &payload); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	if payload.TreeID != treeID {
		t.Errorf("want treeID %d, got %d", treeID, payload.TreeID)
	}
}

func TestFeedFire_AlreadyBurned(t *testing.T) {
	r := newCampfireRoom()
	s0 := getState(t, r)
	treeID := s0.Trees[0].ID

	if err := FeedFire(r, "user1", treeID, 0, 0); err != nil {
		t.Fatalf("first FeedFire: %v", err)
	}
	err := FeedFire(r, "user1", treeID, 0, 0)
	if err != ErrTreeAlreadyBurned {
		t.Errorf("want ErrTreeAlreadyBurned, got %v", err)
	}
}

func TestFeedFire_NotFound(t *testing.T) {
	r := newCampfireRoom()
	err := FeedFire(r, "user1", 9999, 0, 0)
	if err != ErrTreeNotFound {
		t.Errorf("want ErrTreeNotFound, got %v", err)
	}
}

func TestFeedFire_FireLevelCap(t *testing.T) {
	r := newCampfireRoom()
	s0 := getState(t, r)
	for i := 0; i < maxFireLevel+2 && i < len(s0.Trees); i++ {
		_ = FeedFire(r, "user1", s0.Trees[i].ID, 0, 0)
	}
	s := getState(t, r)
	if s.FireLevel > maxFireLevel {
		t.Errorf("FireLevel %d exceeds cap %d", s.FireLevel, maxFireLevel)
	}
}

func TestNormalize_Decay(t *testing.T) {
	r := newCampfireRoom()
	s0 := getState(t, r)

	// Feed fire to set level to 2.
	_ = FeedFire(r, "u", s0.Trees[0].ID, 0, 0)
	_ = FeedFire(r, "u", s0.Trees[1].ID, 0, 0)

	// Backdate LastFedAt by 65s = 2 full 30s intervals.
	var state model.CampfireState
	_ = json.Unmarshal(r.ThemeState.Data, &state)
	state.LastFedAt = time.Now().Add(-65 * time.Second)
	data, _ := json.Marshal(state)
	r.ThemeState.Data = data

	Normalize(r)

	s := getState(t, r)
	if s.FireLevel != 0 {
		t.Errorf("want FireLevel 0 after 2 decay steps from 2, got %d", s.FireLevel)
	}
}

func TestNormalize_Respawn(t *testing.T) {
	r := newCampfireRoom()
	s0 := getState(t, r)
	treeID := s0.Trees[0].ID

	_ = FeedFire(r, "u", treeID, 0, 0)

	// Backdate RespawnAt to the past.
	var state model.CampfireState
	_ = json.Unmarshal(r.ThemeState.Data, &state)
	past := time.Now().Add(-1 * time.Second)
	state.Trees[0].RespawnAt = &past
	data, _ := json.Marshal(state)
	r.ThemeState.Data = data

	Normalize(r)

	s := getState(t, r)
	if s.Trees[0].BurnedAt != nil {
		t.Error("BurnedAt should be cleared after respawn")
	}
	if s.Trees[0].RespawnAt != nil {
		t.Error("RespawnAt should be cleared after respawn")
	}
}
