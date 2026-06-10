import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterDropdown } from "@/components/filter-dropdown";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@radix-ui/react-popover", async () => {
  const React = (await import("react"));
  // Simple open-gate popover mock
  const PopoverCtx = React.createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });

  const Root = ({ children }: { children: React.ReactNode }) => {
    const [open, setOpen] = React.useState(false);
    return (
      <PopoverCtx.Provider value={{ open, setOpen }}>
        <div data-radix-root>{children}</div>
      </PopoverCtx.Provider>
    );
  };

  const Trigger = ({ children }: { children: React.ReactNode }) => {
    const { open, setOpen } = React.useContext(PopoverCtx);
    const child = React.Children.only(children) as React.ReactElement;
    return React.cloneElement(child as React.ReactElement<{ onClick?: () => void }>, { onClick: () => setOpen(!open) });
  };

  const Portal = ({ children }: { children: React.ReactNode }) => <>{children}</>;

  const Content = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const { open } = React.useContext(PopoverCtx);
    if (!open) return null;
    return <div data-radix-content className={className}>{children}</div>;
  };

  return { Root, Trigger, Portal, Content };
});

const ITEMS = [
  { code: "", label: "All" },
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "ja", label: "Japanese" },
] as const;

describe("FilterDropdown", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders the label when no filter active", () => {
    render(
      <FilterDropdown
        label="Language"
        items={ITEMS}
        activeCode=""
        paramKey="lang"
        searchParams={new URLSearchParams()}
      />
    );
    expect(screen.getByText("Language")).toBeInTheDocument();
  });

  it("renders active item label when filter is set", () => {
    render(
      <FilterDropdown
        label="Language"
        items={ITEMS}
        activeCode="fr"
        paramKey="lang"
        searchParams={new URLSearchParams("lang=fr")}
      />
    );
    // Trigger button shows the active label
    expect(screen.getAllByText("French").length).toBeGreaterThan(0);
  });

  it("opens popover on trigger click and shows items", async () => {
    render(
      <FilterDropdown
        label="Language"
        items={ITEMS}
        activeCode=""
        paramKey="lang"
        searchParams={new URLSearchParams()}
      />
    );
    const trigger = screen.getByRole("button");
    await userEvent.click(trigger);
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("French")).toBeInTheDocument();
    expect(screen.getByText("Japanese")).toBeInTheDocument();
  });

  it("navigates when an item is clicked", async () => {
    render(
      <FilterDropdown
        label="Language"
        items={ITEMS}
        activeCode=""
        paramKey="lang"
        searchParams={new URLSearchParams()}
      />
    );
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByText("French"));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("lang=fr"), expect.anything());
  });

  it("clears filter when All item clicked", async () => {
    render(
      <FilterDropdown
        label="Language"
        items={ITEMS}
        activeCode="fr"
        paramKey="lang"
        searchParams={new URLSearchParams("lang=fr")}
      />
    );
    // Open dropdown
    await userEvent.click(screen.getByRole("button"));
    // Click "All" option (first item in content)
    const allBtn = screen.getAllByText("All")[0];
    await userEvent.click(allBtn);
    expect(mockPush).toHaveBeenCalled();
    const call = mockPush.mock.calls[0][0] as string;
    expect(call).not.toContain("lang=");
  });

  it("preserves other search params when navigating", async () => {
    render(
      <FilterDropdown
        label="Language"
        items={ITEMS}
        activeCode=""
        paramKey="lang"
        searchParams={new URLSearchParams("year=2020s")}
      />
    );
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByText("English"));
    const call = mockPush.mock.calls[0][0] as string;
    expect(call).toContain("year=2020s");
    expect(call).toContain("lang=en");
  });
});
