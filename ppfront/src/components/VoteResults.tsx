import type { VoteInfo, User } from "../types";

interface VoteResultsProps {
  votes: VoteInfo[];
  users: User[];
}

export function VoteResults({ votes, users }: VoteResultsProps) {
  const userMap = new Map(users.map((u) => [u.id, u]));

  const valueCounts = new Map<string, number>();
  for (const vote of votes) {
    if (vote.value && vote.value !== "?") {
      valueCounts.set(vote.value, (valueCounts.get(vote.value) ?? 0) + 1);
    }
  }

  const numericVotes = votes
    .filter((v) => v.value && v.value !== "?")
    .map((v) => parseFloat(v.value!))
    .filter((n) => !isNaN(n));

  const average =
    numericVotes.length > 0
      ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(1)
      : null;

  return (
    <div className="vote-results">
      <h3>Results</h3>
      {average && <p className="vote-average">Average: {average}</p>}
      <div className="vote-distribution">
        {Array.from(valueCounts.entries())
          .sort(([a], [b]) => {
            const na = parseFloat(a);
            const nb = parseFloat(b);
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
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
      <ul className="vote-detail-list">
        {votes.map((vote) => {
          const user = userMap.get(vote.userId);
          return (
            <li key={vote.userId}>
              {user?.name ?? vote.userId}: {vote.value ?? "—"}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
