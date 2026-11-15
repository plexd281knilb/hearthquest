---
name: lore-continuity-keeper
description: Tracks all canonical campaign plots, bosses, factions, and map zones in SQLite `lore_registry` so future main chapters and procedural level-scaled one-shots never overlap or reuse antagonists or named locations.
---

# Lore & Map Continuity Keeper

Use this skill whenever designing a new main campaign chapter, writing physical Starter Box or Monthly Chapter Mailer content, or extending procedural level-scaled One-Shot blueprints (`ONE_SHOT_SIDEQUEST_CATALOG`).

## Canon Separation Rules
1. **Single Source of Truth (SQLite `lore_registry`)**:
   - All published Core Campaign Arcs (`CAMPAIGN_ARC`), generated One-Shots (`ONE_SHOT`), named maps (`MAP_LAYOUT`), and major antagonists (`VILLAIN`) live in SQLite table `lore_registry` inside `/app/data/hearthquest.db` (or `data/.test/test-hearthquest.db` during tests).
   - Admin UI displays the live registry at `GET /api/admin/lore` and accepts new canon entries via `POST /api/admin/lore`.
2. **Pre-Creation Continuity Check (Mandatory)**:
   - Before introducing any new campaign plot, villain, or 3-zone map layout, query existing rows (`listLoreRegistry()` or `GET /api/admin/lore`) and run `detectLoreOrMapOverlap({ existingLore, title, mainAntagonist, keyLocations })` from `@hearthquest/srd-rules`.
   - Reject or rename any candidate whose **title**, **main antagonist**, or **key location name** collides with an active canon entry.
3. **Core Campaign vs. Procedural One-Shot Boundaries**:
   - **Canonical Physical/Digital Campaigns** (`camp-goblin-bakery`, `camp-clockwork-treehouse`, `camp-starlight-otter`, plus monthly mailed chapters) hold long-form multi-session continuity, physical map grids, and flagship villain arcs.
   - **Level-Scaled Procedural One-Shots** (`generateLevelScaledOneShot()` / `generateOneShotInRoom()`) compute the active party's average hero level (`computePartyAverageLevel()`), scale monster HP/DCs accordingly, select unused sidequest blueprints or uniquely stamped variants, and automatically write their `LoreRegistryEntry` to SQLite `lore_registry`.
4. **Reserved Canonical Plots & Zones (Do Not Reuse in Sidequests)**:
   - *The Great Goblin Bakery Heist*: Mayor Bramblecrust / Croissant Pantry, Sugar-Flour Mill, Oven Vault.
   - *The Clockwork Treehouse Mystery*: Sprocket the Tinkerer Owl / Canopy Entry Deck, Brass Gear Lift, Observatory Crown.
   - *Voyage of the Starlight Otter*: Queen Lumina Starlight Jelly / Comet Foredeck, Astrolabe Wheelhouse, Nebula Crown Dock.
