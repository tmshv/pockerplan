package avatar

type Avatar struct {
	ID    string `json:"id"`
	Emoji string `json:"emoji"`
	Label string `json:"label"`
}

var avatars = []Avatar{
	{ID: "bear", Emoji: "\U0001F43B", Label: "Bear"},
	{ID: "cat", Emoji: "\U0001F431", Label: "Cat"},
	{ID: "dog", Emoji: "\U0001F436", Label: "Dog"},
	{ID: "fox", Emoji: "\U0001F98A", Label: "Fox"},
	{ID: "koala", Emoji: "\U0001F428", Label: "Koala"},
	{ID: "lion", Emoji: "\U0001F981", Label: "Lion"},
	{ID: "monkey", Emoji: "\U0001F435", Label: "Monkey"},
	{ID: "owl", Emoji: "\U0001F989", Label: "Owl"},
	{ID: "panda", Emoji: "\U0001F43C", Label: "Panda"},
	{ID: "penguin", Emoji: "\U0001F427", Label: "Penguin"},
	{ID: "rabbit", Emoji: "\U0001F430", Label: "Rabbit"},
	{ID: "tiger", Emoji: "\U0001F42F", Label: "Tiger"},
	{ID: "unicorn", Emoji: "\U0001F984", Label: "Unicorn"},
	{ID: "whale", Emoji: "\U0001F433", Label: "Whale"},
	{ID: "wolf", Emoji: "\U0001F43A", Label: "Wolf"},
	{ID: "octopus", Emoji: "\U0001F419", Label: "Octopus"},
}

var avatarByID map[string]Avatar

func init() {
	avatarByID = make(map[string]Avatar, len(avatars))
	for _, a := range avatars {
		avatarByID[a.ID] = a
	}
}

// All returns all available avatars.
func All() []Avatar {
	result := make([]Avatar, len(avatars))
	copy(result, avatars)
	return result
}

// Get returns the avatar with the given ID.
func Get(id string) (Avatar, bool) {
	a, ok := avatarByID[id]
	return a, ok
}

// Valid checks whether the given avatar ID is valid.
func Valid(id string) bool {
	_, ok := avatarByID[id]
	return ok
}
