# Simulation Publication

## Objective and authorization
Publish the user-accepted API-backed Simulation workspace as a clean pull request to main, linked to KentaSoftware/gestion-web-gz#18.
The user approved issue #18, publication through the existing gh session and origin SSH, and an explicit review-size exception. No merge or backend publication is authorized.

## Scope and constraints
- Base: origin/main at `278fbbb`; publication branch: `feat/simulation-api-workspace`.
- Preserve the original development branch at `3834b1b` and its running local application.
- Preserve main's navigation, registry policy, service exports, unrelated documentation, and existing contract tests.
- Adapt the accepted workspace to main's demo service APIs; use only `/simulation/demo/*`.
- Do not introduce production snapshot APIs or their unused interface definitions.
- Preserve the approved Spanish UI, accessible dialogs/switch, product transfers, permission checks, and two-record comparison.
- Keep source edits bounded to the page, its tests, and this task record unless a concrete compatibility blocker is escalated.

## Delivery strategy
`exception-ok`: one coherent main-based PR with `size:exception`, explicitly approved by the user after the honest slicing pass. Forecast: approximately 2,100 authored changed lines; final diff will be measured. Do not compress code or omit tests to fit a budget.

## Tasks
- [x] PUB-1: Adapt accepted page and tests to main's service contract, retaining main's relevant regression/contract coverage. Route: delegated direct; trigger: source/test adaptation and preparation span two non-trivial files. Default test-first policy applies to changed compatibility behavior; runner: `npm test -- src/app/simulation/page.test.tsx`.
- [x] PUB-2: Verify the exact clean-branch candidate, record checks, and commit the work unit. Route: writer self-check, parent rerun and independent read-only verification. Work-unit commit: `d084f8f`. RDD remained off.
- [x] PUB-3: Push only the publication branch and create one PR to main linking issue #18 with exactly one type label and the size exception. Route: parent git/gh state operations. PR #19 confirmed open against main with `type:feature` and `size:exception`; no merge performed.

## Checks and evidence
Required: focused page/contract tests, `npm run tsc`, `npm run lint`, `git diff --check`, scoped main-vs-branch diff, and browser verification when a safely isolated dev instance can be launched.
Known baseline: the original development branch had 11 focused tests passing; TypeScript/lint passed with three existing Stock Smart image warnings. The full suite previously had 19 unrelated Stock Smart duplicate-text failures; do not claim those checks pass without rerunning them.
Main's existing `odd/tasks/simulation-demo-visual-qa.md` must remain unchanged.

## Progress and next step
The worker ported the accepted page to the existing main service without modifying navigation, registry, service, or the prior visual QA record. Route objects are cached across pagination for main's `simulate` input; request effects discard stale results. Three actual HTTP adapter tests remain, including encoded detail IDs, POST payload, and failure propagation. The accepted UI tests cover permissions, state preservation, transfers, dialogs, comparison and empty states; additional tests cover parameter submission and workspace retry.

Test-first evidence: the adapted tests against main initially returned 12 failures and 2 passes (including one fixture adaptation error corrected during the port). After implementation, `npm test -- src/app/simulation/page.test.tsx` passed 16 tests. `npm test -- src/app/simulation/page.test.tsx src/hooks/useSessionAccess.test.tsx src/config/moduleRegistry.test.ts` passed 28 tests across three files. `npm run tsc` passed. `npm run lint` passed with three existing Stock Smart image warnings. `git diff --check origin/main` passed for tracked changes. The Vite runner printed its existing native config loader warning. Full suite and browser verification were not run by the worker.

Source diff versus origin/main: page +452/-1050, tests +223/-323 (2,048 authored source/test lines). Including the initial 34-line task record, native assessment counted 2,082 changed lines across exactly three paths. The approved size exception is retained; no source formatting or test removal was used to reduce review size.

Parent verification: reran page/auth/registry tests successfully, 28/28 across three files; staged diff whitespace check passed. Native assessment returned `medium`, `under_budget`; effective RDD mode remains off, so no native review was started. An independent read-only verifier found no severe candidate-caused compatibility blocker, confirmed the three-path scope and main base, and inspected route caching, stale-response protection, submission shape, auth permissions, and retained adapter contract tests.

Isolated browser check: launched a separate frontend on port 3003 against the existing local demo API on 3002 without restarting the original frontend on 3000. Verified the accepted Spanish workspace, absent banner, surplus switch, populated records, accessible detail modal with sourced fields and focus, Escape close, two-record comparison modal with retrieved values and explicit tie, and comparison focus. The console had no errors; inspected XHRs were GET requests only under `/simulation/demo/*`. No database writes or production endpoint calls were made for this check. Functional create/stock/empty/retry/pagination cases are covered by the focused tests; the full suite was not rerun.

Publication confirmed: source work-unit commit `d084f8f` was pushed to `origin/feat/simulation-api-workspace`; PR https://github.com/KentaSoftware/gestion-web-gz/pull/19 links approved issue https://github.com/KentaSoftware/gestion-web-gz/issues/18. GitHub confirmed main as base, exactly three changed paths, one `type:feature` label, and `size:exception`. Initial remote checks: Vercel deployment pending; Vercel Preview Comments successful. No merge or backend publication was performed. The original development branch remains unchanged.

Next step: await Vercel deployment and human review of PR #19. Local focused checks passed; full-suite and production-build limitations remain disclosed in the PR. The parent will push this documentation-only publication receipt without changing the verified source candidate.
