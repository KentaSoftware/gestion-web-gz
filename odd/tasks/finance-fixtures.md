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

## Progress
Started on `fix/finance-build-iterator`; user explicitly requested demo mode be true and visually unlabeled. The switch is `demo` in `src/app/finance/financeDemo.ts`. Demo date ranges are limited to 366 days; actions and real service requests are blocked in demo mode. Browser rendering, live backend integration and the full production build were not run; the build was avoided while the development server was active. RDD is disabled; unavailable risk assessment treated as high.
