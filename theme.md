# Golozur theme contract

This document explains how the token files become the active application theme for `gestion-web-gz` and how future shadcn migration work must align to it.

## Source of truth

Theme source files live outside this app repository:

- `C:\Users\Rodrigo\Documents\Projects\Distribuidora\docs\design-system\theme-light-new.css`
- `C:\Users\Rodrigo\Documents\Projects\Distribuidora\docs\design-system\theme-dark-new.css`
- `C:\Users\Rodrigo\Documents\Projects\Distribuidora\docs\design-system\tokens-light-new.json`
- `C:\Users\Rodrigo\Documents\Projects\Distribuidora\docs\design-system\tokens-dark-new.json`

The active app implementation currently mirrors these values in `src/app/globals.css` using Tailwind 4 `@theme` variables and `.dark` overrides.

## Tailwind 4 theme behavior

- The light theme is the default `@theme` block.
- Dark mode is activated by applying `.dark` on `<html>` and overriding CSS custom properties.
- In Tailwind 4, variables such as `--color-background-canvas` generate semantic utilities such as `bg-background-canvas`.
- Use generated semantic classes directly. Do not use arbitrary classes like `bg-[--color-brand-primary]`.

## Theme roles

| Role | Light | Dark | Use |
|---|---:|---:|---|
| Canvas | `#F7F9FC` | `#0F1724` | Page/app background |
| Subtle background | `#EEF3FA` | `#121C2B` | Secondary sections, hover surfaces |
| Surface base | `#FFFFFF` | `#172235` | Cards, panels, forms |
| Surface raised | `#FFFFFF` | `#1E2C44` | Dialogs, popovers, overlays |
| Text primary | `#1F2A3D` | `#EAF0FA` | Main labels, headings, body text |
| Text secondary | `#4F5D75` | `#B8C4D9` | Supporting descriptions, metadata |
| Text muted | `#6E7E99` | `#93A2BC` | Low emphasis labels and placeholders |
| Brand primary | `#3E68A4` | `#6E90C2` | Primary actions, selected navigation, key interactive affordances |
| Brand accent | `#F49B49` | `#F4A65B` | Secondary emphasis and warning-adjacent accent |
| Focus | `#4F7AB5` | `#9EB7DC` | Keyboard focus ring and focus-visible states |
| Overlay scrim | `rgba(15, 23, 36, 0.5)` | `rgba(10, 15, 24, 0.72)` | Modal, drawer, and blocking overlay backdrops |

## Component alignment rules

- Buttons use brand/state tokens for variants, control height tokens for size, radius tokens for shape, and focus tokens for keyboard state.
- Inputs and selects use `surface.base`, text tokens, border tokens, focus tokens, and control sizing tokens.
- Dialogs, popovers, dropdowns, sheets, and tooltips use `surface.raised`, overlay/layering tokens, and focus management rules.
- Tables and dense lists use compact density only when it preserves readability and operational scan speed.
- Charts use `--color-chart-*` tokens through CSS variables in chart library props.
- Print components may keep physical sizing but should use semantic color, typography, and border tokens when safe.

## shadcn alignment rules

- shadcn components must be treated as copied source components that are adapted to the Golozur theme, not as an external style to impose over the product.
- `components.json` should use CSS variables enabled and point to the app global CSS entrypoint.
- shadcn-generated primitives should live under a clear UI layer such as `src/components/ui/*`, but product-facing wrappers may remain under existing component names during migration.
- No shadcn default color, radius, or font scale should override the Golozur semantic token contract without an approved decision.

## Prohibited without approval

- New colors, spacing values, radii, z-index layers, control heights, or motion durations outside the token scale.
- New MUI usage.
- New `styled-components` usage.
- Big-bang replacement of smart-upload, print layouts, or core transactional screens.
- Visual changes that remove visible data, hide primary actions, change business behavior, or alter PDF/print output.
