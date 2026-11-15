# Limit Visible Catalog Alerts

## Objective
Size each expanded catalog severity list to approximately its first four alert rows and allow continuous scrolling when additional alerts exist.

## Constraints
- Preserve each section's existing initial collapsed state, independent expand/collapse behavior and all alerts.
- Support variable-height text and responsive layouts without truncating alert content; maintain keyboard access to scrollable content.
- Use the original web repository and preserve unrelated untracked files; no database writes, remote publication or worktrees.
- Delivery strategy: ask-on-risk; forecast fewer than 400 authored lines.

## Tasks
- [x] CAS-1: Size each expanded alert list to its first four rows and provide continuous accessible scrolling for additional rows. Route: delegated direct; UI and tests. Focused suite: 29 passed; TypeScript and lint passed with existing warnings. Independent verification and parent test rerun passed.
- [x] CAS-2: Refine quick stock lookup: hide suggestions on selection, clear the query, focus and visually separate product details, and remove detail action buttons without changing actions elsewhere. Route: delegated direct; UI and tests. Focused suite: 35 passed; typecheck and lint passed with existing warnings. Independent verification and parent rerun passed.
- [x] CAS-3: Remove product and category filters only from catalog alerts, retaining severity filtering and unrelated page filters. Route: delegated direct; UI and regression tests. Focused suite: 39 passed; typecheck and lint passed with existing warnings. Independent verification and parent rerun passed.
- [x] CAS-4: Remove the category search from the product list while retaining product search and severity filtering. Route: delegated direct; UI and regression tests. Focused suite: 39 passed; typecheck and lint passed with existing warnings. Independent verification and parent rerun passed.

## Progress
Started from `main` in branch `fix/catalog-alert-scroll`. User explicitly rejected pagination. Because alert rows have variable heights and scrolling is continuous, later positions may show part of an extra row or more than four shorter rows. Real-browser geometry and keyboard scrolling remain unverified. RDD is disabled; failed risk assessment was treated as high.

Work-unit commit: `d1a65c9`. Next: visually verify continuous scrolling with long alerts on desktop and mobile.

User requested additional quick lookup refinements; preceding suggestion-dismissal changes are included. Focus transfers only after the selected detail loads, with stale requests and subsequent user navigation guarded. Live-browser and screen-reader verification remain unperformed.

CAS-2 work-unit commit: `83a1d4f`. Next: visually verify quick-search focus and spacing in the browser.

User requested removing the product and category filters from the catalog alerts section while retaining severity.

The relocated filters continue to affect the product overview. Existing shared overview loading can temporarily hide alerts during a product-filter refresh; this was not introduced or changed by CAS-3. Live browser behavior remains unverified.

CAS-3 work-unit commit: `e6c119e`. Next: review the placement of product filters in the browser.

User subsequently requested removing the category search from the product list as well.

The category table column and category matching in quick lookup remain. Browser rendering was not verified; RDD is disabled and unavailable risk assessment was treated as high.

CAS-4 work-unit commit: `d14a256`. Next: visually verify the product search width in the browser.
