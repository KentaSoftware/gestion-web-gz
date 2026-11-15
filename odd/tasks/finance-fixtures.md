# Finance Fixture Mode

## Objective
Display hardcoded financial dashboard data while a source-code `demo` constant is true, and preserve the existing live behavior when false.

## Scope and constraints
- Provide coherent sample KPIs, historical cash flow, movements, expense distribution and actual-versus-projected values.
- The user requested no visible demo label. Do not silently substitute fixtures on live API errors.
- While enabled, prevent financial writes, rule updates, PDF export and navigation to real movements from the fixture dashboard; no real financial mutations during tests.
- Preserve the existing branch and unrelated untracked files. Delivery strategy ask-on-risk; forecast 250–500 authored lines.

## Tasks
- [x] FFM-1: Implement typed finance fixtures, source switch and guarded read-only behavior; retain live path. Route: delegated direct; multiple components and tests. Focused suite: 11 passed; typecheck and lint passed with existing warnings. Independent review and parent test rerun completed.
- [x] FFM-2: Rename the fixture opportunity to Capital ocioso and add fictional sales and low-stock purchase recommendations. Route: delegated direct; fixture, display and tests. Focused suite: 12 passed; typecheck and lint passed with existing warnings. Live mode is unchanged and no real transactions are performed.
- [x] FFM-3: Remove the technical rules version label and restore the update, export and new movement buttons visually. Route: delegated direct; multiple components and tests. Focused suite: 6 passed; typecheck and lint passed with existing warnings. Real operations remain disabled in fixture mode; live behavior remains unchanged.
- [x] FFM-4: Keep the three action buttons enabled in fixture mode but make activation a no-op; preserve live behavior and prevent real requests. Route: delegated direct; multiple components and tests. Focused suite: 6 passed; typecheck and lint passed with existing warnings. Independent verification and parent rerun passed.

## Progress
Started on `fix/finance-build-iterator`; user explicitly requested demo mode be true and visually unlabeled. The switch is `demo` in `src/app/finance/financeDemo.ts`. Demo date ranges are limited to 366 days; actions and real service requests are blocked in demo mode. Browser rendering, live backend integration and the full production build were not run; the build was avoided while the development server was active. RDD is disabled; unavailable risk assessment treated as high.

Work-unit commit: `01e8ba1`. Next: visually check the dashboard and run a production build after stopping the development server.

User requested additional fictional recommendation cards in the existing fixture mode; live product-ranking recommendations are not provided by the finance API.

Sales and stock figures in the recommendation cards are fixed fictional values, with dates relative to the selected range end. They are not labeled as demo per user request and could be mistaken for real business data. Live browser and production build remain unverified; no build was run while the development server was active.

FFM-2 work-unit commit: `5394cb2`. Next: visually verify the recommendations and run the production build after the development server is stopped.

FFM-3 work-unit commit: `3ec2301`. The three restored controls are visible but disabled while fixture mode is active; live mode keeps their real behavior. No production build was run with the development server active.

FFM-4 work-unit commit: `a58083f`. Superseding FFM-3, the buttons are now enabled but intentionally do nothing in fixture mode. Live behavior remains unchanged.
