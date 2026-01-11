import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeTags } from "@/lib/tagging";

type BusinessResponse = {
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
    createdAt: Date;
    user: { name: string | null; email: string };
  }[];
};

type ResponseData = { error: string } | { ok: true } | BusinessResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!idParam) {
    return res.status(400).json({ error: "Business id is required." });
  }

  if (req.method === "GET") {
    const business = await prisma.business.findUnique({
      where: { id: idParam },
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
      return res.status(404).json({ error: "Business not found." });
    }

    return res.status(200).json({
      id: business.id,
      ownerId: business.ownerId,
      name: business.name,
      description: business.description,
      website: business.website,
      tags: business.tags.map((link) => link.tag.name),
      owner: business.owner,
      comments: business.comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        user: comment.user
      }))
    });
  }

  if (req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { name, description, website, tags } = req.body as {
    name?: string;
    description?: string;
    website?: string;
    tags?: string[];
  };

  if (!name?.trim()) {
    return res.status(400).json({ error: "Business name is required." });
  }

  const business = await prisma.business.findFirst({
    where: {
      id: idParam,
      ownerId: session.user.id
    }
  });

  if (!business) {
    return res.status(404).json({ error: "Business not found." });
  }

  const tagList = normalizeTags(Array.isArray(tags) ? tags : []);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: business.id },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          website: website?.trim() || null
        }
      });

      await tx.businessTag.deleteMany({
        where: { businessId: business.id }
      });

      for (const tagName of tagList) {
        const tagRecord = await tx.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName }
        });

        await tx.businessTag.create({
          data: {
            businessId: business.id,
            tagId: tagRecord.id
          }
        });
      }
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ error: "You already added a business with this name." });
      }
    }

    return res.status(500).json({ error: "Could not update business." });
  }
}
