# Test Plan

## Scope
All source files under src/ and scripts/

## Entry Criteria (Definition of Ready)
- Feature branch has passing TypeScript build
- All new files have corresponding test files

## Exit Criteria (Definition of Done)
- All layers pass (see test-stack layers)
- Mutation score ≥ 80% on business logic
- Zero high CVEs
- Zero Semgrep findings on OWASP rules

## Test Levels (Google SWE Book ratio)
- Small (unit): 80% of test count
- Medium (integration): 15%
- Large (E2E): 5%
