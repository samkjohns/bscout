import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type BusinessResponse = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  website: string | null;
  tags: string[];
  owner: { name: string | null; email: string };
};

type ResponseData = { error: string } | { businesses: BusinessResponse[] };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const tagParam = Array.isArray(req.query.tag) ? req.query.tag[0] : req.query.tag;
  const tag = tagParam?.trim().toLowerCase();

  const businesses = await prisma.business.findMany({
    where: {
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
      },
      owner: {
        select: {
          name: true,
          email: true
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
      tags: business.tags.map((link) => link.tag.name),
      owner: business.owner
    }))
  });
}
