# Confirm Coordinates During Client Creation

## Objective
Remove the unfinished Places autocomplete and allow an authorized user to create a client and then confirm its manual coordinates without duplicate creation on failure.

## Constraints
- Preserve the existing independent location-confirmation permission and manual provenance; no fabricated provider metadata.
- Handle create-success/confirmation-failure, retry and conflicts without losing saved identity or duplicating clients.
- Do not implicitly confirm unselected coordinates or discard unsaved fields; preserve existing edit behavior unless safely supported.
- Work only in the original web repository; no real client creation, database writes, external calls, or publication during testing.
- Preserve unrelated `odd/tasks/sales-route-integration.md`. Delivery strategy: one branch with the user-approved size exception.

## Tasks
- [x] CMC-1: Remove the abandoned Places autocomplete implementation and add an independently permission-gated create-then-confirm action with safe retry. Route: delegated direct; multi-file UI, service and tests. Focused mocked tests: 60 passed; typecheck and lint passed with existing warnings. Independent verification and parent test rerun passed.

## Progress
Started on `feat/client-management`; the uncommitted Places integration was removed. Local recovery and Web Locks do not guarantee cross-device idempotency, or protect against cleared browser storage. If persisting a newly created ID fails, client-side navigation can still lose its in-memory value; an unresolved recovery record remains and blocks another create until acknowledged. Web Locks require a supported secure context. Live browser, multi-tab and database integration were not verified. RDD is disabled; risk assessment unavailable, treated as high.
