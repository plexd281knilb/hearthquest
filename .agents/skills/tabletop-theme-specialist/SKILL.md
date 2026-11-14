---
name: tabletop-theme-specialist
description: Master of Light Mode (Storybook Parchment) and Dark Mode (Midnight Hearth) design, high-contrast kid-friendly accessibility, and responsive 3-screen theming for HearthQuest.
---

# Tabletop Theme Specialist Skill

## 1. Visual Theme Philosophy
HearthQuest supports two primary visual themes engineered for family play across bright daytime living rooms and evening theater sessions:

### 1.1 Dark Mode ("Midnight Hearth")
- **Palette**: Deep slate and indigo (`#090d16` to `#1e1b4b`), luminous warm amber (`#f59e0b` / `#fbbf24`), rich emerald accents.
- **Atmosphere**: Cozy fireside tavern, immersive nighttime tabletop, zero light pollution when projecting to living room TV.
- **Token Rendering**: Glow borders, high contrast badges against dark grid tiles.

### 1.2 Light Mode ("Storybook Parchment")
- **Palette**: Warm ivory parchment (`#fdfbf7` to `#f4ede4`), warm saddle leather borders (`#b45309` / `#78350f`), deep espresso text (`#1c1917` / `#292524`), creamy gold badges (`#fef3c7`).
- **Atmosphere**: Illustrated fairytale storybook, bright daylight family kitchen table, high-contrast sunlight readability for tablets.
- **Token Rendering**: Soft drop shadows, distinct colored rings, crisp dark label text.

## 2. Implementation Rules
1. **Persistent Theme State**:
   - Persist theme in `localStorage.getItem("hearthquest_theme")` (`"dark"` or `"light"`).
   - Apply `data-theme="light"` or `data-theme="dark"` on the `<html>` or `<body>` element.
   - Provide a persistent toggle button (`☀️ Light Mode` / `🌙 Dark Mode`) in the header of GM View, TV View, Kid Controller, and Admin portal.
2. **Contrast & Touch Accessibility**:
   - Ensure WCAG AAA contrast ratio for kids' readable text.
   - Touch targets must remain 48px+ on phones and 64px+ on kids' tablets regardless of active theme.
   - Grid lines must remain visible in both modes (semi-transparent white/amber in dark mode; warm saddle tan in light mode).
