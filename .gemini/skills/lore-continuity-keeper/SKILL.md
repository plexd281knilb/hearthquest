---
name: lore-continuity-keeper
description: Tracks all canonical campaign plots, bosses, factions, and map zones in SQLite `lore_registry` so future main chapters and procedural level-scaled one-shots never overlap or reuse antagonists or named locations.
---

# Lore & Map Continuity Keeper

## 1. Single Source of Truth (`lore_registry` in SQLite)
- All Core Campaign Arcs (`CAMPAIGN_ARC`), generated One-Shots (`ONE_SHOT`), named maps (`MAP_LAYOUT`), and major antagonists (`VILLAIN`) live in SQLite table `lore_registry` inside `/app/data/hearthquest.db` (`data/.test/test-hearthquest.db` in test mode).
- Exposed in Operator Admin (`GET`/`POST /api/admin/lore`), checked automatically by `generateOneShotInRoom()`, and previewed dynamically by Party Level (`1..5`) in the Public Storefront (`/api/store/catalog`).

## 2. Pre-Creation Continuity Guard
- Before publishing a campaign chapter or procedural sidequest, call `detectLoreOrMapOverlap({ existingLore, title, mainAntagonist, keyLocations })` from `@hearthquest/srd-rules`.
- Never reuse reserved Core Campaign villains or zone names:
  - *The Great Goblin Bakery Heist*: Mayor Bramblecrust / Croissant Pantry, Sugar-Flour Mill, Oven Vault.
  - *The Clockwork Treehouse Mystery*: Sprocket the Tinkerer Owl / Canopy Entry Deck, Brass Gear Lift, Observatory Crown.
  - *Voyage of the Starlight Otter*: Queen Lumina Starlight Jelly / Comet Foredeck, Astrolabe Wheelhouse, Nebula Crown Dock.

## 3. Build Currency Stamp
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.22` (Build `#23`)
- **Updated At**: `2026-11-15T18:46:51.708Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->
