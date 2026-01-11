import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ResponseData =
  | { error: string }
  | {
      id: string;
      body: string;
      createdAt: Date;
      user: { name: string | null; email: string };
    };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!idParam) {
    return res.status(400).json({ error: "Business id is required." });
  }

  const { text } = req.body as { text?: string };

  if (!text?.trim()) {
    return res.status(400).json({ error: "Comment text is required." });
  }

  const business = await prisma.business.findUnique({
    where: { id: idParam },
    select: { id: true }
  });

  if (!business) {
    return res.status(404).json({ error: "Business not found." });
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

  return res.status(200).json({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    user: comment.user
  });
}
