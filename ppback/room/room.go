package room

import (
	"errors"
	"sort"
	"pockerplan/ppback/model"
	"pockerplan/ppback/scale"
	"time"
)

var (
	ErrRoomNotFound    = errors.New("room not found")
	ErrUserNotFound    = errors.New("user not found")
	ErrTicketNotFound  = errors.New("ticket not found")
	ErrInvalidAdmin    = errors.New("invalid admin secret")
	ErrInvalidVote     = errors.New("invalid vote value")
	ErrNotVoting       = errors.New("room is not in voting state")
	ErrNoCurrentTicket = errors.New("no current ticket")
)

// SetName sets the room name.
func SetName(r *model.Room, name string) {
	r.Name = name
	touch(r)
}

// AddUser adds a user to the room. If a user with the given ID already exists,
// it updates their info and marks them connected.
func AddUser(r *model.Room, u *model.User) {
	u.Connected = true
	r.Users[u.ID] = u
	touch(r)
}

// RemoveUser marks a user as disconnected.
func RemoveUser(r *model.Room, userID string) {
	if u, ok := r.Users[userID]; ok {
		u.Connected = false
		touch(r)
	}
}

// SubmitVote records a vote for the current ticket.
func SubmitVote(r *model.Room, userID, value string) error {
	if r.State != model.RoomStateVoting && r.State != model.RoomStateCountingDown {
		return ErrNotVoting
	}
	if r.CurrentTicketID == "" {
		return ErrNoCurrentTicket
	}
	if _, ok := r.Users[userID]; !ok {
		return ErrUserNotFound
	}
	if !scale.ValidValue(r.Scale, value) {
		return ErrInvalidVote
	}
	ticket := findTicket(r, r.CurrentTicketID)
	if ticket == nil {
		return ErrTicketNotFound
	}
	ticket.Votes[userID] = model.Vote{UserID: userID, Value: value}
	touch(r)
	return nil
}

// RemoveVote removes the current user's vote from the current ticket.
func RemoveVote(r *model.Room, userID string) error {
	if r.State != model.RoomStateVoting && r.State != model.RoomStateCountingDown {
		return ErrNotVoting
	}
	if r.CurrentTicketID == "" {
		return ErrNoCurrentTicket
	}
	if _, ok := r.Users[userID]; !ok {
		return ErrUserNotFound
	}
	ticket := findTicket(r, r.CurrentTicketID)
	if ticket == nil {
		return ErrTicketNotFound
	}
	if _, had := ticket.Votes[userID]; had {
		delete(ticket.Votes, userID)
		touch(r)
	}
	return nil
}

// RevealVotes transitions the room from voting or counting_down to revealed.
func RevealVotes(r *model.Room) error {
	if r.State != model.RoomStateVoting && r.State != model.RoomStateCountingDown {
		return ErrNotVoting
	}
	r.State = model.RoomStateRevealed
	ticket := findTicket(r, r.CurrentTicketID)
	if ticket != nil {
		ticket.Status = model.TicketStatusRevealed
	}
	touch(r)
	return nil
}

// StartCountdown transitions the room from voting to counting_down.
func StartCountdown(r *model.Room) error {
	if r.State != model.RoomStateVoting {
		return ErrNotVoting
	}
	r.State = model.RoomStateCountingDown
	touch(r)
	return nil
}

// ResetVotes clears votes for the current ticket and goes back to voting.
// Works from voting, revealed, or counting_down states.
func ResetVotes(r *model.Room) error {
	if r.CurrentTicketID == "" {
		return ErrNoCurrentTicket
	}
	ticket := findTicket(r, r.CurrentTicketID)
	if ticket == nil {
		return ErrTicketNotFound
	}
	ticket.Votes = make(map[string]model.Vote)
	ticket.Status = model.TicketStatusVoting
	r.State = model.RoomStateVoting
	for _, u := range r.Users {
		u.Thinking = false
	}
	touch(r)
	return nil
}

// StartFreeVote creates an ephemeral ticket with empty content, sets it as
// current, and transitions the room to voting state. If the room already has a
// current empty-content ticket in voting state, it is a no-op (idempotency).
func StartFreeVote(r *model.Room, ticketID string) error {
	// Idempotency: if room already has a current empty-content ticket in voting state, no-op.
	if r.CurrentTicketID != "" && r.State == model.RoomStateVoting {
		current := findTicket(r, r.CurrentTicketID)
		if current != nil && current.Content == "" && current.Status == model.TicketStatusVoting {
			return nil
		}
	}

	// Reject if a real (content-bearing) ticket is actively being voted on.
	if r.State == model.RoomStateVoting || r.State == model.RoomStateCountingDown {
		current := findTicket(r, r.CurrentTicketID)
		if current != nil && current.Content != "" {
			return ErrNotVoting
		}
	}

	// Mark old ticket as skipped if it was in voting state.
	if r.CurrentTicketID != "" {
		old := findTicket(r, r.CurrentTicketID)
		if old != nil && old.Status == model.TicketStatusVoting {
			old.Status = model.TicketStatusSkipped
		}
	}

	// Clear thinking flags when starting a new vote round.
	for _, u := range r.Users {
		u.Thinking = false
	}

	// Reuse an existing empty-content ticket that was skipped or pending,
	// but not revealed (to preserve completed free-vote results).
	for _, t := range r.Tickets {
		if t.Content == "" && (t.Status == model.TicketStatusSkipped || t.Status == model.TicketStatusPending) {
			t.Status = model.TicketStatusVoting
			t.Votes = make(map[string]model.Vote)
			r.CurrentTicketID = t.ID
			r.State = model.RoomStateVoting
			touch(r)
			return nil
		}
	}

	t := &model.Ticket{
		ID:      ticketID,
		Content: "",
		Status:  model.TicketStatusVoting,
		Votes:   make(map[string]model.Vote),
	}
	r.Tickets = append(r.Tickets, t)
	r.CurrentTicketID = ticketID
	r.State = model.RoomStateVoting
	touch(r)
	return nil
}

// AddTicket adds a new ticket to the room.
func AddTicket(r *model.Room, t *model.Ticket) {
	t.Status = model.TicketStatusPending
	t.Votes = make(map[string]model.Vote)
	r.Tickets = append(r.Tickets, t)
	touch(r)
}

// SetCurrentTicket sets the current ticket and transitions to voting.
func SetCurrentTicket(r *model.Room, ticketID string) error {
	ticket := findTicket(r, ticketID)
	if ticket == nil {
		return ErrTicketNotFound
	}
	r.CurrentTicketID = ticketID
	r.State = model.RoomStateVoting
	ticket.Status = model.TicketStatusVoting
	touch(r)
	return nil
}

// NextTicket advances to the next pending ticket. If no pending tickets remain,
// the room goes idle. If the current ticket was still in voting state, it is
// marked as skipped.
func NextTicket(r *model.Room) error {
	if r.CurrentTicketID != "" {
		current := findTicket(r, r.CurrentTicketID)
		if current != nil && current.Status == model.TicketStatusVoting {
			current.Status = model.TicketStatusSkipped
		}
	}
	for _, t := range r.Tickets {
		if t.Status == model.TicketStatusPending {
			return SetCurrentTicket(r, t.ID)
		}
	}
	r.CurrentTicketID = ""
	r.State = model.RoomStateIdle
	touch(r)
	return nil
}

// ticketIndex returns the index of the ticket with the given ID, or -1 if not found.
func ticketIndex(r *model.Room, id string) int {
	for i, t := range r.Tickets {
		if t.ID == id {
			return i
		}
	}
	return -1
}

// NavigateToTicket navigates to the specified ticket, adjusting room and ticket state:
//   - pending: set status to voting, room state to voting
//   - revealed: room state to revealed (keep votes intact)
//   - skipped: re-open: set status to voting, clear votes, room state to voting
//   - voting: room state to voting (no change needed)
func NavigateToTicket(r *model.Room, ticketID string) error {
	ticket := findTicket(r, ticketID)
	if ticket == nil {
		return ErrTicketNotFound
	}
	if r.CurrentTicketID != "" && r.CurrentTicketID != ticketID {
		old := findTicket(r, r.CurrentTicketID)
		if old != nil && old.Status == model.TicketStatusVoting {
			old.Status = model.TicketStatusSkipped
		}
	}
	r.CurrentTicketID = ticketID
	switch ticket.Status {
	case model.TicketStatusPending:
		ticket.Status = model.TicketStatusVoting
		r.State = model.RoomStateVoting
	case model.TicketStatusRevealed:
		r.State = model.RoomStateRevealed
	case model.TicketStatusSkipped:
		ticket.Status = model.TicketStatusVoting
		ticket.Votes = make(map[string]model.Vote)
		r.State = model.RoomStateVoting
	case model.TicketStatusVoting:
		r.State = model.RoomStateVoting
	}
	touch(r)
	return nil
}

// NextTicketByIndex navigates to the ticket after the current one by index.
// Returns ErrTicketNotFound if at the end or if there are no tickets.
func NextTicketByIndex(r *model.Room) error {
	if len(r.Tickets) == 0 {
		return ErrTicketNotFound
	}
	idx := ticketIndex(r, r.CurrentTicketID)
	nextIdx := idx + 1
	if nextIdx >= len(r.Tickets) {
		return ErrTicketNotFound
	}
	return NavigateToTicket(r, r.Tickets[nextIdx].ID)
}

// PrevTicket navigates to the ticket before the current one by index.
// Returns ErrTicketNotFound if at the start or if there are no tickets.
func PrevTicket(r *model.Room) error {
	if len(r.Tickets) == 0 {
		return ErrTicketNotFound
	}
	idx := ticketIndex(r, r.CurrentTicketID)
	if idx <= 0 {
		return ErrTicketNotFound
	}
	return NavigateToTicket(r, r.Tickets[idx-1].ID)
}

// Snapshot returns a sanitized snapshot of the room.
// When a ticket is in voting state, vote values are hidden.
func Snapshot(r *model.Room) *model.RoomSnapshot {
	users := make([]*model.User, 0, len(r.Users))
	for _, u := range r.Users {
		users = append(users, &model.User{
			ID:        u.ID,
			Name:      u.Name,
			AvatarID:  u.AvatarID,
			IsAdmin:   u.IsAdmin,
			Connected: u.Connected,
			Thinking:  u.Thinking,
			JoinedAt:  u.JoinedAt,
		})
	}
	sort.Slice(users, func(i, j int) bool {
		return users[i].JoinedAt.Before(users[j].JoinedAt)
	})

	tickets := make([]*model.TicketSnapshot, 0, len(r.Tickets))
	for _, t := range r.Tickets {
		ts := &model.TicketSnapshot{
			ID:      t.ID,
			Content: t.Content,
			Status:  t.Status,
			Votes:   make([]model.VoteInfo, 0, len(t.Votes)),
		}
		for _, v := range t.Votes {
			vi := model.VoteInfo{UserID: v.UserID}
			if t.Status == model.TicketStatusRevealed {
				vi.Value = v.Value
			}
			ts.Votes = append(ts.Votes, vi)
		}
		sort.Slice(ts.Votes, func(i, j int) bool {
			return ts.Votes[i].UserID < ts.Votes[j].UserID
		})
		tickets = append(tickets, ts)
	}

	events := r.PendingEvents
	r.PendingEvents = nil

	return &model.RoomSnapshot{
		ID:              r.ID,
		Name:            r.Name,
		Scale:           r.Scale,
		State:           r.State,
		Countdown:       r.Countdown,
		Users:           users,
		Tickets:         tickets,
		CurrentTicketID: r.CurrentTicketID,
		Events:          events,
		ThemeState:      r.ThemeState,
	}
}

func findTicket(r *model.Room, id string) *model.Ticket {
	for _, t := range r.Tickets {
		if t.ID == id {
			return t
		}
	}
	return nil
}

func touch(r *model.Room) {
	r.LastActivityAt = time.Now()
}

// SetUserThinking updates the thinking flag for a user and records activity.
func SetUserThinking(r *model.Room, userID string, thinking bool) error {
	u, ok := r.Users[userID]
	if !ok {
		return ErrUserNotFound
	}
	u.Thinking = thinking
	touch(r)
	return nil
}
