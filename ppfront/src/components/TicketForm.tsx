import { useState } from "react";
import { MarkdownEditor } from "./MarkdownEditor";

interface TicketFormProps {
  onAdd: (content: string) => Promise<unknown>;
}

const MAX_CONTENT_LENGTH = 10000;

export function TicketForm({ onAdd }: TicketFormProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const trimmedLength = content.trim().length;
  const overLimit = trimmedLength > MAX_CONTENT_LENGTH;
  const canSubmit = trimmedLength > 0 && !overLimit && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      await onAdd(content.trim());
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="ticket-form" onSubmit={handleSubmit}>
      <h3>Add Ticket</h3>
      <MarkdownEditor
        value={content}
        onChange={setContent}
        placeholder="Ticket content (markdown)"
      />
      {error && <p className="error">{error}</p>}
      {overLimit && (
        <p className="error">
          Content exceeds {MAX_CONTENT_LENGTH.toLocaleString()} character limit
          ({trimmedLength.toLocaleString()}/{" "}
          {MAX_CONTENT_LENGTH.toLocaleString()})
        </p>
      )}
      <button type="submit" disabled={!canSubmit}>
        {submitting ? "Adding..." : "Add Ticket"}
      </button>
    </form>
  );
}
