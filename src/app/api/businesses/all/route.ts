import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");

  const businesses = await prisma.business.findMany({
    where: {
      ...(tag
        ? {
            tags: {
              some: {
                tag: {
                  name: tag.trim().toLowerCase()
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

  return NextResponse.json({
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
