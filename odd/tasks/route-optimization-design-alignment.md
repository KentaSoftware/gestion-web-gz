# Route Optimization Design Alignment

## Objective and authorization
Implement the user-approved Route Optimization checklist against the supplied dashboard, empty-state, generator, calculation/loading/error, map, ordered stops, linked orders, depot configuration, and manual geocoding screenshots.
Use the attached analysis document's Route Optimization requirements RF-OR-01 through RF-OR-11 (lines 156-246), related use cases (487-518), and mockup narratives (684-750). Do not import unrelated Simulation requirements.

## Source and repository boundaries
- Frontend branch: `feat/route-optimization-design-alignment`, based on main `1722d1b`.
- API branch: `feat/route-optimization-contracts`, based on master `41cbc0c`, in the separate `gzapi-worktrees/route-optimization-design-alignment` worktree.
- Preserve the separate `fix/simulation-admin-permissions` branch at `7b20975` and issue #57; do not bundle it into this feature or infer it was merged.
- Existing route dashboard, planner, snapshots, Google provider integration, and manual-coordinate schema are foundations, not grounds for a rewrite.
- Spanish UI copy follows the references; technical identifiers, tests, and documentation remain English. Preserve application navigation and theme behavior outside the module.
- Do not copy inconsistent sample counts, marker numbers, dates, prices, or success states as real data. Render sourced values; show unavailable currency costs explicitly until a validated fuel-price source is defined.
- Keep real operational data separate from isolated synthetic fixtures. Never drop an existing database or mutate production to prove a local flow.

## Findings and acceptance decisions
- Generator selection must honor confirmed/dispatchable sales, blocked clients, valid confirmed coordinates, date/zone filters, and omission reasons.
- Routes are closed depot circuits. Manual stop reordering is included by RF-OR-08 even though it is not illustrated in every screenshot; changes invalidate stale previews and need recalculation/revalidation before save.
- RF-OR-09 permits Euclidean estimates or ordered-list degradation. A clearly identified estimate is not a real Google route; provider errors must never produce fabricated success or road metrics. Existing ordered snapshots remain available without a map.
- Confirming a route must persist the reviewed stop order, metrics, and linked orders immutably. Current save recalculates preview; address that integrity gap with a bounded compatible contract rather than trusting arbitrary client metrics.
- Enforce route read/create/configuration permissions and assigned-driver visibility at the API, not only hidden buttons. Include admin seed grants and fresh-session verification without unrelated privilege expansion.
- Existing backend carries fuel liters, but the screenshot's currency fuel-cost source has not been established. Do not invent a price.
- User explicitly authorized bounded Google Maps JavaScript, Routes, and Geocoding tests using this project's configured keys and synthetic data, accepting possible API costs. Do not expose keys, change credentials, access production data, or perform bulk calls. Verify key availability without printing values before any live check; absent credentials remain a disclosed blocker, not authorization to invent or obtain others.

## Tasks
- [ ] ROUTE-1: Audit and correct route/admin permissions, endpoint authorization, assigned-driver visibility, eligibility, and omission behavior with focused regression tests. Route: delegated direct; trigger: cross-file API/auth/seed behavior and tests.
  - [x] ROUTE-1A: Close route permission gates, additive admin grants, and assignment-aware driver isolation before list/detail/dashboard aggregation. Assignment writes require the existing `create_route_plan` capability. The user explicitly authorized including `src/services/routeDashboard.ts` after its necessity was identified. API work-unit commit: `7c577a9` (409 additions/31 deletions across ten paths).
  - [ ] ROUTE-1B: Verify supported confirmed-sale, coordinate-range, commercial-blocking, and omission-history rules. Do not invent missing model fields or financial policy; surface actual contract gaps before expanding scope.
- [ ] ROUTE-2: Preserve preview/save integrity and support the required manual ordering/revalidation, source-complete metrics/order fields, provider quota/error behavior, and immutable snapshots. Route: delegated direct; trigger: coordinated contract/service/test changes.
- [ ] ROUTE-3: Align the dashboard, filters, KPIs, planned-route cards, client search/eligibility warnings, selected-route view, and interactive map layout with populated and empty references. Route: delegated direct; trigger: multiple UI components and behavioral tests.
  - Earlier KPI slice: the fuel KPI explicitly marks currency cost unavailable and retains sourced estimated liters as secondary information. No fuel price was invented. Focused frontend runner at that point: 8 files, 58 tests passed; `npm run tsc` passed; `npm run lint` passed with three existing Stock Smart image warnings.
  - ROUTE-3A partial implementation: read/create/config permission gates, hydration and denied states, read-only navigation, permission-revocation cancellation, persistent planning inputs, default route selection and refresh reconciliation, and responsive map/route-detail composition using existing components. Date and zone remain planner inputs; the pre-existing dashboard query remains global and is not claimed as filtered. A missing stop sequence is explicitly unavailable rather than inferred from sale IDs. RED: focused dashboard/page/registry tests failed before implementation (9 failures); after implementation and source line-ending normalization the eight-file runner passed 64 tests. `npm run tsc` and `npm run lint` passed; lint reported the three existing Stock Smart image warnings. Real browser, responsive visual review, live provider behavior, and remaining ROUTE-3 child visual alignment remain pending. No new commit or provider request was made.
- [ ] ROUTE-4: Align generator selection, required driver/vehicle, loading/error/cancel states, three preview tabs, ordered stop and linked-order tables, confirmation/save, and success refresh. Route: delegated direct; trigger: modal state machine and contract/UI tests.
- [ ] ROUTE-5: Complete depot and manual client-location configuration with range validation, map interaction, provider-unavailable fallback, persistence, and permission enforcement. Route: delegated direct; trigger: existing client/config UI and API integration.
- [ ] ROUTE-6: Verify scoped tests, types/lint, safe isolated fixtures, actual role logins, screenshots of every supplied state, and the complete browser lifecycle. Record genuine provider proof separately from injected-provider tests, then prepare linked approved issues/PRs without automatic merge. Route: bounded verification workers plus parent browser/git/gh actions.

## Test-first and checking
Use observed RED/GREEN/refactor for deterministic behavior changes; resolve exact safe Vitest/Mocha runners per task before launching each writer. Preserve existing main/master contract tests. Inspect database hooks before tests; do not execute suites that drop unrelated databases.
Run source normalization before final functional checks. Capture exact commands, observed counts/failures, browser network boundaries, and skipped checks honestly. RDD is currently off; never enable it automatically or claim a native receipt.
Use one writer at a time. Derive exact edit surfaces per bounded task; do not authorize repository-wide writes.

## Delivery forecast and strategy
Initial forecast: approximately 1,600-2,900 authored changed lines across API, UI, and tests. The 400-line task heuristic is advisory: do not minify, omit tests, or remove formatting to satisfy it.
Delivery strategy: `ask-on-risk`. Reuse the session's selected `stacked-to-main` approach for independently landable slices against each repository's default branch, but do not reuse the Simulation PR's size exception. Any necessary oversized cohesive slice requires a new explicit exception after one honest slicing pass.
Record work-unit commits with tests/docs alongside behavior. Publish and merge only within the user's granted scope and normal issue approval rules; no automatic merge.

## Progress and next step
Requirement/design/contract audit and Google consent are recorded. ROUTE-1A completed in API commit `7c577a9`: permission gates, four additive admin route grants, trusted driver scope, and one Mongo aggregation that joins effective assignments before route/dashboard metrics. Driver dashboards omit global candidates/locations; joined projections also supply consistent card assignments/status. Missing projection falls back to snapshot assignment; an existing unassigned projection does not. No unrelated Simulation grant or historical snapshot mutation was added.

Observed checks: 31 offline tests passed (parent rerun); two opt-in Mongo tests are skipped by default and separately passed in an independent actual-Mongo run. That run used a new cryptographically unique local test namespace, verified nonexistence, cleaned only inserted fixture IDs/projections, and disconnected without dropping any database. An initial fixture-only nickname-index failure occurred before ownership assertions; the corrected fixture was rerun once with parent authorization and passed. Typecheck, focused lint, and staged whitespace checks passed. Native assessment: medium, RDD off. Independent source/query review found no critical blocker in this specific authorization boundary. Legacy DB-dropping route suites were not run; updated legacy expectations have not been claimed as executed.

Next: continue ROUTE-1B and the remaining contract/UI/location/verification work. The full feature is not complete and no new issue/PR or remote publication has occurred. Backend API worktree is clean at its work-unit commit; frontend task document is being synchronized. Real Google proof and browser screenshot coverage remain pending; no Google requests have been made yet.
