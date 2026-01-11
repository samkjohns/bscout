"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import CommentForm from "@/components/CommentForm";

type Business = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  website: string | null;
  tags: string[];
  owner: { name: string | null; email: string };
  comments: {
    id: string;
    body: string;
    createdAt: string;
    user: { name: string | null; email: string };
  }[];
};

type BusinessPageProps = {
  params: { id: string };
};

export default function BusinessPage({ params }: BusinessPageProps) {
  const router = useRouter();
  const { status } = useSession();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusiness = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/businesses/${params.id}`);

    if (response.status === 401) {
      router.push("/auth/signin");
      return;
    }

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Could not load business.");
      setLoading(false);
      return;
    }

    const data = (await response.json()) as Business;
    setBusiness(data);
    setLoading(false);
  }, [params.id, router]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    fetchBusiness();
  }, [status, router, fetchBusiness]);

  if (loading || status === "loading") {
    return (
      <main>
        <p>Loading business...</p>
      </main>
    );
  }

  if (error || !business) {
    return (
      <main>
        <div className="card">
          <h2>Business unavailable</h2>
          <p>{error ?? "We could not find this business."}</p>
          <Link href="/">Back to dashboard</Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="header">
        <div>
          <h1>{business.name}</h1>
          <p>
            Added by {business.owner.name || business.owner.email}
            {business.website ? (
              <>
                {" "}
                ·{" "}
                <a href={business.website} target="_blank" rel="noreferrer">
                  {business.website}
                </a>
              </>
            ) : null}
          </p>
        </div>
        <Link href="/">Back to dashboard</Link>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>About</h2>
          {business.description ? (
            <p>{business.description}</p>
          ) : (
            <p>No description yet.</p>
          )}
          <div className="tags">
            {business.tags.length ? (
              business.tags.map((tag) => (
                <span key={tag} className="badge">
                  {tag}
                </span>
              ))
            ) : (
              <span className="badge">No tags yet</span>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Leave a comment</h2>
          <CommentForm businessId={business.id} onPosted={fetchBusiness} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Comments</h2>
        {business.comments.length === 0 ? (
          <p>Be the first to leave a note.</p>
        ) : (
          <div className="list">
            {business.comments.map((comment) => (
              <div key={comment.id} className="business">
                <p>{comment.body}</p>
                <p>
                  {comment.user.name || comment.user.email} ·{" "}
                  {new Date(comment.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
