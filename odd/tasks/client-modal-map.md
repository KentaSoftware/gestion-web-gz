# Expand Client Creation Map

## Objective
Use 95% of the available viewport height for the client creation modal and maximize the usable map area, initially centered on Tucumán.

## Scope and constraints
- Preserve edit behavior and other map picker users; retain scrolling, controls and accessibility on small screens.
- Existing coordinates take precedence; an initial map center must not select or save coordinates.
- Work on the existing `feat/client-management` branch; preserve `odd/tasks/sales-route-integration.md` and do not publish.
- Delivery strategy: ask-on-risk; forecast fewer than 400 authored lines.

## Tasks
- [x] CMM-1: Adjust creation modal and configure map sizing and default center. Route: delegated direct; multi-file UI and tests. Focused tests: 23 passed; typecheck and lint passed with existing warnings. Independent verification and parent test rerun passed.

## Progress and next step
Started from Web commit `71140b4`; no live browser verification has been performed. RDD is disabled; risk assessment was unavailable and treated as high. Initial center is approximately `-26.9, -65.3`, zoom 8; it is not submitted as a selected location. Small-screen visual layout remains unverified.
