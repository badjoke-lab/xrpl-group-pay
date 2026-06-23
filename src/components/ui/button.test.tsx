import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders an accessible button with the requested label", () => {
    render(<Button>Create a bill</Button>);

    expect(screen.getByRole("button", { name: "Create a bill" })).toBeEnabled();
  });

  it("preserves the disabled state", () => {
    render(<Button disabled>Pay 4 XRP</Button>);

    expect(screen.getByRole("button", { name: "Pay 4 XRP" })).toBeDisabled();
  });
});
