# Golozur design tokens

This document is the readable token contract for UI migration work in `gestion-web-gz`.

## Source of truth

Canonical token files live outside this app repository:

- `C:\Users\Rodrigo\Documents\Projects\Distribuidora\docs\design-system\tokens-light-new.json`
- `C:\Users\Rodrigo\Documents\Projects\Distribuidora\docs\design-system\tokens-dark-new.json`
- `C:\Users\Rodrigo\Documents\Projects\Distribuidora\docs\design-system\theme-light-new.css`
- `C:\Users\Rodrigo\Documents\Projects\Distribuidora\docs\design-system\theme-dark-new.css`

If this Markdown file disagrees with the JSON or CSS token files, the JSON/CSS token files win.

## Token groups

| Group | Purpose | Examples |
|---|---|---|
| Color | Backgrounds, surfaces, text, brand, borders, states, overlay, charts | `color.background.canvas`, `color.brand.primary`, `color.state.error` |
| Font | Heading, body, mono families | `font.heading`, `font.body`, `font.mono` |
| Typography | Composite type roles and exported flat CSS scale | `typography.body`, `typography.heading`, `--text-label` |
| Spacing | 4px-based spacing scale | `spacing.4` through `spacing.128` |
| Radius | Corner radius scale | `radius.sm`, `radius.md`, `radius.xl`, `radius.pill` |
| Border | Border width scale | `border.width.thin`, `border.width.thick` |
| Shadow | Elevation and focus ring shadows | `shadow.sm`, `shadow.md`, `shadow.focus-ring` |
| Layout | Containers, breakpoints, page rhythm | `layout.container.2xl`, `layout.breakpoint.md`, `layout.section-gap` |
| Control | Control heights, horizontal padding, density | `control.height.md`, `control.padding-x.md` |
| State | Disabled opacity, durations, easing | `state.duration.base`, `state.easing.standard` |
| Layering | Stacking order | `z-index.dropdown`, `z-index.modal`, `z-index.toast` |

## Light theme core values

| Role | Token | Value |
|---|---|---|
| Page canvas | `color.background.canvas` | `#F7F9FC` |
| Subtle background | `color.background.subtle` | `#EEF3FA` |
| Surface base | `color.surface.base` | `#FFFFFF` |
| Surface raised | `color.surface.raised` | `#FFFFFF` |
| Primary text | `color.text.primary` | `#1F2A3D` |
| Secondary text | `color.text.secondary` | `#4F5D75` |
| Muted text | `color.text.muted` | `#6E7E99` |
| Brand primary | `color.brand.primary` | `#3E68A4` |
| Brand accent | `color.brand.accent` | `#F49B49` |
| Focus | `color.state.focus` | `#4F7AB5` |
| Overlay scrim | `color.overlay.scrim` | `rgba(15, 23, 36, 0.5)` |

## Dark theme core values

| Role | Token | Value |
|---|---|---|
| Page canvas | `color.background.canvas` | `#0F1724` |
| Subtle background | `color.background.subtle` | `#121C2B` |
| Surface base | `color.surface.base` | `#172235` |
| Surface raised | `color.surface.raised` | `#1E2C44` |
| Primary text | `color.text.primary` | `#EAF0FA` |
| Secondary text | `color.text.secondary` | `#B8C4D9` |
| Muted text | `color.text.muted` | `#93A2BC` |
| Brand primary | `color.brand.primary` | `#6E90C2` |
| Brand accent | `color.brand.accent` | `#F4A65B` |
| Focus | `color.state.focus` | `#9EB7DC` |
| Overlay scrim | `color.overlay.scrim` | `rgba(10, 15, 24, 0.72)` |

## Shared structural scale

| Category | Values |
|---|---|
| Fonts | Heading `Libre Baskerville`, body `Inter`, mono `Fira Code` |
| Type sizes | `12px`, `14px`, `16px`, `20px`, `28px`, `36px`, `56px` |
| Spacing | `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`, `80`, `96`, `128` |
| Radius | `0`, `4`, `8`, `12`, `16`, `999` |
| Controls | `32px`, `40px`, `48px` heights |
| Motion | `120ms`, `180ms`, `240ms` with tokenized cubic-bezier easing |
| Z-index | Dropdown `100`, sticky `200`, overlay `300`, modal `400`, toast `500` |

## Migration rules

- Use semantic tokens by role, not raw visual guesses.
- Do not add new tokens during shadcn migration unless the gap is documented and approved.
- Do not use hardcoded hex colors in migrated component `className` values.
- Do not use `var()` inside Tailwind class names. Use generated semantic utilities such as `bg-brand-primary`, `text-text-primary`, and `border-border-subtle`.
- CSS variables are allowed in non-class contexts such as chart props, style props, CSS files, print-specific rules, or temporary legacy adapters.
- Use chart tokens for charts. Do not substitute brand tokens directly for data visualization series unless explicitly approved.
- Print layouts may preserve physical units such as `mm` when required for PDF or print fidelity.
