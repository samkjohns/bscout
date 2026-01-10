import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SignInPage from "@/app/auth/signin/page";

describe("SignInPage", () => {
  it("renders copy and a link back home", () => {
    render(<SignInPage />);

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(
      screen.getByText(/sign in on the homepage/i)
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /go to bscout/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});
