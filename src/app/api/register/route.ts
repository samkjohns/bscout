import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, password } = body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    return NextResponse.json(
      { error: "Email is already registered." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: name?.trim() || null,
      email,
      passwordHash
    }
  });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name
  });
}
