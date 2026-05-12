@AGENTS.md

# KHAYAL — Project Rules for Claude Code

---

## ⛔ UI DESIGN RULE — ABSOLUTE, NO EXCEPTIONS

**Claude does not design UI. Claude does not know how. Every time it tries, it makes mistakes.**

### What is banned forever
- Writing custom CSS gradients, glows, radial backgrounds, or any decorative visual effect
- Inventing component layouts, card designs, section structures, or spacing systems
- Choosing colors beyond what already exists in `globals.css` CSS variables
- Creating animation code from scratch (no custom keyframes, no hand-rolled motion logic)
- Making any visual decision that isn't directly sourced from an existing library

### The only allowed source for UI: ReactBits
**Every** component, background, animation, and visual effect **must** come from:
- **https://www.reactbits.dev** — fetch the actual source code, port it verbatim
- Installed: `motion` (framer-motion), `gsap`, `ogl`, `three`

### Workflow for any UI task
1. Go to reactbits.dev and find the component that fits
2. Fetch the raw source from GitHub (`raw.githubusercontent.com/DavidHDev/react-bits/main/src/content/...`)
3. Port it verbatim to TypeScript — change only: color props (use CSS variables), className props, TypeScript types
4. Wire it to real data from Supabase
5. Never add custom decorative CSS on top

### This applies to ALL pages
Not just the landing page. Every page in the app:
- `/browse`, `/movies/[slug]`, `/tv/[slug]`, `/search`, `/profile`, `/lists/[id]`, `/login`, `/admin`
- Any new page created in the future

### Why
Claude consistently produces mediocre, inconsistent UI when designing from scratch:
- Wrong color contrast
- Mismatched spacing
- Gradient glows nobody asked for
- Components that look "AI-generated"

ReactBits components are designed by humans, tested by thousands of users, and look professional. Use them.

---

## Stack
- Next.js 15 App Router + TypeScript strict mode
- Tailwind CSS v4 with CSS custom properties (`var(--ink)`, `var(--cream)`, `var(--accent)`, `var(--saffron)` for ratings only)
- Supabase (PostgreSQL) — `search_all` RPC, `movies_with_genres` view, `recommendations` table
- Python scripts in `/scripts/` — TMDB sync, ML training (scikit-surprise, cornac)
- GitHub Actions at `.github/workflows/daily-sync.yml`

## Definition of Done — every issue, every PR

Before any commit is pushed and any issue is closed, ALL of the following must pass.
Run `/test-stack` to execute the full pipeline automatically.

### Mandatory gates (must PASS, never skip)
1. **Type safety** — `npx tsc --noEmit` zero errors + `mypy scripts/ --strict` clean
2. **Linting** — `npx eslint src/ --max-warnings 0` + `ruff check scripts/`
3. **Security SAST** — `semgrep --config=p/typescript --config=p/owasp-top-ten src/`
4. **CVE scanning** — `grype dir:. --fail-on high` + `pip-audit`
5. **Unit tests** — `npx vitest run` all passing + `pytest scripts/ -m "not integration"`
6. **E2E tests** — `npx playwright test` all passing
7. **Smoke tests** — `npx playwright test --grep @smoke` all passing
8. **Build** — `npm run build` zero TypeScript errors

### Run when applicable
9. **Integration tests** — requires `supabase start`
10. **Property-based tests** — fast-check (TS) + Hypothesis (Python) for logic-heavy functions
11. **Contract tests** — Pact when a service boundary changes
12. **Snapshot/visual** — Lost Pixel when UI components change
13. **Mutation tests** — Stryker + mutmut weekly or pre-release. Score must be ≥ 80%.
14. **Architecture fitness** — `npx depcruise src/ --config .dependency-cruiser.cjs`

## Closing issues
When a task is complete:
1. Run `/test-stack` — all mandatory gates must pass
2. Push the commit
3. Close the GitHub issue: `gh issue close <N> --repo pnsw123/Khayal --comment "Done. Commit: <hash>. Tests: <summary>"`
4. Move the project board card to Done

## Test file naming (mandatory)
| Source | Test file |
|---|---|
| `src/hooks/use-X.ts` | `src/tests/use-X.test.ts` |
| `src/components/X.tsx` | `src/tests/X.test.tsx` |
| `src/app/api/X/route.ts` | `src/tests/X-api.test.ts` |
| `src/lib/X.ts` | `src/tests/X.test.ts` |
| `scripts/X.py` | `scripts/test_X.py` |
| User flows | `e2e/X.spec.ts` |

Every source file must have a corresponding test file before the PR is opened.

## No push without tests
Never push code without test files. No exceptions.

## Agents
When spawning sub-agents for issues, each agent must:
- Run `/test-stack` before pushing
- Write test files before implementation (TDD)
- Close the issue with a comment on completion
- Use `data-testid` attributes on all interactive/testable UI elements
