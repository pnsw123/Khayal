## Summary

<!-- 1-3 sentences: what does this PR do and why? -->

Closes #<!-- issue number -->

---

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (fix or feature that changes existing behaviour)
- [ ] Refactor / performance (no functional change)
- [ ] Documentation only
- [ ] Dependency update

---

## Checklist

### Code quality
- [ ] `/test-stack` invoked — all 8 mandatory gates passed (TypeScript, lint, SAST, CVE, unit, E2E, smoke, build)
- [ ] No `console.log` / `TODO` / `FIXME` left in new code
- [ ] No hardcoded secrets or credentials

### Tests
- [ ] New test file added for every new source file (`src/tests/X.test.ts` pattern)
- [ ] Existing tests still pass (full regression suite green)
- [ ] E2E / smoke tests updated if UI changed

### UI changes *(skip if backend-only)*
- [ ] Screenshot or screen recording attached below
- [ ] Dark mode checked
- [ ] Mobile viewport checked (375 px)
- [ ] Accessibility: keyboard navigation and focus rings work

### Documentation
- [ ] `README.md` updated if public-facing behaviour changed
- [ ] `CONTRIBUTING.md` updated if dev setup changed
- [ ] Inline comments added for non-obvious logic

---

## Screenshots / recordings

<!-- Attach before/after screenshots for any UI change. Remove section if not applicable. -->

---

## Notes for reviewer

<!-- Anything the reviewer should know: tricky areas, known limitations, follow-up issues. -->
