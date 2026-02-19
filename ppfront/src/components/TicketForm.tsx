import { useState } from "react";

interface TicketFormProps {
  onAdd: (title: string, description: string) => Promise<void>;
}

export function TicketForm({ onAdd }: TicketFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = title.trim() !== "" && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      await onAdd(title.trim(), description.trim());
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="ticket-form" onSubmit={handleSubmit}>
      <h3>Add Ticket</h3>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ticket title"
        aria-label="Ticket title"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (markdown)"
        aria-label="Ticket description"
        rows={3}
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={!canSubmit}>
        {submitting ? "Adding..." : "Add Ticket"}
      </button>
    </form>
  );
}
