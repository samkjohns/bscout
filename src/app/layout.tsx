import type { ReactNode } from "react";

import Providers from "@/app/providers";
import "@/app/globals.css";

export default async function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
