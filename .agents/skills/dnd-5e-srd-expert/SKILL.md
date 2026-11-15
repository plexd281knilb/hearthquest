---
name: dnd-5e-srd-expert
description: Expert reference guide and rules engine for D&D 5th Edition SRD 5.1 (CC-BY-4.0) mechanics, 3-tier family rulesets, combat scaling, and party-level-scaled procedural One-Shots.
---

# D&D 5e SRD & Family Ruleset Expert Guide

## 1. Legal Foundation (CC-BY-4.0)
- Uses the **System Reference Document 5.1 (SRD 5.1)** released under **Creative Commons Attribution 4.0 International (CC-BY-4.0)**.
- Never use restricted Wizards IP/trademarks; refer to roles as **Game Master (GM)** or **Dungeon Guide** and mechanics as **5e Compatible**.

## 2. Tiered Family Rules Engine (`packages/srd-rules/src/index.ts`)
- **Tier 1 (`STORYBOOK_D6`, Ages 5–8):** Brawn/Brains/Charm stats, `1d6` checks (succeed on 4+), 3 Hearts (`❤️❤️❤️`), and color-coded Action Cards.
- **Tier 2 (`APPRENTICE_5E`, Ages 8–12):** 6 standard abilities (`STR`..`CHA`), `d20` + polyhedral dice, simplified modifiers, non-lethal knockouts.
- **Tier 3 (`STANDARD_5E`, Teens & Adults):** Full SRD 5.1 proficiencies (`HEARTHQUEST_SKILLS`), Armor Class, Hit Points, spell templates, and complete `SRD_5E_MONSTERS` stat blocks (`Goblin`, `Goblin Boss`, `Wolf`, `Bugbear`, `Bandit`, `Bandit Captain`, `Animated Armor`, `Skeleton`, `Specter`, `Gelatinous Cube`) attached via `MonsterStatBlock5e`.
- **Difficulty Presets (`DifficultyPreset` & `applyRoomDifficulty`)**: Supports `"STORY_EASY"` (enemies 0.55x HP / -3 AC / -2 atk, check & lock DCs -3, heroes +2 rolls & +4 HP/+1 Heart), `"BALANCED_NORMAL"`, and `"HEROIC_HARD"` (+35% enemy HP, +2 AC/atk/DC, -2 hero HP). Rescales cleanly in `evaluateActionCardRoll`, `rollHeroSkillCheck`, and `POST /api/room/settings`.

## 3. Anti-TPK & Level-Scaled Procedural One-Shots
- **Heroic Rally (`HEROIC_RALLY_ACTIVE`)**: Triggers when party HP drops below critical thresholds—shifts enemies tactical, grants Inspiration, and ensures kids celebrate "Failing Forward".
- **Party-Level-Scaled One-Shots (`generateLevelScaledOneShot`, `computePartyAverageLevel`)**:
  - Averages party `levelStars` (`1..5`) to scale encounters dynamically (`bossHp = Math.max(4, partyLevel * 4 + partySize * 2)`, `minionHp = Math.max(2, partyLevel * 2 + 1)`, `checkDc5e = 10 + partyLevel`).
  - Integrates with `ONE_SHOT_SIDEQUEST_CATALOG` & `detectLoreOrMapOverlap()` so procedural One-Shots never spoil or repeat Core Campaign bosses or named map locations.

## 4. Build Currency Stamp
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.23` (Build `#24`)
- **Updated At**: `2026-11-15T18:53:50.253Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->
