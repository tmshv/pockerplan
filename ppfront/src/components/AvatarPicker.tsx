import { avatars } from "../data/avatars";

interface AvatarPickerProps {
  selected: string;
  onSelect: (avatarId: string) => void;
}

export function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <div className="avatar-picker">
      <label>Pick an Avatar</label>
      <div className="avatar-grid" role="radiogroup" aria-label="Pick an avatar">
        {avatars.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            role="radio"
            aria-checked={selected === avatar.id}
            aria-label={avatar.label}
            className={`avatar-option${selected === avatar.id ? " selected" : ""}`}
            onClick={() => onSelect(avatar.id)}
          >
            <span className="avatar-emoji">{avatar.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
