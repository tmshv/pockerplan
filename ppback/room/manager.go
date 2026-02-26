package room

import (
	"pockerplan/ppback/campfire"
	"pockerplan/ppback/model"
	"sync"
	"time"

	"github.com/google/uuid"
)

const defaultTTL = 24 * time.Hour

// Manager provides thread-safe room CRUD and TTL-based cleanup.
type Manager struct {
	mu    sync.RWMutex
	rooms map[string]*model.Room
	ttl   time.Duration
}

// NewManager creates a new room manager.
func NewManager() *Manager {
	return &Manager{
		rooms: make(map[string]*model.Room),
		ttl:   defaultTTL,
	}
}

// Create creates a new room with the given scale and returns it along with the admin secret.
func (m *Manager) Create(scaleID string, countdown int) (*model.Room, error) {
	now := time.Now()
	r := &model.Room{
		ID:             uuid.New().String(),
		AdminSecret:    uuid.New().String(),
		Scale:          scaleID,
		State:          model.RoomStateIdle,
		Countdown:      countdown,
		Users:          make(map[string]*model.User),
		Tickets:        make([]*model.Ticket, 0),
		CreatedAt:      now,
		LastActivityAt: now,
	}

	campfire.Init(r)

	m.mu.Lock()
	m.rooms[r.ID] = r
	m.mu.Unlock()

	return r, nil
}

// Get returns the room with the given ID.
func (m *Manager) Get(id string) (*model.Room, error) {
	m.mu.RLock()
	r, ok := m.rooms[id]
	m.mu.RUnlock()
	if !ok {
		return nil, ErrRoomNotFound
	}
	return r, nil
}

// WithRoom executes fn while holding the write lock. This ensures all
// mutations to a room are serialized.
func (m *Manager) WithRoom(id string, fn func(r *model.Room) error) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	r, ok := m.rooms[id]
	if !ok {
		return ErrRoomNotFound
	}
	return fn(r)
}

// NormalizeCampfireRooms runs campfire decay/respawn on all rooms while
// holding the write lock. Returns the IDs of rooms whose state changed.
func (m *Manager) NormalizeCampfireRooms() []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	var changed []string
	for id, r := range m.rooms {
		if campfire.Normalize(r) {
			changed = append(changed, id)
		}
	}
	return changed
}

// Delete removes a room.
func (m *Manager) Delete(id string) {
	m.mu.Lock()
	delete(m.rooms, id)
	m.mu.Unlock()
}

// Cleanup removes rooms that have been inactive for longer than the TTL.
// Returns the number of rooms removed.
func (m *Manager) Cleanup() int {
	m.mu.Lock()
	defer m.mu.Unlock()

	cutoff := time.Now().Add(-m.ttl)
	removed := 0
	for id, r := range m.rooms {
		if r.LastActivityAt.Before(cutoff) {
			delete(m.rooms, id)
			removed++
		}
	}
	return removed
}

// Count returns the number of active rooms.
func (m *Manager) Count() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.rooms)
}

// StartCleanup runs periodic cleanup in a goroutine.
// It stops when the done channel is closed.
func (m *Manager) StartCleanup(interval time.Duration, done <-chan struct{}) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				m.Cleanup()
			case <-done:
				return
			}
		}
	}()
}
