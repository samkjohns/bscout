import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0)
    )
  );
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");

  const businesses = await prisma.business.findMany({
    where: {
      ownerId: session.user.id,
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
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json({
    businesses: businesses.map((business) => ({
      id: business.id,
      name: business.name,
      description: business.description,
      website: business.website,
      tags: business.tags.map((link) => link.tag.name)
    }))
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, website, tags } = body as {
    name?: string;
    description?: string;
    website?: string;
    tags?: string[];
  };

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Business name is required." },
      { status: 400 }
    );
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

    return NextResponse.json({
      id: created.id,
      name: created.name
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "You already added a business with this name." },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Could not save business." },
      { status: 500 }
    );
  }
}
