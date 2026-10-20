# Product

## Register

product

## Users

Internal Golozur operators and administrators who manage daily commercial operations from desktop and mobile contexts. They work with sales, purchases, products, expenses, cashflow, reports, dashboards, printing, and real-time operational updates.

Their job is to move through transactional work quickly and confidently: find records, create or edit entries, review totals, print documents, monitor indicators, and keep product and financial information current without losing context.

## Product Purpose

Gestión Web GZ is the web management panel for the Golozur ecosystem. It centralizes sales, purchases, products, expenses, reports, dashboards, authentication, real-time updates, and API-connected workflows in one responsive interface.

Success means operators can complete frequent business tasks with low friction, clear feedback, consistent controls, reliable data visibility, and no unnecessary visual noise. The UI should make operational status, available actions, and record state immediately understandable.

## Brand Personality

Operational, trustworthy, and precise.

The product should feel like a dependable back-office tool rather than a marketing surface. Visual decisions should support clarity, speed, and confidence. Refinement is welcome when it improves hierarchy, accessibility, or maintainability, but decorative novelty should not compete with task completion.

## Anti-references

- Do not make the product feel like a generic SaaS landing page or marketing dashboard.
- Do not use decorative gradients, glass effects, excessive animation, or visual patterns that reduce data clarity.
- Do not introduce UI changes that hide, remove, reorder, or visually de-prioritize operational data without explicit approval.
- Do not replace familiar task affordances with clever custom interactions.
- Do not create a disconnected shadcn look that ignores the existing Golozur token system.
- Do not add new tokens, component variants, or visual states without a documented need and approval path.

## Design Principles

1. **Preserve operational truth.** Every visible data point, action, and status that users rely on must remain available and understandable during UI changes.
2. **Consistency before novelty.** Shared primitives, states, spacing, and interaction feedback should behave the same across sales, purchases, products, expenses, and dashboards.
3. **Migrate incrementally.** Component modernization should happen in reviewable phases, starting with low-risk primitives before complex transactional screens.
4. **Respect the existing design system.** Tokens, typography, colors, spacing, radius, shadows, motion, and z-index rules from the current design system remain authoritative unless a change is explicitly approved.
5. **Make failure states explicit.** Loading, empty, error, disabled, focus, and permission states should be designed as first-class product states, not afterthoughts.

## Accessibility & Inclusion

Target a pragmatic WCAG 2.1 AA baseline for product UI work.

Minimum expectations:

- Keyboard-accessible controls and dialogs.
- Visible focus states aligned with the design-system focus token.
- Semantic labels for icon-only actions.
- Sufficient contrast for text, borders, states, and charts.
- Loading, empty, error, and disabled states that do not rely on color alone.
- Motion kept functional and short, with no decorative sequences that delay task completion.
- Responsive behavior that preserves the same task capability on desktop and mobile.
