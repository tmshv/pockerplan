import { VoteCard } from "./VoteCard";
import { scales } from "../data/scales";

interface VotingPanelProps {
  scaleId: string;
  selectedValue: string | null;
  disabled: boolean;
  onVote: (value: string) => void;
}

export function VotingPanel({ scaleId, selectedValue, disabled, onVote }: VotingPanelProps) {
  const scale = scales.find((s) => s.id === scaleId);
  const values = scale?.values ?? [];

  return (
    <div className="voting-panel">
      <h3>Your Vote</h3>
      <div className="vote-cards" role="group" aria-label="Vote cards">
        {values.map((v) => (
          <VoteCard
            key={v}
            value={v}
            selected={selectedValue === v}
            disabled={disabled}
            onClick={() => onVote(v)}
          />
        ))}
      </div>
    </div>
  );
}
