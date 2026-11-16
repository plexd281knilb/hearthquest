---
name: character-token-designer
description: Specialist in visual character standees, Foundry Actor & Token Forge bezels/emblems, responsive token styling, interactive 5e/Storybook character sheets, pet companions, and loot rewards for HearthQuest.
---

# Character & Token Designer Skill

## 1. Visual Token Specifications
Tokens on the tactical 10x6 battlemap must be instantly readable by both young children on tablets and parents viewing from across the living room on a TV:

- **Token Framing**: Double-ring concentric circle with glowing outer halo and radial portrait clip (`assetPath` SVGs under `/assets/tokens/` and `/custom-tokens/`).
- **Hero Tokens**: Colored outer ring matching character class (Emerald = Ranger, Amber = Knight, Sky = Wizard, Rose = Rogue, Purple = Cleric).
- **NPC / Monster Tokens**: Crimson/Orange danger border (`FOE`) for monsters; golden border (`HERO`) for friendly NPCs.
- **Status Overlay Badges**:
  - ⭐ **Inspiration Star**: Floating gold star indicator.
  - 💫 **Bonked / Dizzy**: Swirling cartoon stars when stunned or bonked.
  - 🛡️ **Shield Guard**: Little shield emblem when defending.
  - ❤️ **Hearts / HP Bar**: Micro health bar beneath each token.

## 2. Interactive Character Sheet Architecture
- **Dual Complexity View**:
  - **Storybook D6 (Ages 5–8)**: 3 Heart containers (`❤️❤️❤️`), 3 core traits (Brawn 💪, Brains 🧠, Charm ✨), big illustrated Action Cards, and clickable skill pills (`HEARTHQUEST_SKILLS`).
  - **Apprentice 5e Lite / Standard 5e (Ages 8+)**: Standard 5e Hit Points, Armor Class, 6 ability scores, proficient skill badges (`proficientSkills`), and one-click `/api/room/skill-roll` checks.
- **Pet Companion Showcase**:
  - Every hero has an illustrated Pet Companion (e.g. *Bramble the Hedgehog*, *Professor Hoot the Tiny Owl*, *Cogsworth the Brass Squirrel*).
- **Interactive Loot Chest & Inventory**:
  - Opening treasure chests (`/api/room/open-chest`) upgrades token art (`chest-open.svg`) and rewards non-violent items (e.g. *Cookie of Bravery*, *Glowstone of Whispers*, *Feather-Light Boots*).

## 3. Foundry Actor & Token Forge (`token-forge-engine.ts`)
- Built-in SVG forge (`buildFoundryTokenSvg`, `forgeActorAndTokenInRoom`) saves custom tokens under `data/custom-tokens/` (`HEARTHQUEST_CUSTOM_TOKENS_DIR`) served at `/custom-tokens/`.
- **Bezel Styles**: `GOLD_FOIL`, `SILVER_MOON`, `EMERALD_VINE`, `IRON_CRIMSON`.
- **Vector Emblems**: Shield/Sword, Starlight Hat, Forest Stag, Whisper Dagger, Dragon Scale, Flame Crest.
- **Point-Light Aura**: Tokens carry `lightRadius` and `lightColor` used directly by the 2D raycast vision/lighting canvas.
- **Foundry Trap SVG Sprites (`assets/traps/`, `packages/shared-types/src/assets.ts`)**: Illustrated GM-only hazard sprites (`trap-spike-plate.svg`, `trap-flour-snare.svg`, `trap-arcane-rune.svg`) mapped dynamically via `resolveTrapAsset(trapDescription)` and rendered with subtle pulsing hazard auras instead of flat emoji text badges.

## 4. Build Currency Stamp
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.28` (Build `#29`)
- **Updated At**: `2026-11-16T01:53:16.530Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->
