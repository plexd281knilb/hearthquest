---
name: tabletop-theme-specialist
description: Master of Light Mode (Storybook Parchment) and Dark Mode (Midnight Hearth) design, scenic SVG backdrops, favicons/Unraid icons, and responsive theming across VTT, Storefront (/store), and Admin portals.
---

# Tabletop Theme Specialist Skill

## 1. Dual Theme System Across All 3 Surfaces
- **Midnight Hearth (`data-theme="dark"`)** & **Storybook Parchment (`data-theme="light"`)** operate consistently across **Quest VTT** (main tabletop UI, login gate, and Google setup page), **Public Storefront** (`/store`), and **Operator Admin** (`/`) using persisted `localStorage` toggles with full accessible contrast overrides for amber/emerald/purple/indigo/sky/stone text and inner containers in both modes.
- **Static Regional Maps & Stage-Setting Artwork (`assets/maps/`, `assets/backgrounds/`, `resolveAreaMapAsset`, `resolveSceneBackdropAsset`)**: Pre-combat overhead village/area maps (`map-oakhaven-bakery-quarter.svg`, `map-silverleaf-canopy.svg`, `map-starwatch-bastion.svg`) pair with scenic SVG backdrops (`HEARTH_TAVERN`, `ENCHANTED_WOODS`, `STARLIGHT_OBSERVATORY`) to set the mood when reading aloud before combat begins (`#stage-art-showcase`, `#rp-modal-art-strip`, `#walkthrough-art-strip`, `#stage-art-lightbox`), while tactical `2x2` floor tiles (`assets/tiles/`) blend over backdrops on the battlemap grid (`20% 33.3333%` sizing).
- **Branding Assets**: Unified shield-and-hearth SVG/PNG icons (`assets/hearthquest-icon.svg`, `assets/hearthquest-icon.png`) served with `#f59e0b` browser theme-color metadata across VTT, Storefront, and Admin.
- **UI Accessibility Rules**: Minimum 48px+ touch targets on phone/tablet Kid Controllers, WCAG AAA text contrast in light parchment mode, and clear visual distinction between Free Preview, DIY Print-at-Home, and Shipped Hardware badges on `/store`.

## 2. Build Currency Stamp
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.22` (Build `#23`)
- **Updated At**: `2026-11-15T18:46:51.708Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->
