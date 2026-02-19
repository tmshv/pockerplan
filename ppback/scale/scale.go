package scale

import "fmt"

type EstimationScale struct {
	ID     string   `json:"id"`
	Name   string   `json:"name"`
	Values []string `json:"values"`
}

var scales = map[string]EstimationScale{
	"fibonacci": {
		ID:     "fibonacci",
		Name:   "Fibonacci",
		Values: []string{"0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?"},
	},
	"power_of_2": {
		ID:     "power_of_2",
		Name:   "Power of 2",
		Values: []string{"1", "2", "4", "8", "16", "32", "64", "?"},
	},
	"linear": {
		ID:     "linear",
		Name:   "Linear",
		Values: []string{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "?"},
	},
	"tshirt": {
		ID:     "tshirt",
		Name:   "T-shirt",
		Values: []string{"XS", "S", "M", "L", "XL", "XXL", "?"},
	},
}

// Get returns the estimation scale with the given ID.
func Get(id string) (EstimationScale, error) {
	s, ok := scales[id]
	if !ok {
		return EstimationScale{}, fmt.Errorf("unknown scale: %s", id)
	}
	return s, nil
}

// All returns all available estimation scales.
func All() []EstimationScale {
	result := make([]EstimationScale, 0, len(scales))
	for _, s := range scales {
		result = append(result, s)
	}
	return result
}

// ValidValue checks whether a value is valid for the given scale.
func ValidValue(scaleID, value string) bool {
	s, err := Get(scaleID)
	if err != nil {
		return false
	}
	for _, v := range s.Values {
		if v == value {
			return true
		}
	}
	return false
}

// IDs returns all available scale IDs.
func IDs() []string {
	ids := make([]string, 0, len(scales))
	for id := range scales {
		ids = append(ids, id)
	}
	return ids
}
