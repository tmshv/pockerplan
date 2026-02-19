import { useEffect, useRef, useState } from "react";

interface RoomNameEditorProps {
  name: string;
  isAdmin: boolean;
  onSave: (name: string) => void;
}

export function RoomNameEditor({ name, isAdmin, onSave }: RoomNameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setValue(name);
    }
  }, [name, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = value.trim();
    setEditing(false);
    if (trimmed !== name) {
      onSave(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setValue(name);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="room-name-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder="Unnamed Room"
        maxLength={100}
      />
    );
  }

  const displayName = name || "Unnamed Room";

  if (isAdmin) {
    return (
      <button
        type="button"
        className="room-name-display room-name-editable"
        onClick={() => setEditing(true)}
        title="Click to edit room name"
      >
        {displayName}
      </button>
    );
  }

  return <span className="room-name-display">{displayName}</span>;
}
