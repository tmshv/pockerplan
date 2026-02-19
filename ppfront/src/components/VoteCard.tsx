interface VoteCardProps {
  value: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}

export function VoteCard({
  value,
  selected,
  disabled,
  onClick,
}: VoteCardProps) {
  return (
    <button
      type="button"
      className={`vote-card${selected ? " selected" : ""}`}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
    >
      {value}
    </button>
  );
}
