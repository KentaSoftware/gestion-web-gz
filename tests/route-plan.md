### E2E Tests: Route plan acceptance

**Suite ID:** `T-F.7/T-F.8`
**Feature:** Canonical `/route` planning flow: candidate review, blocked reasons, preview fallback and saved-plan navigation.

---

## Test Case: `ROUTE-E2E-001` - Operator reviews candidates, previews with map fallback and opens the saved plan

**Priority:** `critical`

**Tags:**
- type → @e2e
- feature → @route

**Description/Objective:** Drive the full `/route` journey against mocked APIs: load candidates, review eligible and blocked destinations, preview a route that reports `MAP_UNAVAILABLE`, and open the resulting immutable snapshot. No live backend, routing provider or Google Maps call is made.

**Preconditions:**
- Dev server reachable at `http://127.0.0.1:3000` (Playwright `webServer`).
- Authenticated session seeded with no route-specific permissions; authentication is required but route-flow access is not permission-gated.
- Session seeded in `localStorage.user` before app load: token present, `role.permissions = []`.
- `page.route()` intercepts `deliveryZone` and `routePlan*` requests regardless of `NEXT_PUBLIC_DB_HOST`:
  - `GET /deliveryZone` → one active zone.
  - `GET /routePlan/candidates` → one eligible and one blocked destination.
  - `POST /routePlan/preview` → one-stop preview with `MAP_UNAVAILABLE`, an unknown warning and an unknown factor.
  - `POST /routePlan` and `GET /routePlan/:id` → the same immutable snapshot.

**Flow Steps:**
1. Navigate to `/route` with the seeded session.
2. Assert the authorized shell ("Rutas" and "Planificación de rutas").
3. Fill the service date, select "Zona Norte" and load candidates.
4. Review eligible and blocked sections.
5. Select the eligible sale and calculate the route.
6. Save the plan.

**Expected Result:**
- Eligible section shows `Destinos elegibles (1)`; blocked section shows `Destinos bloqueados (1)`.
- Stable blocked reason renders its label; the unknown reason renders its raw code.
- Preview shows `Recorrido propuesto` and `3,5 km`, without any map heading.
- Map fallback sentence is visible; unknown warning and factor codes render raw.
- After save, the app navigates to `/route/<planId>` and renders `Plan de ruta guardado` / `Detalle del recorrido` with the ordered stop list.

**Key verification points:**
- Stable and unknown blocked reasons are both visible.
- `MAP_UNAVAILABLE` is non-terminal: metrics and the ordered stop list remain.
- Unknown warning/factor codes are never hidden.
- Saved-plan navigation reaches the snapshot detail, not a recalculation.

### Notes:
- `MAP_UNAVAILABLE` is asserted on both preview and snapshot so `RouteMap` is never mounted and no Google Maps script is requested.
- Session seeding uses `page.addInitScript`, so no credentials or login form submission are required.
