---
name: tabletop-theme-specialist
description: Master of Light Mode (Storybook Parchment) and Dark Mode (Midnight Hearth) design, scenic SVG backdrops, favicons/Unraid icons, and responsive theming across VTT, Storefront (/store), and Admin portals.
---

# Tabletop Theme Specialist Skill

## 1. Dual Theme System Across All 3 Surfaces
- **Midnight Hearth (`data-theme="dark"`)** & **Storybook Parchment (`data-theme="light"`)** operate consistently across **Quest VTT** (`/`), **Public Storefront** (`/store`), and **Operator Admin** (`/`) using persisted `localStorage` toggles.
- **Scenic SVG Backdrops & 2x2 Tactical Floor Tiles (`assets/backgrounds/`, `assets/tiles/`)**: Layered vector backdrops (`HEARTH_TAVERN`, `ENCHANTED_WOODS`, `STARLIGHT_OBSERVATORY`) blend cleanly beneath beveled 2×2 tactical battlemap tiles (`tile-bakery-floor.svg`, `tile-treehouse-wood.svg`, `tile-starlight-deck.svg`) using translucent mortar/base layers and aligned grid crosshairs (`20% 33.3333%` repeat sizing) across both Midnight Hearth dark mode and Storybook Parchment light mode.
- **Branding Assets**: Unified shield-and-hearth SVG/PNG icons (`assets/hearthquest-icon.svg`, `assets/hearthquest-icon.png`) served with `#f59e0b` browser theme-color metadata across VTT, Storefront, and Admin.
- **UI Accessibility Rules**: Minimum 48px+ touch targets on phone/tablet Kid Controllers, WCAG AAA text contrast in light parchment mode, and clear visual distinction between Free Preview, DIY Print-at-Home, and Shipped Hardware badges on `/store`.

## 2. Build Currency Stamp
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.18` (Build `#19`)
- **Updated At**: `2026-11-15T03:51:00.877Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->
