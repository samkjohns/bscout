import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

type ResponseData =
  | { error: string }
  | { id: string; email: string; name: string | null };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email and password are required." });
  }

  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    return res.status(409).json({ error: "Email is already registered." });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: name?.trim() || null,
      email,
      passwordHash
    }
  });

  return res.status(200).json({
    id: user.id,
    email: user.email,
    name: user.name
  });
}
