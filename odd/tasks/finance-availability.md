# Enable Finance Without Environment Flag

## Objective
Make the Finance module available without requiring an environment variable while preserving existing authorization and module gating.

## Constraints
- Preserve `READ_CASHFLOW`, session checks and the existing finance gate.
- Preserve the uncommitted finance build correction and the unrelated `odd/tasks/sales-route-integration.md` file.
- No remote operations or real financial data mutations. Delivery strategy: ask-on-risk; forecast under 400 authored lines.

## Tasks
- [x] FIN-1: Remove the finance-only flag requirement and verify navigation and direct-route access for authorized and unauthorized users. Route: delegated direct; shared registry and test coverage. Focused suite: 25 passed; typecheck, lint and production build passed with existing warnings. Independent verification and parent test rerun completed.

## Progress
Branch `fix/finance-build-iterator` also includes the production-build correction. Finance permission and the existing module gate remain in place. Live browser and backend authorization were not independently verified. RDD is disabled; failed risk assessment was treated as high.
