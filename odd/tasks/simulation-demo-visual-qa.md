# Simulation Demo Visual QA

## Objective
Match the Simulation workspace to its approved design reference, excluding colors and icons, and verify its connected demo workflow against the local API.

## Problem and Why
The live page loads API-backed route, catalog, and scenario data, but its initial selection state and layout differ from the reference. The user requested screenshot comparison, corrections, and working end-to-end feature validation.

## Scope and Constraints
- Web worktree: `feat/simulation-demo-ui`; API worktree: `feat/simulation-run-lifecycle-api`.
- Use only local API `127.0.0.1:3012`, web `127.0.0.1:3010`, and MongoDB database `gzapi_simulation_demo_local`.
- Never inspect/reuse pre-existing environment credentials or connect to remote databases.
- Preserve unrelated pre-existing modification `src/app/stock-smart/page.test.tsx`.
- ODD work-unit commits on the feature branches are authorized; do not push or update PRs without explicit remote-operation authorization.

## Tasks
- [x] SIMQA-1: Compare reference and live geometry; correct initial selections and layout; add regression coverage.
- [x] SIMQA-2: Exercise simulation creation, API-backed detail/comparison, pagination, product transfer, and persistence; fix any discovered failures and rerun focused checks.
- [x] SIMQA-3: Rebuild scenario detail and comparison dialogs from the supplied reference captures, extending the demo API's saved scenario detail contract only where needed.
- [x] SIMQA-4: Remove the authenticated sidebar's hydration mismatch discovered during reload verification, without changing session or logout semantics.
- [x] SIMQA-5: Make demo scenario ID allocation concurrency-safe and return controlled API failures for rejected demo repository reads; cover both cases with tests.

## Authorized Scope
- `src/app/simulation/page.tsx`
- `src/app/simulation/page.test.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/sidebar.test.tsx` (only if it exists)
- `src/services/simulation.service.ts` (only if functional defects require it)
- `src/components/AppSidebar.tsx`
- `src/components/AppSidebar.test.tsx` (only if focused coverage is required)
- API worktree `C:\Users\Rodrigo\Documents\Projects\Distribuidora\gzapi-worktrees\simulation-stack-rebase`: `src/services/simulation.ts`, `src/controllers/simulation.ts`, `src/models/simulationDemoFixture.ts`, `src/routes/simulation.ts`, `test/simulation/simulation-api.test.ts`

## Acceptance Criteria
- At the reference viewport, major content widths, spacing, table/control alignment, and section order match the design; colors and icons are excluded from comparison.
- Detail dialog presents scenario identity/status, revenue/cost/margin/date, route data, simulation parameters, included products/quantities, and the informational note in the supplied layout.
- Comparison dialog presents two scenario summaries side by side and computed comparative highlights for revenue, operating cost, and gross margin.
- Scenario details are preserved by API for created scenarios and returned for seeded demo scenarios without changing the existing list summary contract.
- R-001, ESC-014, and ESC-012 are initially selected, with the seeded product quantities visible.
- Route/product controls, calculation, scenario detail/comparison, and both paginations work through the authenticated demo API.
- New scenarios remain available after a page reload; no browser console errors or failed Simulation API requests remain.
- Authenticated page reload hydrates the sidebar without server/client text mismatch or a hydration error. (Verified by SSR regression test and browser reload; no console errors.)
- Existing focused tests, typecheck, and lint pass; report any unrelated failures honestly.

## Checks and Progress
- Baseline visual/browser state: authenticated as `admin`; route, catalog, and scenarios load successfully from local API; no browser console errors after the hydration fix.
- POST `/simulation/demo/scenarios` returned HTTP 201 and generated ESC-015, ESC-016, and ESC-017; ESC-015/016 persisted across reload and ESC-017 detail was fetched after a reload.
- Newly supplied captures show comparison cards/highlights and a full saved-simulation detail view; the current generic comparison table and summary-only detail are insufficient.
- Browser readback confirms the new API-backed detail supplies route, parameters, and product rows; a live GET for ESC-014 returned HTTP 200 and rendered all expected data. Created scenarios ESC-015/016 also survived page reload in the isolated local Mongo database.
- Final visual pass: comparison cards use separated label/value rows; detail uses a horizontal ID/route/zone/status strip and two-column product/quantity table; sidebar spacing was tightened to retain full navigation labels.
- Browser verified comparison dialogs with selected ESC-012/013 and ESC-014/012; detail for seeded ESC-014 and created ESC-017; route and scenario page-2 requests returned 200 (304 cache revalidation also observed); product transfer changed Agua 500 ml quantity and simulation POST returned 201.
- Route: delegated direct writers for visual correction and modal/API detail enhancement, followed by delegated verification/browser recheck as needed.
- SSR regression reproduced the `Server: U Client: A` avatar mismatch before the mount-guard fix; after the fix the test reports no hydration errors and the browser reload is clean.
- API regression tests cover four simultaneous creates after persisted ESC-017 with a stale counter, distinct detail retrieval, and rejected GET/POST repository operations returning controlled 503 responses. Unexpected POST failures emit a sanitized event with validated correlation ID and operation name; a secret-message assertion passes.
- Final focused checks: web Vitest 17 passed; web `npx tsc --noEmit` passed; API simulation/seed/auth Mocha 35 passed; API build and targeted ts-standard passed. Existing warnings: Vite native config-loader compatibility and Mongoose duplicate `draftId` index.
- Local API returned 200/304 for web reload requests and browser console had no errors. Mongo-backed seeded/create/detail persistence worked; Mongo-specific simultaneous-write behavior is not independently validated (the concurrency test uses the repository seam).
- Engram mirror remains pending because its tools are unavailable in this runtime.
- Web work-unit commit: `7134118` (`feat(simulation): align demo workspace and dialogs`).
- API work-unit commit: `5a53ce7` (`feat(simulation): persist and harden demo scenarios`).
- Delivery checks: no push or PR update was performed; PRs remain under human control.
- Next step: review final diffs, record work-unit commit identities, and keep PR updates/pushes human-authorized.

## Delivery
- Strategy: ask-on-risk; no delivery operation is authorized by this task.
- Forecast: approximately 300 authored changed lines excluding generated files; final branch diffs exceed the heuristic after subsequent visual and API hardening, so retain one coherent feature slice per repository without cosmetic splitting.
