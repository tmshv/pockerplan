package room

import (
	"pockerplan/ppback/model"
	"sync"
	"testing"
	"time"
)

func TestManagerCreate(t *testing.T) {
	m := NewManager()

	r, err := m.Create("fibonacci", 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.ID == "" {
		t.Error("expected non-empty room ID")
	}
	if r.AdminSecret == "" {
		t.Error("expected non-empty admin secret")
	}
	if r.Scale != "fibonacci" {
		t.Errorf("expected scale fibonacci, got %s", r.Scale)
	}
	if r.State != model.RoomStateIdle {
		t.Errorf("expected state idle, got %s", r.State)
	}
	if m.Count() != 1 {
		t.Errorf("expected 1 room, got %d", m.Count())
	}
}

func TestManagerGet(t *testing.T) {
	m := NewManager()
	r, _ := m.Create("fibonacci", 3)

	got, err := m.Get(r.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != r.ID {
		t.Errorf("expected room ID %s, got %s", r.ID, got.ID)
	}
}

func TestManagerGetNotFound(t *testing.T) {
	m := NewManager()
	_, err := m.Get("nonexistent")
	if err != ErrRoomNotFound {
		t.Errorf("expected ErrRoomNotFound, got %v", err)
	}
}

func TestManagerWithRoom(t *testing.T) {
	m := NewManager()
	r, _ := m.Create("fibonacci", 3)

	err := m.WithRoom(r.ID, func(r *model.Room) error {
		AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
		return nil
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	got, _ := m.Get(r.ID)
	if len(got.Users) != 1 {
		t.Errorf("expected 1 user, got %d", len(got.Users))
	}
}

func TestManagerWithRoomNotFound(t *testing.T) {
	m := NewManager()
	err := m.WithRoom("nonexistent", func(r *model.Room) error {
		return nil
	})
	if err != ErrRoomNotFound {
		t.Errorf("expected ErrRoomNotFound, got %v", err)
	}
}

func TestManagerDelete(t *testing.T) {
	m := NewManager()
	r, _ := m.Create("fibonacci", 3)
	m.Delete(r.ID)

	if m.Count() != 0 {
		t.Errorf("expected 0 rooms, got %d", m.Count())
	}
}

func TestManagerCleanup(t *testing.T) {
	m := NewManager()
	m.ttl = 50 * time.Millisecond

	r1, _ := m.Create("fibonacci", 3)
	_ = r1 // keep reference

	// Wait for TTL to expire
	time.Sleep(100 * time.Millisecond)

	// Create a fresh room that should not be cleaned up
	_, _ = m.Create("linear", 3)

	removed := m.Cleanup()
	if removed != 1 {
		t.Errorf("expected 1 room removed, got %d", removed)
	}
	if m.Count() != 1 {
		t.Errorf("expected 1 room remaining, got %d", m.Count())
	}
}

func TestManagerCleanupKeepsActive(t *testing.T) {
	m := NewManager()
	m.ttl = 50 * time.Millisecond

	r, _ := m.Create("fibonacci", 3)

	// Touch the room to keep it alive
	time.Sleep(30 * time.Millisecond)
	_ = m.WithRoom(r.ID, func(r *model.Room) error {
		AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
		return nil
	})

	time.Sleep(30 * time.Millisecond)
	removed := m.Cleanup()
	if removed != 0 {
		t.Errorf("expected 0 rooms removed, got %d", removed)
	}
}

func TestManagerStartCleanup(t *testing.T) {
	m := NewManager()
	m.ttl = 10 * time.Millisecond

	_, _ = m.Create("fibonacci", 3)

	done := make(chan struct{})
	m.StartCleanup(20*time.Millisecond, done)

	// Wait for cleanup to run
	time.Sleep(50 * time.Millisecond)
	close(done)

	if m.Count() != 0 {
		t.Errorf("expected 0 rooms after cleanup, got %d", m.Count())
	}
}

func TestManagerConcurrentCreateGet(t *testing.T) {
	m := NewManager()
	var wg sync.WaitGroup
	roomIDs := make(chan string, 100)

	// Concurrent creates
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r, err := m.Create("fibonacci", 3)
			if err != nil {
				t.Errorf("concurrent Create failed: %v", err)
				return
			}
			roomIDs <- r.ID
		}()
	}

	wg.Wait()
	close(roomIDs)

	if m.Count() != 50 {
		t.Errorf("expected 50 rooms, got %d", m.Count())
	}

	// Concurrent gets
	var wg2 sync.WaitGroup
	for id := range roomIDs {
		wg2.Add(1)
		go func(id string) {
			defer wg2.Done()
			_, err := m.Get(id)
			if err != nil {
				t.Errorf("concurrent Get(%s) failed: %v", id, err)
			}
		}(id)
	}
	wg2.Wait()
}

func TestManagerConcurrentWithRoom(t *testing.T) {
	m := NewManager()
	r, _ := m.Create("fibonacci", 3)

	var wg sync.WaitGroup

	// Concurrent mutations via WithRoom
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_ = m.WithRoom(r.ID, func(r *model.Room) error {
				AddUser(r, &model.User{
					ID:       "u" + string(rune('A'+i%26)) + string(rune('0'+i/26)),
					Name:     "User",
					AvatarID: "cat",
				})
				return nil
			})
		}(i)
	}

	wg.Wait()

	got, _ := m.Get(r.ID)
	if len(got.Users) != 50 {
		t.Errorf("expected 50 users after concurrent adds, got %d", len(got.Users))
	}
}

func TestManagerConcurrentCleanup(t *testing.T) {
	m := NewManager()
	m.ttl = 1 * time.Millisecond

	var wg sync.WaitGroup

	// Concurrent creates and cleanups
	for i := 0; i < 20; i++ {
		wg.Add(2)
		go func() {
			defer wg.Done()
			_, _ = m.Create("fibonacci", 3)
		}()
		go func() {
			defer wg.Done()
			m.Cleanup()
		}()
	}

	wg.Wait()
	// Just verify no panics occurred
}

func TestManagerCount(t *testing.T) {
	m := NewManager()

	if m.Count() != 0 {
		t.Errorf("expected 0, got %d", m.Count())
	}

	r1, _ := m.Create("fibonacci", 3)
	r2, _ := m.Create("linear", 3)

	if m.Count() != 2 {
		t.Errorf("expected 2, got %d", m.Count())
	}

	m.Delete(r1.ID)
	if m.Count() != 1 {
		t.Errorf("expected 1, got %d", m.Count())
	}

	m.Delete(r2.ID)
	if m.Count() != 0 {
		t.Errorf("expected 0, got %d", m.Count())
	}
}

func TestManagerUniqueIDs(t *testing.T) {
	m := NewManager()
	ids := make(map[string]bool)

	for i := 0; i < 100; i++ {
		r, err := m.Create("fibonacci", 3)
		if err != nil {
			t.Fatal(err)
		}
		if ids[r.ID] {
			t.Fatalf("duplicate room ID: %s", r.ID)
		}
		ids[r.ID] = true
	}
}
