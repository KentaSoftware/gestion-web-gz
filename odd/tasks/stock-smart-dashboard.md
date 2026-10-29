# Smart Stock Dashboard

## Objective
Implement the Smart Stock dashboard and its required backend support in `gestion-web-gz` and `gzapi`, matching the supplied screen layouts while reusing the product's current colors, icons, session, navigation, and component vocabulary.

## Problem and rationale
The approved designs describe one authenticated inventory workspace for global stock indicators, severity-grouped alerts, filtered/paginated products, quick availability lookup, movement history, threshold configuration, write-offs, and expired-stock removal. Existing committed stock and design-system code is available on the active repository branches, while the local default branches lack essential foundations. Isolated worktrees protect the user's pre-existing uncommitted edits.

## Scope
- Implement the approved UI in the existing Next.js application at `/stock-smart`.
- Reuse compatible backend contracts and capabilities; develop only missing support required by the approved UI. Backend retains business calculations and eligibility.
- Keep product filtering, global KPIs, partial outcomes, errors, empty states, and expired-stock rules consistent with the Spec.
- Populate and exercise only the explicitly named local `stock_smart` test database using a verified non-destructive path.
- Compare the implementation against every supplied design image and test the working local API and web app in the browser.

## Out of scope and constraints
- No adoption/dashboard-usage measurement, operational success/error-rate metrics, or new persistent instrumentation.
- No remote execution, pushing, PR creation, or changes to the user's existing worktrees.
- Do not expose bucket/lot identifiers in UI requests or rendering.
- Never drop, reset, or overwrite an existing database. Inspect its local state first; if population requires destructive action or an unverified data source, stop before that action and ask.
- Preserve all unrelated files and pre-existing modifications in the original worktrees.
- RDD is explicitly disabled globally; delivery remains unmanaged and no review lifecycle is started.

## Implementation decisions resolved from OPEN-Q-05–08
- **Q05, idempotency:** Reuse the backend's existing operation/correlation and idempotent-movement mechanisms. Retries of the same operation must not duplicate movements; per-product bulk outcomes remain independent. Add only missing support and test repeated and conflicting retries.
- **Q06, last sale:** Use an authoritative source that can establish the latest recorded sale across the required history. A bounded rotation window cannot prove “Sin ventas”; when complete history is unavailable, do not present that claim and expose the existing incomplete/unavailable state.
- **Q07, copy:** Use concise, neutral Spanish consistent with existing Golozur messages. Confirmations must distinguish full success, partial outcome, and failure; the report action must say plainly that report generation is not available in this iteration.
- **Q08, performance profile:** For the reproducible first-view check, use the existing Playwright Chromium project at a 1365×768 viewport against the local dev stack without artificial network throttling. “Useful view” means global indicators/alert summary and the first product page are rendered and usable. Record the actual browser/runtime conditions with test results; this is ephemeral QA evidence, not production telemetry.
- **Branch-base adaptation:** The plan's original default-branch instruction is infeasible without recreating existing foundations: local `master` lacks the stock service/routes/tests, and local `main` lacks the committed sidebar/module-registry design-system foundations. Create one isolated feature branch named `feat/smart-stock-dashboard` per code repository from the current committed baseline (`gzapi: feat/seed-build-load` at `0c5bfee`; `gestion-web-gz: feat/route-optimization` at `370f2c0`). Never copy or stage the original worktrees' uncommitted changes. No remote refs are updated.

## Authorized scope
- `docs/Modulos-Proyecto-Final/modulos/02-gestion-stock/diseno-ui/stock-inteligente-ui_SPEC.md`
- `docs/Modulos-Proyecto-Final/modulos/02-gestion-stock/diseno-ui/stock-inteligente-ui_IMPLEMENTATION_PLAN.md`
- `gzapi/src/**` and `gzapi/test/**`, restricted per task to stock contracts/services/models/routes and their focused tests.
- `gestion-web-gz/src/app/stock-smart/**`
- `gestion-web-gz/src/config/moduleRegistry.ts` and the navigation/test files required to register `/stock-smart`.
- Focused Smart Stock frontend unit/E2E test files under the existing test conventions.
- This feature document: `odd/tasks/stock-smart-dashboard.md`.

## Tasks and route
All implementation units use one delegated writer at a time because each crosses multiple non-trivial files/repositories. Each task follows strict RED → GREEN → REFACTOR where an existing deterministic runner and meaningful expected result apply. The API strict-TDD capability is recorded in Engram observation 653; exact runner: `npm test` with its Mocha/ts-node options from `gzapi/AGENTS.md`. Focused tests must be proven safe and must never target `stock_smart`. Frontend follows the ODD default test-first policy using its existing Vitest runner; browser work uses the configured Playwright runner.

- [ ] **SS-01 — Resolve decisions and align execution plan.** Route: delegated direct documentation writer. Record Q05–08 resolutions above, update the Spec/Plan handoff and gates, and document the evidence-based branch-base adaptation. Checks: targeted consistency readback and `git diff --check`.
- [ ] **SS-02 — Complete backend read contracts.** Route: delegated direct API writer. Inventory current stock capabilities, add the global overview summary without page-scoping, and establish a complete latest-sale source or truthful unavailable state. Add focused contract/service tests and observe RED before implementation, then GREEN.
- [ ] **SS-03 — Build dashboard read experience.** Route: delegated direct frontend writer. Add `/stock-smart`, authenticated navigation, global KPIs, alert groups, product search/category filters, pagination, quick lookup and movement view, loading/empty/error states. Add focused Vitest/E2E coverage and observe RED before implementation.
- [ ] **SS-04 — Complete safe stock operations.** Route: delegated direct writer, one repository task at a time. Reuse backend operations first; fill only required gaps for thresholds, quantity-based write-off, product/bulk expired removal, idempotency, partial outcomes, committed-stock preservation, and the Buenos Aires inclusive expiry cutoff. Add focused backend tests first.
- [ ] **SS-05 — Implement operational UI forms and feedback.** Route: delegated direct frontend writer. Build the approved threshold/write-off/removal interactions with accessible confirmation, independent bulk results, accurate Spanish full/partial/error messages, and form retention on errors. Add focused component/E2E tests first.
- [ ] **SS-06 — Test data and live verification.** Route: delegated direct verification/environment workers per action. Inspect the local `stock_smart` database read-only before any write; use only a verified idempotent/non-destructive seed/import path. Start API and web in separate process sessions, log in with the user-authorized local test account without recording credentials, exercise all applicable flows, compare every supplied design image, capture console/network errors, and record each check honestly.
- [ ] **SS-07 — Close acceptance and commits.** Route: delegated direct verification plus parent spot-check. Run applicable focused/full checks only after validating database safety, accessibility/responsive checks, and the design-by-design browser checklist. Close each work unit with a Conventional Commit on the feature branch and record commit IDs and evidence here. Never stage unrelated files.

## Acceptance criteria
- All required dashboard sections and operation states from the Spec are present at `/stock-smart` and preserve the existing Golozur theme/icons.
- Search and category intersect; severity affects alerts only; clearing one filter preserves others; global KPIs remain invariant.
- Overview KPIs are global, not derived from the current page; empty and failure states remain distinct.
- UI does not send or render lot/bucket IDs; backend remains the authority for business calculations and eligibility.
- Committed expired quantities are preserved; only eligible uncommitted expired quantity is removed; partial and no-eligible results are reported truthfully.
- Expiry is inclusive through the Buenos Aires business date; removal starts on the next local day.
- The same operation retry does not duplicate movements; a conflicting retry is not reported as success.
- No operational/adoption telemetry is introduced. Existing diagnostic correlation is reused.
- Every applicable Spec scenario/NFR/TC/AC maps to a focused executable check or a clearly recorded unavailable/pending result.
- All eight supplied design references are reviewed individually against the final local UI; visual differences and justified semantic constraints are documented.
- API starts against local database `stock_smart`; its data source and population path are verified and non-destructive.

## Verification commands
- API focused stock suite: `npm test` (the suite contains database-touching fixtures; inspect isolation and use the focused-safe invocation before any run). API lint/build: `npm run lint`, `npm run build`.
- Frontend focused tests: `npm test -- --run <verified-stock-test-path>`; E2E: `npm run test:e2e -- <verified-stock-spec>`; remaining checks: `npm run tsc`, `npm run lint`, `npm run build`.
- Runtime: `npm run dev` for each service in separate sessions; browser verification on the local URLs returned by the actual startup output.
- Structural: `git diff --check`; verify per-repository staged paths before each commit.

## Delivery and progress
- Delivery strategy: `single-pr`, consistent with the Plan's single-branch/no-phase-splitting rule. This does not authorize creating or publishing a PR.
- Forecast: substantially above the advisory ~400 authored-line budget across API/UI/tests; keep commits as cohesive behavior work units and track the actual aggregate after each commit. Do not code-golf or omit tests/docs.
- Current progress: exploration and image inventory complete; isolated feature worktrees created; no implementation or database changes yet.
- Next step: commit this tracking document and Engram mirror before any source change, then resolve Q05–08 and the branch-base deviation in the Spec/Plan.
