import { avatars } from "../data/avatars";
import type { User, VoteInfo } from "../types";

interface UserListProps {
  users: User[];
  votes: VoteInfo[];
  revealed: boolean;
}

function getEmoji(avatarId: string): string {
  return avatars.find((a) => a.id === avatarId)?.emoji ?? "";
}

export function UserList({ users, votes, revealed }: UserListProps) {
  const voteMap = new Map(votes.map((v) => [v.userId, v]));

  return (
    <div className="user-list">
      <h3>Players</h3>
      <ul>
        {users.map((user) => {
          const vote = voteMap.get(user.id);
          const hasVoted = !!vote;
          return (
            <li key={user.id} className={`user-item${user.connected ? "" : " disconnected"}`}>
              <span className="user-avatar">{getEmoji(user.avatarId)}</span>
              <span className="user-name">{user.name}</span>
              {user.isAdmin && <span className="user-badge">Admin</span>}
              <span className="user-vote-status">
                {hasVoted ? (revealed && vote.value ? vote.value : "Voted") : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
