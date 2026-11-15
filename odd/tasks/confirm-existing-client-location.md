# Confirm Existing Client Location

## Objective
Allow authorized users to confirm saved manual client coordinates from the client edit form.

## Scope and constraints
- Preserve separate `update_client` and `confirm_client_location` authorization and existing creation flow.
- Do not confirm an unsaved location or discard other unsaved edits; require saving changes first when needed.
- Use fresh snapshots and explicit conflict review; never silently overwrite concurrent location changes.
- No real client mutations, database calls, network publication or worktrees during implementation and tests. Preserve unrelated untracked files.
- Delivery strategy: ask-on-risk; forecast fewer than 400 authored lines.

## Tasks
- [x] CEL-1: Add saved-client manual location confirmation in the edit form with permission, validation and conflict handling. Route: delegated direct; multi-file UI and tests. Focused tests: 71 passing; typecheck and lint passed with existing warnings. Independent verification and parent rerun completed.

## Progress
Started from `feat/client-management`; API already exposes the required confirmation and snapshot endpoints. Read-only location review is available to confirmation-only users and when zones cannot load. Live browser and database integration remain unverified. RDD is disabled; failed risk assessment was treated as high.

Work-unit commit: `fd06c2f`. Next: verify the confirmation flow in the running application with an authorized user.
