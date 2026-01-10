import React from "react";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main>
      <div className="card">
        <h2>Sign in</h2>
        <p>Sign in on the homepage to access your business list.</p>
        <Link href="/">Go to Bscout</Link>
      </div>
    </main>
  );
}
