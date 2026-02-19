interface NameInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function NameInput({ value, onChange }: NameInputProps) {
  return (
    <div className="name-input">
      <label htmlFor="name-input">Your Name</label>
      <input
        id="name-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your name"
        maxLength={30}
        autoComplete="off"
      />
    </div>
  );
}
