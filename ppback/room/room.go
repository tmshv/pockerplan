package room

import (
	"errors"
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
	if r.State != model.RoomStateVoting {
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

// RevealVotes transitions the room from voting to revealed.
func RevealVotes(r *model.Room) error {
	if r.State != model.RoomStateVoting {
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

// ResetVotes clears votes for the current ticket and goes back to voting.
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
		})
	}

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
		tickets = append(tickets, ts)
	}

	return &model.RoomSnapshot{
		ID:              r.ID,
		Name:            r.Name,
		Scale:           r.Scale,
		State:           r.State,
		Countdown:       r.Countdown,
		Users:           users,
		Tickets:         tickets,
		CurrentTicketID: r.CurrentTicketID,
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
