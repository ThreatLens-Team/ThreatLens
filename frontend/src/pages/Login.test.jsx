
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Login from "./Login";
import * as authService from "../services/auth";


vi.mock("../services/auth", () => ({
  login: vi.fn(),
}));

describe("ThreatLens Login Page", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("login_emptyCredentials_preventsSubmission", () => {
    const onLogin = vi.fn();

    const { container } = render(<Login onLogin={onLogin} />);
    const form = container.querySelector("form");

    const email = screen.getByLabelText("Email Address");
    const password = screen.getByLabelText("Password");

    expect(email.required).toBe(true);
    expect(password.required).toBe(true);
    expect(form.checkValidity()).toBe(false);

    // HTML browser validation blocks invalid form submission.
    expect(authService.login).not.toHaveBeenCalled();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("login_togglePassword_changesVisibility", () => {
    const onLogin = vi.fn();

    render(<Login onLogin={onLogin} />);

    const password = screen.getByLabelText("Password");

    expect(password.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password.type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password.type).toBe("password");
  });
});
