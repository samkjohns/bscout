import type { ReactNode } from "react";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import Providers from "@/app/providers";
import "@/app/globals.css";

export default async function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
