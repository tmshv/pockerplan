package avatar

import "testing"

func TestAll(t *testing.T) {
	all := All()
	if len(all) != 16 {
		t.Errorf("All() returned %d avatars, want 16", len(all))
	}
}

func TestAllReturnsCopy(t *testing.T) {
	a1 := All()
	a2 := All()
	a1[0].ID = "modified"
	if a2[0].ID == "modified" {
		t.Error("All() should return a copy, not a reference to the original")
	}
}

func TestValid(t *testing.T) {
	tests := []struct {
		id   string
		want bool
	}{
		{"bear", true},
		{"cat", true},
		{"dog", true},
		{"fox", true},
		{"koala", true},
		{"lion", true},
		{"monkey", true},
		{"owl", true},
		{"panda", true},
		{"penguin", true},
		{"rabbit", true},
		{"tiger", true},
		{"unicorn", true},
		{"whale", true},
		{"wolf", true},
		{"octopus", true},
		{"dragon", false},
		{"", false},
		{"Bear", false},
	}

	for _, tt := range tests {
		t.Run(tt.id, func(t *testing.T) {
			got := Valid(tt.id)
			if got != tt.want {
				t.Errorf("Valid(%q) = %v, want %v", tt.id, got, tt.want)
			}
		})
	}
}

func TestGet(t *testing.T) {
	a, ok := Get("fox")
	if !ok {
		t.Fatal("Get(fox) returned not ok")
	}
	if a.ID != "fox" {
		t.Errorf("Get(fox).ID = %q, want fox", a.ID)
	}
	if a.Label != "Fox" {
		t.Errorf("Get(fox).Label = %q, want Fox", a.Label)
	}
	if a.Emoji == "" {
		t.Error("Get(fox).Emoji is empty")
	}

	_, ok = Get("nonexistent")
	if ok {
		t.Error("Get(nonexistent) should return not ok")
	}
}

func TestUniqueIDs(t *testing.T) {
	all := All()
	seen := make(map[string]bool)
	for _, a := range all {
		if seen[a.ID] {
			t.Errorf("duplicate avatar ID: %q", a.ID)
		}
		seen[a.ID] = true
	}
}

func TestAllHaveEmoji(t *testing.T) {
	for _, a := range All() {
		if a.Emoji == "" {
			t.Errorf("avatar %q has empty emoji", a.ID)
		}
	}
}
