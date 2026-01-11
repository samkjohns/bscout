"use client";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type CommentFormProps = {
  businessId: string;
  onPosted?: () => void;
};

export default function CommentForm({ businessId, onPosted }: CommentFormProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch(`/api/businesses/${businessId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Could not post comment.");
      }

      setText("");
      onPosted?.();
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="grid" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="comment-text">Comment</label>
        <textarea
          id="comment-text"
          rows={4}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Share what you love about this business"
          required
        />
      </div>
      <button type="submit" disabled={saving}>
        {saving ? "Posting..." : "Post comment"}
      </button>
      {error ? <p>{error}</p> : null}
    </form>
  );
}
