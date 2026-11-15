# Operational UX improvements

## Objective and scope
Improve readability, feedback, accessibility and responsive usability in routes, simulation, finance and smart stock while preserving all existing information, filters, actions, terminology, business rules and API contracts. Follow the existing design system; no GSAP dependency. Do not conceal essential information. Product decisions about surplus calculation, finance demo functionality, unavailable order numbers and stock configuration logic remain out of scope.

## Tasks
- [x] UX-1 Routes: improve dense displays, resource loading/error feedback and reduced-motion behavior. Route: delegated direct; multiple components and tests. 82 targeted tests passed, typecheck and lint passed (existing warnings); independently reviewed and corrected overflow and asynchronous races. Browser scrolling remains unverified.
- [x] UX-2 Simulation: improve readability, empty states and contextual disabled-action explanations without changing calculations. Route: delegated direct; page and tests. 26 tests passed, typecheck and lint passed with existing warnings; independent review corrected removal wording. Browser and assistive-technology behavior remains unverified.
- [ ] UX-3 Finance: improve amount and chart readability and distinguish loading/error from zero without altering demo behavior. Route: delegated direct; multiple components and tests.
- [ ] UX-4 Smart stock: improve readability, loading/error distinction and alert presentation without changing business logic. Route: delegated direct; page and tests.
- [ ] UX-5 Verify affected flows against the audit inventory, run relevant checks, and document unverified accessibility and browser scenarios. Route: delegated direct; independent verification.

## Checks and delivery
UX-1 work-unit commit: `e3b3ba9`. Failed refresh can retain stale simulation data, a pre-existing limitation requiring further investigation.

Use existing Vitest runner: relevant `npm test -- <test paths>`; observe RED before behavioral changes when deterministic tests apply. Run `npm run tsc -- --incremental false`, `npm run lint`, and applicable broader checks. Preserve the unrelated untracked `odd/tasks/sales-route-integration.md`. Never modify API contracts or business logic. Forecast exceeds 400 authored lines across four modules; delivery strategy ask-on-risk. Mirror pending if Engram unavailable. Record observed checks and work-unit commits as completed.
