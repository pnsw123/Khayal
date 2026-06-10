import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock react-player/youtube (dynamic import won't resolve in jsdom)
vi.mock("react-player/youtube", () => ({
  default: ({ url }: { url: string }) => <div data-testid="react-player" data-url={url} />,
}));

// Mock next/dynamic so our dynamic import resolves synchronously in tests
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<any>) => {
    // Return a component that renders a stubbed player
    const Stub = ({ url }: { url: string }) => (
      <div data-testid="react-player" data-url={url} />
    );
    Stub.displayName = "DynamicReactPlayer";
    return Stub;
  },
}));

import { TrailerModal } from "@/components/trailer-modal";

const TRAILER_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const TITLE = "Test Movie";

describe("TrailerModal", () => {
  it("S_RendersButton_WhenUrlProvided", () => {
    render(<TrailerModal trailerUrl={TRAILER_URL} title={TITLE} />);
    expect(screen.getByRole("button", { name: /watch trailer/i })).toBeInTheDocument();
  });

  it("S_ModalOpens_OnButtonClick", () => {
    render(<TrailerModal trailerUrl={TRAILER_URL} title={TITLE} />);
    const btn = screen.getByRole("button", { name: /watch trailer/i });
    fireEvent.click(btn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("react-player")).toBeInTheDocument();
  });

  it("S_ModalCloses_OnCloseButton", () => {
    render(<TrailerModal trailerUrl={TRAILER_URL} title={TITLE} />);
    fireEvent.click(screen.getByRole("button", { name: /watch trailer/i }));
    fireEvent.click(screen.getByRole("button", { name: /close trailer/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("S_ModalCloses_OnEscKey", () => {
    render(<TrailerModal trailerUrl={TRAILER_URL} title={TITLE} />);
    fireEvent.click(screen.getByRole("button", { name: /watch trailer/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("S_ModalCloses_OnOverlayClick", () => {
    const { container } = render(<TrailerModal trailerUrl={TRAILER_URL} title={TITLE} />);
    fireEvent.click(screen.getByRole("button", { name: /watch trailer/i }));
    // Click the overlay: it's the direct child of the dialog with aria-hidden
    const dialog = screen.getByRole("dialog");
    const overlay = dialog.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(overlay);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    void container; // suppress unused var
  });

  it("Z_ModalNotShown_Initially", () => {
    render(<TrailerModal trailerUrl={TRAILER_URL} title={TITLE} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("O_PlayerReceivesCorrectUrl", () => {
    render(<TrailerModal trailerUrl={TRAILER_URL} title={TITLE} />);
    fireEvent.click(screen.getByRole("button", { name: /watch trailer/i }));
    const player = screen.getByTestId("react-player");
    expect(player).toHaveAttribute("data-url", TRAILER_URL);
  });

  it("B_EmptyTitle_DoesNotCrash", () => {
    render(<TrailerModal trailerUrl={TRAILER_URL} title="" />);
    expect(screen.getByRole("button", { name: /watch trailer/i })).toBeInTheDocument();
  });
});
