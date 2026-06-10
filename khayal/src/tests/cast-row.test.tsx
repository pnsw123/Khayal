import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/image — render plain <img> for jsdom
vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    fill: _fill,
    sizes: _sizes,
    className,
  }: {
    alt: string;
    src: string;
    fill?: boolean;
    sizes?: string;
    className?: string;
  }) => <img alt={alt} src={src} className={className} />,
}));

// jsdom has no ResizeObserver
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

import { CastRow, CastMember } from "@/components/cast-row";

const ACTORS: CastMember[] = [
  {
    person_id: 1,
    name: "Actor One",
    character_name: "Hero",
    profile_path: "https://image.tmdb.org/t/p/w185/abc.jpg",
    role: "cast",
    job: null,
    credit_order: 1,
  },
  {
    person_id: 2,
    name: "Actor Two",
    character_name: null,
    profile_path: null,
    role: "cast",
    job: null,
    credit_order: 2,
  },
];

const DIRECTOR: CastMember = {
  person_id: 99,
  name: "Jane Director",
  character_name: null,
  profile_path: null,
  role: "crew",
  job: "Director",
  credit_order: 0,
};

describe("CastRow", () => {
  it("renders nothing when cast array is empty", () => {
    const { container } = render(<CastRow cast={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders Cast heading", () => {
    render(<CastRow cast={ACTORS} />);
    expect(screen.getByText("Cast")).toBeInTheDocument();
  });

  it("renders actor names", () => {
    render(<CastRow cast={ACTORS} />);
    expect(screen.getByText("Actor One")).toBeInTheDocument();
    expect(screen.getByText("Actor Two")).toBeInTheDocument();
  });

  it("renders character name when present", () => {
    render(<CastRow cast={ACTORS} />);
    expect(screen.getByText("Hero")).toBeInTheDocument();
  });

  it("uses next/image (optimized) for actor with profile_path", () => {
    render(<CastRow cast={[ACTORS[0]]} />);
    const img = screen.getByRole("img", { name: "Actor One" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://image.tmdb.org/t/p/w185/abc.jpg");
  });

  it("renders fallback icon when profile_path is null", () => {
    render(<CastRow cast={[ACTORS[1]]} />);
    // No img element for actor without photo
    const imgs = screen.queryAllByRole("img");
    expect(imgs).toHaveLength(0);
  });

  it("shows director pill when director present in crew", () => {
    render(<CastRow cast={[...ACTORS, DIRECTOR]} />);
    expect(screen.getByText("Jane Director")).toBeInTheDocument();
    expect(screen.getByText("Directed by")).toBeInTheDocument();
  });

  it("does not show director pill when no director", () => {
    render(<CastRow cast={ACTORS} />);
    expect(screen.queryByText("Directed by")).not.toBeInTheDocument();
  });

  it("limits actors to 12", () => {
    const many: CastMember[] = Array.from({ length: 20 }, (_, i) => ({
      person_id: i,
      name: `Actor ${i}`,
      character_name: null,
      profile_path: null,
      role: "cast",
      job: null,
      credit_order: i,
    }));
    render(<CastRow cast={many} />);
    // Each actor renders a name; crew not shown as actor
    const actorNames = many.slice(0, 12).map((a) => a.name);
    actorNames.forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
    expect(screen.queryByText("Actor 12")).not.toBeInTheDocument();
  });
});
