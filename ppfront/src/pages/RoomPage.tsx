import { useParams } from "react-router-dom";

export function RoomPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="page room-page">
      <h1>Room {id}</h1>
      <p>Room view coming soon...</p>
    </div>
  );
}
