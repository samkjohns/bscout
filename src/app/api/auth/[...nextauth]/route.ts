import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const handler = NextAuth(authOptions);
  return handler(request);
}

export async function POST(request: Request) {
  const handler = NextAuth(authOptions);
  return handler(request);
}
