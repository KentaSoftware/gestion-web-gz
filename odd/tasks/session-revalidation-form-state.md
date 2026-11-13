# Preserve Form State During Session Revalidation

## Objective
Prevent background session revalidation from unmounting authenticated screens and losing unsaved sale data.

## Scope and constraints
- Preserve initial authentication checks, fail-closed rejection, permission updates, and protection against stale requests and token changes.
- Work in the original web repository; do not create worktrees, contact the database, create sales, or publish without authorization.
- Preserve the unrelated untracked `odd/tasks/sales-route-integration.md`.
- Delivery strategy: ask-on-risk; forecast fewer than 400 authored changed lines.

## Tasks
- [x] SRF-1: Separate same-token background revalidation from initial hydration, preserving mounted screens while permissions remain verified. Route: delegated direct; trigger: security-sensitive shared state and multiple tests. Mocked focused suite: 25 passing; typecheck and lint passed, with three existing image warnings. Independent review identified test gaps that were subsequently addressed. Previously verified permissions remain usable while the same-token request is pending; revocations apply on resolution.

## Progress and next step
Branch `feat/sale-client-browse` starts at `543e76b`. The exact trigger for all reported focused-window clicks remains unverified; avoid claiming this fix resolves every possible reload.

RDD is disabled for this clone; assessment was unassessable due to untracked inventory and treated as high risk. Independent verification and a parent test rerun passed. No live browser integration or full suite was run. No push or PR is authorized.

Work-unit commit: `1136f30`. Next: reproduce the reported focused-window click in the running application to identify any separate trigger.
