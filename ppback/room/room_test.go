package room

import (
	"pockerplan/ppback/model"
	"testing"
	"time"
)

func newTestRoom() *model.Room {
	now := time.Now()
	return &model.Room{
		ID:             "room-1",
		AdminSecret:    "secret-1",
		Scale:          "fibonacci",
		State:          model.RoomStateIdle,
		Users:          make(map[string]*model.User),
		Tickets:        make([]*model.Ticket, 0),
		CreatedAt:      now,
		LastActivityAt: now,
	}
}

func TestSetName(t *testing.T) {
	r := newTestRoom()
	SetName(r, "Sprint 42")

	if r.Name != "Sprint 42" {
		t.Errorf("expected name 'Sprint 42', got %q", r.Name)
	}
}

func TestSetNameEmpty(t *testing.T) {
	r := newTestRoom()
	SetName(r, "Sprint 42")
	SetName(r, "")

	if r.Name != "" {
		t.Errorf("expected empty name, got %q", r.Name)
	}
}

func TestSetNameUpdatesLastActivity(t *testing.T) {
	r := newTestRoom()
	originalTime := r.LastActivityAt

	time.Sleep(time.Millisecond)
	SetName(r, "Sprint 42")

	if !r.LastActivityAt.After(originalTime) {
		t.Error("expected LastActivityAt to be updated")
	}
}

func TestSnapshotIncludesName(t *testing.T) {
	r := newTestRoom()
	r.Name = "Sprint 42"

	snap := Snapshot(r)
	if snap.Name != "Sprint 42" {
		t.Errorf("expected snapshot name 'Sprint 42', got %q", snap.Name)
	}
}

func TestAddUser(t *testing.T) {
	r := newTestRoom()
	u := &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"}
	AddUser(r, u)

	if len(r.Users) != 1 {
		t.Fatalf("expected 1 user, got %d", len(r.Users))
	}
	if !r.Users["u1"].Connected {
		t.Error("expected user to be connected")
	}
	if r.Users["u1"].Name != "Alice" {
		t.Errorf("expected name Alice, got %s", r.Users["u1"].Name)
	}
}

func TestAddUserReconnect(t *testing.T) {
	r := newTestRoom()
	u := &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"}
	AddUser(r, u)
	RemoveUser(r, "u1")

	if r.Users["u1"].Connected {
		t.Error("expected user to be disconnected")
	}

	// Reconnect with updated name
	u2 := &model.User{ID: "u1", Name: "Alice Updated", AvatarID: "dog"}
	AddUser(r, u2)

	if !r.Users["u1"].Connected {
		t.Error("expected user to be reconnected")
	}
	if r.Users["u1"].Name != "Alice Updated" {
		t.Errorf("expected updated name, got %s", r.Users["u1"].Name)
	}
}

func TestRemoveUser(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	RemoveUser(r, "u1")

	if r.Users["u1"].Connected {
		t.Error("expected user to be disconnected")
	}
	// User should still exist in the map
	if _, ok := r.Users["u1"]; !ok {
		t.Error("expected user to still be in map after disconnect")
	}
}

func TestRemoveUserNonExistent(t *testing.T) {
	r := newTestRoom()
	// Should not panic
	RemoveUser(r, "nonexistent")
}

func TestSubmitVote(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	if err := SetCurrentTicket(r, "t1"); err != nil {
		t.Fatal(err)
	}

	err := SubmitVote(r, "u1", "5")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	ticket := findTicket(r, "t1")
	if len(ticket.Votes) != 1 {
		t.Fatalf("expected 1 vote, got %d", len(ticket.Votes))
	}
	if ticket.Votes["u1"].Value != "5" {
		t.Errorf("expected vote value 5, got %s", ticket.Votes["u1"].Value)
	}
}

func TestSubmitVoteChangeVote(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")

	_ = SubmitVote(r, "u1", "5")
	_ = SubmitVote(r, "u1", "8")

	ticket := findTicket(r, "t1")
	if ticket.Votes["u1"].Value != "8" {
		t.Errorf("expected changed vote to 8, got %s", ticket.Votes["u1"].Value)
	}
}

func TestSubmitVoteNotVoting(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})

	err := SubmitVote(r, "u1", "5")
	if err != ErrNotVoting {
		t.Errorf("expected ErrNotVoting, got %v", err)
	}
}

func TestSubmitVoteInvalidValue(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")

	err := SubmitVote(r, "u1", "999")
	if err != ErrInvalidVote {
		t.Errorf("expected ErrInvalidVote, got %v", err)
	}
}

func TestSubmitVoteUnknownUser(t *testing.T) {
	r := newTestRoom()
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")

	err := SubmitVote(r, "nonexistent", "5")
	if err != ErrUserNotFound {
		t.Errorf("expected ErrUserNotFound, got %v", err)
	}
}

func TestRevealVotes(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")
	_ = SubmitVote(r, "u1", "5")

	err := RevealVotes(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if r.State != model.RoomStateRevealed {
		t.Errorf("expected state revealed, got %s", r.State)
	}
	ticket := findTicket(r, "t1")
	if ticket.Status != model.TicketStatusRevealed {
		t.Errorf("expected ticket status revealed, got %s", ticket.Status)
	}
}

func TestRevealVotesNotVoting(t *testing.T) {
	r := newTestRoom()
	err := RevealVotes(r)
	if err != ErrNotVoting {
		t.Errorf("expected ErrNotVoting, got %v", err)
	}
}

func TestResetVotes(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")
	_ = SubmitVote(r, "u1", "5")
	_ = RevealVotes(r)

	err := ResetVotes(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if r.State != model.RoomStateVoting {
		t.Errorf("expected state voting, got %s", r.State)
	}
	ticket := findTicket(r, "t1")
	if len(ticket.Votes) != 0 {
		t.Errorf("expected 0 votes after reset, got %d", len(ticket.Votes))
	}
	if ticket.Status != model.TicketStatusVoting {
		t.Errorf("expected ticket status voting, got %s", ticket.Status)
	}
}

func TestResetVotesNoCurrentTicket(t *testing.T) {
	r := newTestRoom()
	err := ResetVotes(r)
	if err != ErrNoCurrentTicket {
		t.Errorf("expected ErrNoCurrentTicket, got %v", err)
	}
}

func TestAddTicket(t *testing.T) {
	r := newTestRoom()
	AddTicket(r, &model.Ticket{ID: "t1", Content: "# Description"})

	if len(r.Tickets) != 1 {
		t.Fatalf("expected 1 ticket, got %d", len(r.Tickets))
	}
	if r.Tickets[0].Status != model.TicketStatusPending {
		t.Errorf("expected status pending, got %s", r.Tickets[0].Status)
	}
	if r.Tickets[0].Votes == nil {
		t.Error("expected votes map to be initialized")
	}
	if r.Tickets[0].Content != "# Description" {
		t.Errorf("expected content '# Description', got %q", r.Tickets[0].Content)
	}
}

func TestSetCurrentTicket(t *testing.T) {
	r := newTestRoom()
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})

	err := SetCurrentTicket(r, "t1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if r.CurrentTicketID != "t1" {
		t.Errorf("expected current ticket t1, got %s", r.CurrentTicketID)
	}
	if r.State != model.RoomStateVoting {
		t.Errorf("expected state voting, got %s", r.State)
	}
}

func TestSetCurrentTicketNotFound(t *testing.T) {
	r := newTestRoom()
	err := SetCurrentTicket(r, "nonexistent")
	if err != ErrTicketNotFound {
		t.Errorf("expected ErrTicketNotFound, got %v", err)
	}
}

func TestNextTicket(t *testing.T) {
	r := newTestRoom()
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	AddTicket(r, &model.Ticket{ID: "t2", Content: "Task 2"})

	// Start voting on t1
	_ = SetCurrentTicket(r, "t1")
	_ = RevealVotes(r)

	// Move to next
	err := NextTicket(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if r.CurrentTicketID != "t2" {
		t.Errorf("expected current ticket t2, got %s", r.CurrentTicketID)
	}
	if r.State != model.RoomStateVoting {
		t.Errorf("expected state voting, got %s", r.State)
	}
}

func TestNextTicketNoPending(t *testing.T) {
	r := newTestRoom()
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")
	_ = RevealVotes(r)

	err := NextTicket(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if r.CurrentTicketID != "" {
		t.Errorf("expected empty current ticket, got %s", r.CurrentTicketID)
	}
	if r.State != model.RoomStateIdle {
		t.Errorf("expected state idle, got %s", r.State)
	}
}

func TestSnapshotHidesVotesDuringVoting(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddUser(r, &model.User{ID: "u2", Name: "Bob", AvatarID: "dog"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")
	_ = SubmitVote(r, "u1", "5")
	_ = SubmitVote(r, "u2", "8")

	snap := Snapshot(r)

	if len(snap.Users) != 2 {
		t.Errorf("expected 2 users in snapshot, got %d", len(snap.Users))
	}
	if len(snap.Tickets) != 1 {
		t.Fatalf("expected 1 ticket in snapshot, got %d", len(snap.Tickets))
	}

	ts := snap.Tickets[0]
	if len(ts.Votes) != 2 {
		t.Fatalf("expected 2 votes in snapshot, got %d", len(ts.Votes))
	}

	// During voting, values should be hidden
	for _, v := range ts.Votes {
		if v.Value != "" {
			t.Errorf("expected vote value to be hidden during voting, got %q", v.Value)
		}
	}
}

func TestSnapshotShowsVotesAfterReveal(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")
	_ = SubmitVote(r, "u1", "5")
	_ = RevealVotes(r)

	snap := Snapshot(r)
	ts := snap.Tickets[0]

	for _, v := range ts.Votes {
		if v.Value == "" {
			t.Error("expected vote value to be visible after reveal")
		}
	}
}

func TestSnapshotIsDeepCopy(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})

	snap := Snapshot(r)
	// Modify the snapshot
	snap.Users[0].Name = "Modified"

	// Original should be unchanged
	if r.Users["u1"].Name != "Alice" {
		t.Error("snapshot modification affected original room")
	}
}

func TestTouchUpdatesLastActivity(t *testing.T) {
	r := newTestRoom()
	originalTime := r.LastActivityAt

	time.Sleep(time.Millisecond)
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})

	if !r.LastActivityAt.After(originalTime) {
		t.Error("expected LastActivityAt to be updated")
	}
}

func TestFullVotingFlow(t *testing.T) {
	r := newTestRoom()

	// Add users
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat", IsAdmin: true})
	AddUser(r, &model.User{ID: "u2", Name: "Bob", AvatarID: "dog"})

	// Add tickets
	AddTicket(r, &model.Ticket{ID: "t1", Content: "# Task 1\nDo the thing"})
	AddTicket(r, &model.Ticket{ID: "t2", Content: "# Task 2\nDo another thing"})

	// Start voting on t1
	if err := SetCurrentTicket(r, "t1"); err != nil {
		t.Fatal(err)
	}
	if r.State != model.RoomStateVoting {
		t.Fatalf("expected voting, got %s", r.State)
	}

	// Both users vote
	if err := SubmitVote(r, "u1", "5"); err != nil {
		t.Fatal(err)
	}
	if err := SubmitVote(r, "u2", "8"); err != nil {
		t.Fatal(err)
	}

	// Reveal
	if err := RevealVotes(r); err != nil {
		t.Fatal(err)
	}
	if r.State != model.RoomStateRevealed {
		t.Fatalf("expected revealed, got %s", r.State)
	}

	// Next ticket
	if err := NextTicket(r); err != nil {
		t.Fatal(err)
	}
	if r.CurrentTicketID != "t2" {
		t.Fatalf("expected t2, got %s", r.CurrentTicketID)
	}

	// Vote on t2
	if err := SubmitVote(r, "u1", "3"); err != nil {
		t.Fatal(err)
	}

	// Reset votes
	if err := ResetVotes(r); err != nil {
		t.Fatal(err)
	}
	ticket := findTicket(r, "t2")
	if len(ticket.Votes) != 0 {
		t.Errorf("expected 0 votes after reset, got %d", len(ticket.Votes))
	}

	// Re-vote and reveal
	if err := SubmitVote(r, "u1", "2"); err != nil {
		t.Fatal(err)
	}
	if err := RevealVotes(r); err != nil {
		t.Fatal(err)
	}

	// Next ticket - should go idle
	if err := NextTicket(r); err != nil {
		t.Fatal(err)
	}
	if r.State != model.RoomStateIdle {
		t.Fatalf("expected idle, got %s", r.State)
	}
}

// --- NavigateToTicket tests ---

func TestNavigateToTicketPending(t *testing.T) {
	r := newTestRoom()
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})

	err := NavigateToTicket(r, "t1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.CurrentTicketID != "t1" {
		t.Errorf("expected current ticket t1, got %s", r.CurrentTicketID)
	}
	if r.State != model.RoomStateVoting {
		t.Errorf("expected state voting, got %s", r.State)
	}
	ticket := findTicket(r, "t1")
	if ticket.Status != model.TicketStatusVoting {
		t.Errorf("expected ticket status voting, got %s", ticket.Status)
	}
}

func TestNavigateToTicketRevealed(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")
	_ = SubmitVote(r, "u1", "5")
	_ = RevealVotes(r)

	// Navigate to same ticket that is already revealed
	err := NavigateToTicket(r, "t1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.State != model.RoomStateRevealed {
		t.Errorf("expected state revealed, got %s", r.State)
	}
	ticket := findTicket(r, "t1")
	if ticket.Status != model.TicketStatusRevealed {
		t.Errorf("expected ticket status revealed, got %s", ticket.Status)
	}
	// Votes should still be intact
	if len(ticket.Votes) != 1 {
		t.Errorf("expected 1 vote preserved, got %d", len(ticket.Votes))
	}
	if ticket.Votes["u1"].Value != "5" {
		t.Errorf("expected vote value 5, got %s", ticket.Votes["u1"].Value)
	}
}

func TestNavigateToTicketSkipped(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	AddTicket(r, &model.Ticket{ID: "t2", Content: "Task 2"})
	_ = SetCurrentTicket(r, "t1")
	_ = SubmitVote(r, "u1", "5")
	// Skip t1 by calling NextTicket (t1 is still voting, so it gets skipped)
	_ = NextTicket(r)

	// t1 should now be skipped
	t1 := findTicket(r, "t1")
	if t1.Status != model.TicketStatusSkipped {
		t.Fatalf("expected ticket t1 to be skipped, got %s", t1.Status)
	}

	// Navigate back to skipped ticket
	err := NavigateToTicket(r, "t1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.CurrentTicketID != "t1" {
		t.Errorf("expected current ticket t1, got %s", r.CurrentTicketID)
	}
	if r.State != model.RoomStateVoting {
		t.Errorf("expected state voting, got %s", r.State)
	}
	if t1.Status != model.TicketStatusVoting {
		t.Errorf("expected ticket status voting, got %s", t1.Status)
	}
	// Votes should be cleared for skipped ticket
	if len(t1.Votes) != 0 {
		t.Errorf("expected 0 votes after re-opening skipped ticket, got %d", len(t1.Votes))
	}
}

func TestNavigateToTicketVoting(t *testing.T) {
	r := newTestRoom()
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")

	// Navigate to the same ticket already in voting
	err := NavigateToTicket(r, "t1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.State != model.RoomStateVoting {
		t.Errorf("expected state voting, got %s", r.State)
	}
	ticket := findTicket(r, "t1")
	if ticket.Status != model.TicketStatusVoting {
		t.Errorf("expected ticket status voting, got %s", ticket.Status)
	}
}

func TestNavigateToTicketNotFound(t *testing.T) {
	r := newTestRoom()
	err := NavigateToTicket(r, "nonexistent")
	if err != ErrTicketNotFound {
		t.Errorf("expected ErrTicketNotFound, got %v", err)
	}
}

// --- NextTicketByIndex tests ---

func TestNextTicketByIndex(t *testing.T) {
	r := newTestRoom()
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	AddTicket(r, &model.Ticket{ID: "t2", Content: "Task 2"})
	AddTicket(r, &model.Ticket{ID: "t3", Content: "Task 3"})
	_ = NavigateToTicket(r, "t1")

	// Move to t2
	err := NextTicketByIndex(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.CurrentTicketID != "t2" {
		t.Errorf("expected current ticket t2, got %s", r.CurrentTicketID)
	}

	// Move to t3
	err = NextTicketByIndex(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.CurrentTicketID != "t3" {
		t.Errorf("expected current ticket t3, got %s", r.CurrentTicketID)
	}
}

func TestNextTicketByIndexAtEnd(t *testing.T) {
	r := newTestRoom()
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = NavigateToTicket(r, "t1")

	err := NextTicketByIndex(r)
	if err != ErrTicketNotFound {
		t.Errorf("expected ErrTicketNotFound at end, got %v", err)
	}
	// Current ticket should remain unchanged
	if r.CurrentTicketID != "t1" {
		t.Errorf("expected current ticket to remain t1, got %s", r.CurrentTicketID)
	}
}

func TestNextTicketByIndexEmpty(t *testing.T) {
	r := newTestRoom()
	err := NextTicketByIndex(r)
	if err != ErrTicketNotFound {
		t.Errorf("expected ErrTicketNotFound for empty tickets, got %v", err)
	}
}

// --- PrevTicket tests ---

func TestPrevTicket(t *testing.T) {
	r := newTestRoom()
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	AddTicket(r, &model.Ticket{ID: "t2", Content: "Task 2"})
	AddTicket(r, &model.Ticket{ID: "t3", Content: "Task 3"})
	_ = NavigateToTicket(r, "t3")

	// Move back to t2
	err := PrevTicket(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.CurrentTicketID != "t2" {
		t.Errorf("expected current ticket t2, got %s", r.CurrentTicketID)
	}

	// Move back to t1
	err = PrevTicket(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.CurrentTicketID != "t1" {
		t.Errorf("expected current ticket t1, got %s", r.CurrentTicketID)
	}
}

func TestPrevTicketAtStart(t *testing.T) {
	r := newTestRoom()
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = NavigateToTicket(r, "t1")

	err := PrevTicket(r)
	if err != ErrTicketNotFound {
		t.Errorf("expected ErrTicketNotFound at start, got %v", err)
	}
	// Current ticket should remain unchanged
	if r.CurrentTicketID != "t1" {
		t.Errorf("expected current ticket to remain t1, got %s", r.CurrentTicketID)
	}
}

func TestPrevTicketEmpty(t *testing.T) {
	r := newTestRoom()
	err := PrevTicket(r)
	if err != ErrTicketNotFound {
		t.Errorf("expected ErrTicketNotFound for empty tickets, got %v", err)
	}
}

// --- StartCountdown tests ---

func TestStartCountdown(t *testing.T) {
	r := newTestRoom()
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")

	err := StartCountdown(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.State != model.RoomStateCountingDown {
		t.Errorf("expected state counting_down, got %s", r.State)
	}
}

func TestStartCountdownNotVoting(t *testing.T) {
	r := newTestRoom()
	// Room is idle
	err := StartCountdown(r)
	if err != ErrNotVoting {
		t.Errorf("expected ErrNotVoting, got %v", err)
	}
}

func TestStartCountdownFromRevealed(t *testing.T) {
	r := newTestRoom()
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")
	_ = RevealVotes(r)

	err := StartCountdown(r)
	if err != ErrNotVoting {
		t.Errorf("expected ErrNotVoting from revealed state, got %v", err)
	}
}

// --- RevealVotes from counting_down ---

func TestRevealVotesFromCountingDown(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")
	_ = SubmitVote(r, "u1", "5")
	_ = StartCountdown(r)

	err := RevealVotes(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.State != model.RoomStateRevealed {
		t.Errorf("expected state revealed, got %s", r.State)
	}
	ticket := findTicket(r, "t1")
	if ticket.Status != model.TicketStatusRevealed {
		t.Errorf("expected ticket status revealed, got %s", ticket.Status)
	}
}

// --- SubmitVote during counting_down ---

func TestSubmitVoteDuringCountingDown(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")
	_ = StartCountdown(r)

	// Should be able to submit a last-second vote during countdown
	err := SubmitVote(r, "u1", "8")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	ticket := findTicket(r, "t1")
	if ticket.Votes["u1"].Value != "8" {
		t.Errorf("expected vote value 8, got %s", ticket.Votes["u1"].Value)
	}
}

// --- RemoveVote tests ---

func TestRemoveVote(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")
	_ = SubmitVote(r, "u1", "5")

	err := RemoveVote(r, "u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	ticket := findTicket(r, "t1")
	if _, ok := ticket.Votes["u1"]; ok {
		t.Error("expected vote to be removed")
	}
}

func TestRemoveVoteNoVote(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")

	// Removing without having voted should be a no-op
	err := RemoveVote(r, "u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	ticket := findTicket(r, "t1")
	if len(ticket.Votes) != 0 {
		t.Errorf("expected 0 votes, got %d", len(ticket.Votes))
	}
}

func TestRemoveVoteNotVoting(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")
	_ = SubmitVote(r, "u1", "5")
	_ = RevealVotes(r)

	// State is now revealed — should reject
	err := RemoveVote(r, "u1")
	if err != ErrNotVoting {
		t.Errorf("expected ErrNotVoting, got %v", err)
	}
}

func TestRemoveVoteNotVotingIdle(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})

	// Room is idle
	err := RemoveVote(r, "u1")
	if err != ErrNotVoting {
		t.Errorf("expected ErrNotVoting, got %v", err)
	}
}

func TestRemoveVoteUnknownUser(t *testing.T) {
	r := newTestRoom()
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")

	err := RemoveVote(r, "nonexistent")
	if err != ErrUserNotFound {
		t.Errorf("expected ErrUserNotFound, got %v", err)
	}
}

func TestRemoveVoteDuringCountingDown(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")
	_ = SubmitVote(r, "u1", "5")
	_ = StartCountdown(r)

	// Should be able to remove vote during countdown
	err := RemoveVote(r, "u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	ticket := findTicket(r, "t1")
	if _, ok := ticket.Votes["u1"]; ok {
		t.Error("expected vote to be removed during countdown")
	}
}

func TestSubmitVoteChangeVoteDuringCountingDown(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")
	_ = SubmitVote(r, "u1", "5")
	_ = StartCountdown(r)

	// Change vote during countdown
	err := SubmitVote(r, "u1", "13")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	ticket := findTicket(r, "t1")
	if ticket.Votes["u1"].Value != "13" {
		t.Errorf("expected vote value 13, got %s", ticket.Votes["u1"].Value)
	}
}

// --- ResetVotes from counting_down ---

func TestResetVotesFromCountingDown(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat"})
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	_ = SetCurrentTicket(r, "t1")
	_ = SubmitVote(r, "u1", "5")
	_ = StartCountdown(r)

	err := ResetVotes(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.State != model.RoomStateVoting {
		t.Errorf("expected state voting after reset, got %s", r.State)
	}
	ticket := findTicket(r, "t1")
	if len(ticket.Votes) != 0 {
		t.Errorf("expected 0 votes after reset, got %d", len(ticket.Votes))
	}
}

// --- Full navigation flow ---

func TestFullNavigationFlow(t *testing.T) {
	r := newTestRoom()
	AddUser(r, &model.User{ID: "u1", Name: "Alice", AvatarID: "cat", IsAdmin: true})
	AddUser(r, &model.User{ID: "u2", Name: "Bob", AvatarID: "dog"})

	// Add 3 tickets
	AddTicket(r, &model.Ticket{ID: "t1", Content: "Task 1"})
	AddTicket(r, &model.Ticket{ID: "t2", Content: "Task 2"})
	AddTicket(r, &model.Ticket{ID: "t3", Content: "Task 3"})

	// Navigate to t1 and vote
	if err := NavigateToTicket(r, "t1"); err != nil {
		t.Fatal(err)
	}
	if err := SubmitVote(r, "u1", "3"); err != nil {
		t.Fatal(err)
	}
	if err := SubmitVote(r, "u2", "5"); err != nil {
		t.Fatal(err)
	}
	if err := RevealVotes(r); err != nil {
		t.Fatal(err)
	}

	// Go forward to t2
	if err := NextTicketByIndex(r); err != nil {
		t.Fatal(err)
	}
	if r.CurrentTicketID != "t2" {
		t.Fatalf("expected t2, got %s", r.CurrentTicketID)
	}
	// t2 should be in voting
	if r.State != model.RoomStateVoting {
		t.Fatalf("expected voting, got %s", r.State)
	}

	// Vote on t2
	if err := SubmitVote(r, "u1", "8"); err != nil {
		t.Fatal(err)
	}
	if err := RevealVotes(r); err != nil {
		t.Fatal(err)
	}

	// Go back to t1
	if err := PrevTicket(r); err != nil {
		t.Fatal(err)
	}
	if r.CurrentTicketID != "t1" {
		t.Fatalf("expected t1, got %s", r.CurrentTicketID)
	}
	// t1 was revealed, so state should be revealed with votes preserved
	if r.State != model.RoomStateRevealed {
		t.Errorf("expected revealed when going back to revealed ticket, got %s", r.State)
	}
	t1 := findTicket(r, "t1")
	if len(t1.Votes) != 2 {
		t.Errorf("expected 2 votes preserved on t1, got %d", len(t1.Votes))
	}
	if t1.Votes["u1"].Value != "3" {
		t.Errorf("expected u1 vote 3 on t1, got %s", t1.Votes["u1"].Value)
	}

	// Go forward to t2 again
	if err := NextTicketByIndex(r); err != nil {
		t.Fatal(err)
	}
	if r.CurrentTicketID != "t2" {
		t.Fatalf("expected t2, got %s", r.CurrentTicketID)
	}
	// t2 was revealed, so state should be revealed
	if r.State != model.RoomStateRevealed {
		t.Errorf("expected revealed, got %s", r.State)
	}

	// Go forward to t3
	if err := NextTicketByIndex(r); err != nil {
		t.Fatal(err)
	}
	if r.CurrentTicketID != "t3" {
		t.Fatalf("expected t3, got %s", r.CurrentTicketID)
	}
	// t3 was pending, so it should now be voting
	if r.State != model.RoomStateVoting {
		t.Errorf("expected voting for pending ticket, got %s", r.State)
	}

	// Cannot go forward past the end
	err := NextTicketByIndex(r)
	if err != ErrTicketNotFound {
		t.Errorf("expected ErrTicketNotFound at end, got %v", err)
	}

	// Go all the way back to t1
	if err := PrevTicket(r); err != nil {
		t.Fatal(err)
	}
	if r.CurrentTicketID != "t2" {
		t.Fatalf("expected t2, got %s", r.CurrentTicketID)
	}
	if err := PrevTicket(r); err != nil {
		t.Fatal(err)
	}
	if r.CurrentTicketID != "t1" {
		t.Fatalf("expected t1, got %s", r.CurrentTicketID)
	}

	// Cannot go back past the start
	err = PrevTicket(r)
	if err != ErrTicketNotFound {
		t.Errorf("expected ErrTicketNotFound at start, got %v", err)
	}
}
