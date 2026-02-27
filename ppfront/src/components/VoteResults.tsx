import type { VoteInfo } from "../types";

interface VoteResultsProps {
  votes: VoteInfo[];
}

export function VoteResults({ votes }: VoteResultsProps) {
  const valueCounts = new Map<string, number>();
  for (const vote of votes) {
    if (vote.value && vote.value !== "?") {
      valueCounts.set(vote.value, (valueCounts.get(vote.value) ?? 0) + 1);
    }
  }

  const numericVotes = votes
    .filter((v) => v.value && v.value !== "?")
    .map((v) => Number.parseFloat(v.value!))
    .filter((n) => !Number.isNaN(n));

  const average =
    numericVotes.length > 0
      ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(
          1,
        )
      : null;

  return (
    <div className="vote-results">
      <h3>Results</h3>
      {average && <p className="vote-average">Average: {average}</p>}
      <div className="vote-distribution">
        {Array.from(valueCounts.entries())
          .sort(([a], [b]) => {
            const na = Number.parseFloat(a);
            const nb = Number.parseFloat(b);
            if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
            return a.localeCompare(b);
          })
          .map(([value, count]) => (
            <div key={value} className="vote-bar">
              <span className="vote-bar-value">{value}</span>
              <span className="vote-bar-count">
                {"x".repeat(count)} ({count})
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
