import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/lib/supabase-browser", () => ({
  supabaseBrowser: () => ({
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

import { LoginForm } from "@/app/login/login-form";

beforeEach(() => {
  mockSignIn.mockReset();
  mockSignUp.mockReset();
  mockPush.mockReset();
  mockRefresh.mockReset();
});

describe("LoginForm", () => {
  it("renders email and password inputs", () => {
    render(<LoginForm />);
    expect(screen.getByPlaceholderText(/cinema\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument();
  });

  it("renders Sign in button by default", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows initialError message", () => {
    render(<LoginForm initialError="Invalid credentials" />);
    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("shows initialMessage", () => {
    render(<LoginForm initialMessage="Check your email" />);
    expect(screen.getByText("Check your email")).toBeInTheDocument();
  });

  it("switches to Create account mode", () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: /create an account/i }));
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("calls signInWithPassword on submit in signin mode", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    render(<LoginForm />);
    fireEvent.change(screen.getByPlaceholderText(/cinema\.com/i), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), { target: { value: "password123" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);
    });
    expect(mockSignIn).toHaveBeenCalledWith({ email: "test@test.com", password: "password123" });
  });

  it("shows error message on sign-in failure", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    render(<LoginForm />);
    fireEvent.change(screen.getByPlaceholderText(/cinema\.com/i), { target: { value: "bad@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), { target: { value: "wrongpass" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);
    });
    expect(await screen.findByText("Invalid login credentials")).toBeInTheDocument();
  });

  it("redirects to nextPath after successful sign-in", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    render(<LoginForm nextPath="/profile" />);
    fireEvent.change(screen.getByPlaceholderText(/cinema\.com/i), { target: { value: "ok@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), { target: { value: "pass1234" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/profile"));
  });

  it("defaults redirect to /browse when no nextPath", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    render(<LoginForm />);
    fireEvent.change(screen.getByPlaceholderText(/cinema\.com/i), { target: { value: "ok@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), { target: { value: "pass1234" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/browse"));
  });
});
