import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { text } = body as { text?: string };

  if (!text?.trim()) {
    return NextResponse.json(
      { error: "Comment text is required." },
      { status: 400 }
    );
  }

  const business = await prisma.business.findUnique({
    where: { id: params.id },
    select: { id: true }
  });

  if (!business) {
    return NextResponse.json(
      { error: "Business not found." },
      { status: 404 }
    );
  }

  const comment = await prisma.comment.create({
    data: {
      body: text.trim(),
      businessId: business.id,
      userId: session.user.id
    },
    include: {
      user: {
        select: { name: true, email: true }
      }
    }
  });

  return NextResponse.json({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    user: comment.user
  });
}
