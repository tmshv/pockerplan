package scale

import "testing"

func TestGet(t *testing.T) {
	tests := []struct {
		id      string
		wantErr bool
		name    string
	}{
		{id: "fibonacci", wantErr: false, name: "Fibonacci"},
		{id: "power_of_2", wantErr: false, name: "Power of 2"},
		{id: "linear", wantErr: false, name: "Linear"},
		{id: "tshirt", wantErr: false, name: "T-shirt"},
		{id: "unknown", wantErr: true},
		{id: "", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.id, func(t *testing.T) {
			s, err := Get(tt.id)
			if tt.wantErr {
				if err == nil {
					t.Errorf("Get(%q) expected error, got nil", tt.id)
				}
				return
			}
			if err != nil {
				t.Fatalf("Get(%q) unexpected error: %v", tt.id, err)
			}
			if s.ID != tt.id {
				t.Errorf("Get(%q).ID = %q, want %q", tt.id, s.ID, tt.id)
			}
			if s.Name != tt.name {
				t.Errorf("Get(%q).Name = %q, want %q", tt.id, s.Name, tt.name)
			}
			if len(s.Values) == 0 {
				t.Errorf("Get(%q).Values is empty", tt.id)
			}
		})
	}
}

func TestFibonacciValues(t *testing.T) {
	s, err := Get("fibonacci")
	if err != nil {
		t.Fatal(err)
	}
	expected := []string{"0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?"}
	if len(s.Values) != len(expected) {
		t.Fatalf("fibonacci has %d values, want %d", len(s.Values), len(expected))
	}
	for i, v := range expected {
		if s.Values[i] != v {
			t.Errorf("fibonacci[%d] = %q, want %q", i, s.Values[i], v)
		}
	}
}

func TestPowerOf2Values(t *testing.T) {
	s, err := Get("power_of_2")
	if err != nil {
		t.Fatal(err)
	}
	expected := []string{"1", "2", "4", "8", "16", "32", "64", "?"}
	if len(s.Values) != len(expected) {
		t.Fatalf("power_of_2 has %d values, want %d", len(s.Values), len(expected))
	}
	for i, v := range expected {
		if s.Values[i] != v {
			t.Errorf("power_of_2[%d] = %q, want %q", i, s.Values[i], v)
		}
	}
}

func TestTshirtValues(t *testing.T) {
	s, err := Get("tshirt")
	if err != nil {
		t.Fatal(err)
	}
	expected := []string{"XS", "S", "M", "L", "XL", "XXL", "?"}
	if len(s.Values) != len(expected) {
		t.Fatalf("tshirt has %d values, want %d", len(s.Values), len(expected))
	}
	for i, v := range expected {
		if s.Values[i] != v {
			t.Errorf("tshirt[%d] = %q, want %q", i, s.Values[i], v)
		}
	}
}

func TestValidValue(t *testing.T) {
	tests := []struct {
		scaleID string
		value   string
		want    bool
	}{
		{"fibonacci", "5", true},
		{"fibonacci", "?", true},
		{"fibonacci", "4", false},
		{"fibonacci", "", false},
		{"power_of_2", "16", true},
		{"power_of_2", "3", false},
		{"linear", "10", true},
		{"linear", "0", false},
		{"tshirt", "XL", true},
		{"tshirt", "XXXL", false},
		{"unknown", "1", false},
	}

	for _, tt := range tests {
		t.Run(tt.scaleID+"_"+tt.value, func(t *testing.T) {
			got := ValidValue(tt.scaleID, tt.value)
			if got != tt.want {
				t.Errorf("ValidValue(%q, %q) = %v, want %v", tt.scaleID, tt.value, got, tt.want)
			}
		})
	}
}

func TestAll(t *testing.T) {
	all := All()
	if len(all) != 4 {
		t.Errorf("All() returned %d scales, want 4", len(all))
	}
}

func TestIDs(t *testing.T) {
	ids := IDs()
	if len(ids) != 4 {
		t.Errorf("IDs() returned %d ids, want 4", len(ids))
	}
	idSet := make(map[string]bool)
	for _, id := range ids {
		idSet[id] = true
	}
	for _, expected := range []string{"fibonacci", "power_of_2", "linear", "tshirt"} {
		if !idSet[expected] {
			t.Errorf("IDs() missing %q", expected)
		}
	}
}

func TestAllScalesHaveQuestionMark(t *testing.T) {
	for _, s := range All() {
		lastValue := s.Values[len(s.Values)-1]
		if lastValue != "?" {
			t.Errorf("scale %q last value is %q, want '?'", s.ID, lastValue)
		}
	}
}
