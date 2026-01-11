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
};

type ResponseData =
  | { error: string }
  | { id: string; name: string }
  | { businesses: BusinessResponse[] };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    const tagParam = Array.isArray(req.query.tag)
      ? req.query.tag[0]
      : req.query.tag;

    const tag = tagParam?.trim().toLowerCase();

    const businesses = await prisma.business.findMany({
      where: {
        ownerId: session.user.id,
        ...(tag
          ? {
              tags: {
                some: {
                  tag: {
                    name: tag
                  }
                }
              }
            }
          : {})
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.status(200).json({
      businesses: businesses.map((business) => ({
        id: business.id,
        ownerId: business.ownerId,
        name: business.name,
        description: business.description,
        website: business.website,
        tags: business.tags.map((link) => link.tag.name)
      }))
    });
  }

  if (req.method === "POST") {
    const { name, description, website, tags } = req.body as {
      name?: string;
      description?: string;
      website?: string;
      tags?: string[];
    };

    if (!name?.trim()) {
      return res.status(400).json({ error: "Business name is required." });
    }

    const tagList = normalizeTags(Array.isArray(tags) ? tags : []);

    try {
      const created = await prisma.$transaction(async (tx) => {
        const business = await tx.business.create({
          data: {
            name: name.trim(),
            description: description?.trim() || null,
            website: website?.trim() || null,
            ownerId: session.user.id
          }
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

        return business;
      });

      return res.status(200).json({
        id: created.id,
        name: created.name
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return res
            .status(409)
            .json({ error: "You already added a business with this name." });
        }
      }

      return res.status(500).json({ error: "Could not save business." });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed." });
}
