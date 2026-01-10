import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeTags } from "@/lib/tagging";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const business = await prisma.business.findFirst({
    where: {
      id: params.id,
      ownerId: session.user.id
    }
  });

  if (!business) {
    return NextResponse.json(
      { error: "Business not found." },
      { status: 404 }
    );
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

    return NextResponse.json({ ok: true });
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
      { error: "Could not update business." },
      { status: 500 }
    );
  }
}
