import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CommentForm from "@/components/CommentForm";

export const dynamic = "force-dynamic";

export default async function BusinessPage({
  params
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const business = await prisma.business.findUnique({
    where: { id: params.id },
    include: {
      owner: {
        select: { name: true, email: true }
      },
      tags: {
        include: { tag: true }
      },
      comments: {
        include: {
          user: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!business) {
    notFound();
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
              business.tags.map((link) => (
                <span key={link.tag.id} className="badge">
                  {link.tag.name}
                </span>
              ))
            ) : (
              <span className="badge">No tags yet</span>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Leave a comment</h2>
          <CommentForm businessId={business.id} />
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
