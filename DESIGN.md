# Design System (Unified Light + Dark Reference)

## Dark Theme Design System

Dark theme reference for the current token source:

- `tokens-dark-new.json`
- `theme-dark-new.css`

Use this file as the implementation guide for the dark theme. If a value here disagrees with the token JSON or `@theme` CSS, the token files win.

### Quick Path

1. Import `theme-dark-new.css` into the dark app shell or theme entrypoint.
2. Use the generated CSS variables, not hard-coded color values.
3. Keep component sizing, spacing, motion, and layering aligned with the shared non-color tokens.

### Token Groups

| Group | What it covers | Main tokens |
|---|---|---|
| Color | Backgrounds, surfaces, text, brand, state, charts | `--color-*` |
| Font | Font families for heading, body, mono | `--font-*` |
| Typography | Size, leading, tracking scale exposed in CSS | `--text-*`, `--leading-*`, `--tracking-*` |
| Spacing | 4px-based spacing scale | `--spacing-*` |
| Radius | Corner radius scale | `--radius-*` |
| Border | Border widths | `--border-width-*` |
| Shadow | Elevation and focus ring shadows | `--shadow-*` |
| Layout | Containers, breakpoints, section rhythm | `--container-*`, `--breakpoint-*`, `--section-gap`, `--element-gap` |
| Control | Control heights, horizontal padding, density | `--control-*` |
| State | Opacity, duration, easing | `--opacity-*`, `--duration-*`, `--ease-*` |
| Layering | Z-index scale | `--z-index-*` |

### Theme Behavior

This theme uses a low-luminance canvas with lighter surfaces and cool blue/orange accents.

| Role | Token | Value |
|---|---|---|
| Page canvas | `--color-background-canvas` | `#0f1724` |
| Alternate section | `--color-background-subtle` | `#121c2b` |
| Default surface | `--color-surface-base` | `#172235` |
| Raised surface | `--color-surface-raised` | `#1e2c44` |
| Inverted surface | `--color-surface-inverted` | `#eaf0fa` |
| Primary text | `--color-text-primary` | `#eaf0fa` |
| Secondary text | `--color-text-secondary` | `#b8c4d9` |
| Muted text | `--color-text-muted` | `#93a2bc` |
| Brand primary | `--color-brand-primary` | `#6e90c2` |
| Brand accent | `--color-brand-accent` | `#f4a65b` |
| Focus | `--color-state-focus` | `#9eb7dc` |
| Overlay scrim | `--color-overlay-scrim` | `rgba(10, 15, 24, 0.72)` |

Implementation notes:

- Use `surface.base` for cards and panels.
- Use `surface.raised` only for dialogs, popovers, tooltips, and overlays.
- Use `surface.inverted` with `text.inverse` only for high-emphasis reversed blocks.
- `brand.accent` and `state.warning` intentionally share the same value: `#f4a65b`.
- Charts use the same visual family as the UI tokens, so chart colors should come from `--color-chart-*`, not from brand tokens directly.

### Shared Scale

These tokens are shared structurally with the light theme. Keep component behavior consistent across themes.

#### Typography

- Heading font: `Libre Baskerville`
- Body font: `Inter`
- Mono font: `Fira Code`
- Key sizes: `12px`, `14px`, `16px`, `20px`, `28px`, `36px`, `56px`
- Key line heights: `1.4`, `1.5`, `1.35`, `1.2`, `1.15`, `1.08`

Important: the token JSON contains composite typography tokens such as `label`, `body-strong`, and `code`, but `theme-dark-new.css` exposes the scale as flat CSS variables for size, leading, and tracking. Font weight stays a component concern.

#### Spacing, Radius, Layout, Motion

- Base spacing unit: `4px`
- Core spacing steps: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`
- Radius scale: `0, 4, 8, 12, 16, 999`
- Section gap: `72px`
- Element gap: `8px`
- Control heights: `32px`, `40px`, `48px`
- Durations: `120ms`, `180ms`, `240ms`
- Layering: dropdown `100`, sticky `200`, overlay `300`, modal `400`, toast `500`

### Usage Conventions

#### Token-to-CSS mapping

| JSON token | CSS variable |
|---|---|
| `color.background.canvas` | `--color-background-canvas` |
| `color.surface.base` | `--color-surface-base` |
| `font.heading` | `--font-heading` |
| `spacing.24` | `--spacing-24` |
| `layout.container.2xl` | `--container-2xl` |
| `state.duration.base` | `--duration-base` |
| `z-index.modal` | `--z-index-modal` |

#### Component conventions

- Page background: `--color-background-canvas`
- Secondary sections: `--color-background-subtle`
- Cards and form containers: `--color-surface-base`
- Dialogs, popovers, dropdown surfaces: `--color-surface-raised`
- Primary copy: `--color-text-primary`
- Metadata, helper text, secondary labels: `--color-text-secondary` or `--color-text-muted`
- Interactive outlines: `--color-border-interactive`
- Focus treatment: combine `--color-state-focus` and `--shadow-focus-ring`
- Chart grid and axis styling: `--color-chart-grid`, `--color-chart-axis`

### Do / Don't

#### Do

- Use semantic variables by role, not raw hex values.
- Keep elevation subtle: `--shadow-sm`, `--shadow-md`, `--shadow-lg`.
- Use `--control-density-compact` only on dense admin surfaces such as tables and toolbars.
- Preserve the serif/sans split: `Libre Baskerville` for headings, `Inter` for UI/body.
- Apply `--color-overlay-scrim` for modal and drawer backdrops.

#### Don't

- Do not use `--color-surface-inverted` as a general card background.
- Do not mix chart colors with arbitrary product accents.
- Do not invent intermediate spacing or radius values when a token exists.
- Do not hard-code transition timings outside `--duration-*` and `--ease-*`.
- Do not rely on opacity alone for disabled or secondary states; pair opacity tokens with semantic color roles.

### Migration Notes

- This file replaces older dark-theme documentation that referenced token names and values no longer present in the current source.
- The current source of truth is the `*-new` token JSON and CSS files.
- Color naming is now semantic and hierarchical: `background`, `surface`, `text`, `brand`, `border`, `state`, `overlay`, `chart`.
- CSS variables are flattened from the JSON path. Prefer the flattened CSS name in implementation.
- Typography in CSS is intentionally partial: size, leading, and tracking are exported; full composite typography objects remain defined in JSON.

### Quick Verification Checklist

- [ ] `DESIGN-dark.md` matches `tokens-dark-new.json` for all documented color values.
- [ ] `DESIGN-dark.md` matches `theme-dark-new.css` variable names and categories.
- [ ] Dark screens use `--color-background-canvas` for app/page background.
- [ ] Cards use `--color-surface-base`; overlays use `--color-surface-raised`.
- [ ] Focus states use `--color-state-focus` and/or `--shadow-focus-ring`.
- [ ] Spacing, radius, motion, and z-index values come from tokens, not component-local constants.

---

## Light Theme Design System

Light theme reference for the current token source:

- `tokens-light-new.json`
- `theme-light-new.css`

Use this file as the implementation guide for the light theme. If a value here disagrees with the token JSON or `@theme` CSS, the token files win.

### Quick Path

1. Import `theme-light-new.css` into the light app shell or theme entrypoint.
2. Use semantic CSS variables from `@theme` instead of raw values.
3. Keep layout, spacing, control sizing, motion, and layering aligned with the shared structural tokens.

### Token Groups

| Group | What it covers | Main tokens |
|---|---|---|
| Color | Backgrounds, surfaces, text, brand, state, charts | `--color-*` |
| Font | Font families for heading, body, mono | `--font-*` |
| Typography | Size, leading, tracking scale exposed in CSS | `--text-*`, `--leading-*`, `--tracking-*` |
| Spacing | 4px-based spacing scale | `--spacing-*` |
| Radius | Corner radius scale | `--radius-*` |
| Border | Border widths | `--border-width-*` |
| Shadow | Elevation and focus ring shadows | `--shadow-*` |
| Layout | Containers, breakpoints, section rhythm | `--container-*`, `--breakpoint-*`, `--section-gap`, `--element-gap` |
| Control | Control heights, horizontal padding, density | `--control-*` |
| State | Opacity, duration, easing | `--opacity-*`, `--duration-*`, `--ease-*` |
| Layering | Z-index scale | `--z-index-*` |

### Theme Behavior

This theme uses a soft light canvas, white surfaces, dark blue-gray text, and a more saturated blue/orange interaction layer.

| Role | Token | Value |
|---|---|---|
| Page canvas | `--color-background-canvas` | `#f7f9fc` |
| Alternate section | `--color-background-subtle` | `#eef3fa` |
| Default surface | `--color-surface-base` | `#ffffff` |
| Raised surface | `--color-surface-raised` | `#ffffff` |
| Inverted surface | `--color-surface-inverted` | `#1f2a3d` |
| Primary text | `--color-text-primary` | `#1f2a3d` |
| Secondary text | `--color-text-secondary` | `#4f5d75` |
| Muted text | `--color-text-muted` | `#6e7e99` |
| Brand primary | `--color-brand-primary` | `#3e68a4` |
| Brand accent | `--color-brand-accent` | `#f49b49` |
| Focus | `--color-state-focus` | `#4f7ab5` |
| Overlay scrim | `--color-overlay-scrim` | `rgba(15, 23, 36, 0.5)` |

Implementation notes:

- `surface.base` and `surface.raised` are both `#ffffff` in the current theme. Depth in light mode comes mostly from borders and shadows, not fill changes.
- Use `surface.inverted` with `text.inverse` for reversed sections, strong badges, or dark CTA blocks.
- `brand.accent` and `state.warning` intentionally share the same value: `#f49b49`.
- Chart tooltip surfaces are white and should stay visually aligned with standard cards.

### Shared Scale

These tokens are structurally shared with the dark theme. Theme switching should change semantic color roles, not component geometry.

#### Typography

- Heading font: `Libre Baskerville`
- Body font: `Inter`
- Mono font: `Fira Code`
- Key sizes: `12px`, `14px`, `16px`, `20px`, `28px`, `36px`, `56px`
- Key line heights: `1.4`, `1.5`, `1.35`, `1.2`, `1.15`, `1.08`

Important: the token JSON contains composite typography tokens such as `label`, `body-strong`, and `code`, but `theme-light-new.css` exports the scale as flat CSS variables for size, leading, and tracking. Font weight stays a component concern.

#### Spacing, Radius, Layout, Motion

- Base spacing unit: `4px`
- Core spacing steps: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`
- Radius scale: `0, 4, 8, 12, 16, 999`
- Section gap: `72px`
- Element gap: `8px`
- Control heights: `32px`, `40px`, `48px`
- Durations: `120ms`, `180ms`, `240ms`
- Layering: dropdown `100`, sticky `200`, overlay `300`, modal `400`, toast `500`

### Usage Conventions

#### Token-to-CSS mapping

| JSON token | CSS variable |
|---|---|
| `color.background.canvas` | `--color-background-canvas` |
| `color.surface.base` | `--color-surface-base` |
| `font.heading` | `--font-heading` |
| `spacing.24` | `--spacing-24` |
| `layout.container.2xl` | `--container-2xl` |
| `state.duration.base` | `--duration-base` |
| `z-index.modal` | `--z-index-modal` |

#### Component conventions

- Page background: `--color-background-canvas`
- Secondary sections: `--color-background-subtle`
- Cards and inputs: `--color-surface-base`
- Menus, popovers, dialogs: `--color-surface-raised`
- Primary text and headings: `--color-text-primary`
- Secondary descriptions and metadata: `--color-text-secondary` or `--color-text-muted`
- Control borders: `--color-border-subtle` or `--color-border-strong`
- Focus treatment: combine `--color-state-focus` and `--shadow-focus-ring`
- Data viz framing: `--color-chart-grid`, `--color-chart-axis`, `--color-chart-tooltip-surface`

### Do / Don't

#### Do

- Use semantic variables by meaning, not by visual guess.
- Use borders and shadows to separate white-on-white surfaces.
- Keep primary actions on `--color-brand-primary`; reserve accent for secondary emphasis and warnings.
- Preserve the serif/sans split: `Libre Baskerville` for headings, `Inter` for UI/body.
- Use the shared motion and density tokens so light and dark modes behave the same.

#### Don't

- Do not fake elevation with arbitrary gray fills when `surface.base`, border, and shadow tokens already define the system.
- Do not use `--color-surface-inverted` for standard content cards.
- Do not introduce custom breakpoints, z-index layers, or control heights outside the token scale.
- Do not hard-code hover and pressed timing outside `--duration-*` and `--ease-*`.
- Do not substitute chart palette values with unrelated brand or marketing colors.

### Migration Notes

- This file replaces older light-theme documentation that described a different visual system.
- The current source of truth is the `*-new` token JSON and CSS files.
- The system now uses semantic token groups instead of bespoke named colors.
- CSS variable names are flattened from the JSON path. Use the flattened variable names in code.
- Typography in CSS is intentionally partial: size, leading, and tracking are exported; composite typography objects remain defined in JSON.
- Light mode now relies on white surfaces plus borders/shadows for separation, because `surface.base` and `surface.raised` are both white.

### Quick Verification Checklist

- [ ] `DESIGN-light.md` matches `tokens-light-new.json` for all documented color values.
- [ ] `DESIGN-light.md` matches `theme-light-new.css` variable names and categories.
- [ ] Light screens use `--color-background-canvas` for page background.
- [ ] Cards use `--color-surface-base`; overlays can use `--color-surface-raised` plus shadow/border separation.
- [ ] Focus states use `--color-state-focus` and/or `--shadow-focus-ring`.
- [ ] Spacing, radius, motion, and z-index values come from tokens, not one-off component constants.
