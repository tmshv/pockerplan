package campfire

import (
	"encoding/json"
	"errors"
	"math"
	"pockerplan/ppback/model"
	"time"
)

const (
	treeCount      = 9
	treeMinRadius  = 160.0
	treeMaxRadius  = 190.0
	cx             = 200.0 // SIZE/2 where SIZE=400
	cy             = 200.0
	fireDecayEvery = 30 * time.Second
	treeRespawnAfter = 60 * time.Second

	maxFireLevel = 5
)

var ErrTreeNotFound = errors.New("tree not found")
var ErrTreeAlreadyBurned = errors.New("tree already burned")

// fnv1a is a port of the frontend hashString (FNV-1a over UTF-8 bytes).
func fnv1a(s string) uint32 {
	h := uint32(0x811c9dc5)
	for i := 0; i < len(s); i++ {
		h = (h ^ uint32(s[i])) * 0x01000193
	}
	return h
}

// lcgNext advances seed in place and returns a value in [0, 1).
// Port of frontend makeRng LCG: s = (s * 1664525 + 1013904223) | 0
func lcgNext(seed *uint32) float64 {
	*seed = (*seed)*1664525 + 1013904223
	return float64(*seed) / (1 << 32)
}

// Init initialises the campfire theme state on the room, generating tree positions
// from the room ID using the same LCG/FNV formula as the frontend.
func Init(r *model.Room) {
	seed := fnv1a(r.ID)
	trees := make([]model.TreeState, treeCount)
	for i := 0; i < treeCount; i++ {
		baseAngle := float64(i) / float64(treeCount) * 2 * math.Pi
		angleJitter := (lcgNext(&seed) - 0.5) * (2 * math.Pi / float64(treeCount)) * 0.8
		angle := baseAngle + angleJitter
		radius := treeMinRadius + lcgNext(&seed)*(treeMaxRadius-treeMinRadius)
		size := 1.2 + lcgNext(&seed)*0.6
		trees[i] = model.TreeState{
			ID:   i,
			X:    cx + radius*math.Cos(angle),
			Y:    cy + radius*math.Sin(angle),
			Size: size,
		}
	}

	state := model.CampfireState{
		FireLevel: 0,
		Trees:     trees,
	}
	data, _ := json.Marshal(state)
	r.ThemeState = &model.ThemeState{
		Theme: model.ThemeTypeCampfire,
		Data:  json.RawMessage(data),
	}
}

// FeedFire marks a tree as burned, increments fire level, and appends an event.
func FeedFire(r *model.Room, userID string, treeID int, fromX, fromY float64) error {
	if r.ThemeState == nil || r.ThemeState.Theme != model.ThemeTypeCampfire {
		return errors.New("room has no campfire theme")
	}

	var state model.CampfireState
	if err := json.Unmarshal(r.ThemeState.Data, &state); err != nil {
		return err
	}

	idx := -1
	for i, t := range state.Trees {
		if t.ID == treeID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return ErrTreeNotFound
	}

	now := time.Now()
	if state.Trees[idx].BurnedAt != nil {
		return ErrTreeAlreadyBurned
	}

	burnedAt := now
	respawnAt := now.Add(treeRespawnAfter)
	state.Trees[idx].BurnedAt = &burnedAt
	state.Trees[idx].RespawnAt = &respawnAt

	if state.FireLevel < maxFireLevel {
		state.FireLevel++
	}
	state.LastFedAt = now

	payload, err := json.Marshal(model.FeedFirePayload{
		TreeID: treeID,
		FromX:  fromX,
		FromY:  fromY,
	})
	if err != nil {
		return err
	}

	data, err := json.Marshal(state)
	if err != nil {
		return err
	}
	r.ThemeState.Data = json.RawMessage(data)

	r.PendingEvents = append(r.PendingEvents, model.RoomEvent{
		Type:    "theme_interaction",
		Action:  "feed_fire",
		FromID:  userID,
		Payload: json.RawMessage(payload),
	})

	return nil
}

// Normalize runs fire decay and tree respawn. Returns true if anything changed.
func Normalize(r *model.Room) bool {
	if r.ThemeState == nil || r.ThemeState.Theme != model.ThemeTypeCampfire {
		return false
	}

	var state model.CampfireState
	if err := json.Unmarshal(r.ThemeState.Data, &state); err != nil {
		return false
	}

	now := time.Now()
	changed := false

	// Fire decay: subtract 1 level per elapsed 30s interval since last fed.
	if state.FireLevel > 0 && !state.LastFedAt.IsZero() {
		elapsed := now.Sub(state.LastFedAt)
		steps := int(elapsed / fireDecayEvery)
		if steps > 0 {
			decay := steps
			if decay > state.FireLevel {
				decay = state.FireLevel
			}
			state.FireLevel -= decay
			// Advance LastFedAt by the intervals consumed.
			state.LastFedAt = state.LastFedAt.Add(time.Duration(steps) * fireDecayEvery)
			changed = true
		}
	}

	// Tree respawn: if RespawnAt has passed, pick a new position.
	for i, t := range state.Trees {
		if t.BurnedAt != nil && t.RespawnAt != nil && now.After(*t.RespawnAt) {
			seed := uint32(now.UnixNano() + int64(t.ID)*1000003)
			baseAngle := float64(t.ID) / float64(treeCount) * 2 * math.Pi
			angleJitter := (lcgNext(&seed) - 0.5) * (2 * math.Pi / float64(treeCount)) * 0.8
			angle := baseAngle + angleJitter
			radius := treeMinRadius + lcgNext(&seed)*(treeMaxRadius-treeMinRadius)
			size := 1.2 + lcgNext(&seed)*0.6

			state.Trees[i].X = cx + radius*math.Cos(angle)
			state.Trees[i].Y = cy + radius*math.Sin(angle)
			state.Trees[i].Size = size
			state.Trees[i].BurnedAt = nil
			state.Trees[i].RespawnAt = nil
			changed = true
		}
	}

	if changed {
		data, err := json.Marshal(state)
		if err == nil {
			r.ThemeState.Data = json.RawMessage(data)
		}
	}
	return changed
}
