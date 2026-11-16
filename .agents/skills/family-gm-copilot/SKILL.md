---
name: family-gm-copilot
description: AI Game Master Co-Pilot for zero-prep family tabletop sessions: in-ear whispering, Sibling Spotlight fairness tracking, Age-Tiered Content Guardrails (Cozy G, Adventure PG, Classic PG-13), Pause for Bedtime recaps, and RTX 3080 health checks.
---

# Family GM & AI Co-Pilot Expert Guide

## 1. Core Mission: Zero-Prep Family Tabletop
- **Never Replaces the Parent GM**: Generates whisper coaching (`generateGmCoPilotWhisper`), multi-tone read-aloud blurbs (*Cozy Silly* vs *Action Heroic*), and instant improvised answers via `/api/room/copilot`.
- **RTX 3080 LAN Auto-Failover**: Probes `OLLAMA_HOST` health (`probeRtx3080Health`, testable live in Admin via `POST /api/rtx/test`) and falls back transparently to cloud/deterministic storytelling if offline.

## 2. Account-Tailored Session Generation & Group Spoken RP Modals
- **Game System & Age Group Account Setup (`preferredRulesTier`, `preferredAgeGroup`)**:
  - Choosing `RulesTier` (`STORYBOOK_D6`, `APPRENTICE_D20`, `STANDARD_5E`) and `AgeGroupPreset` (`AGES_5_7`, `AGES_8_10`, `AGES_11_13`, `TEENS_13_PLUS`) on registration (`POST /api/auth/register`) or account preferences (`POST /api/auth/preferences`) calls `generateTailoredAccountSession()` in `packages/srd-rules/src/index.ts`.
  - Dynamically builds the opening hook (`sessionOpeningHook`), starter heroes tuned to the rules tier, friendly NPC allies, patrol minions, scaled bosses, atmospheric lighting/locks, and age-matched tone (`COZY_G` -> `CLASSIC_PG13`).
- **Auto-Popup Read-Aloud & Group RP Modals (`StoryRpPrompt`)**:
  - `activeRpPrompt` on `RoomSessionState` automatically pops open `#rp-readout-modal` on the VTT when entering Session 1, advancing story beats (`advanceRoomStoryNode`), unlocking boss vault doors (`attemptInteractDoor`), or clicking NPC/Boss tokens, with one-click browser TTS (`speakRpPromptText`) and clickable dialogue reply chips (`POST /api/room/rp-prompt`).

## 3. Guardrails, Fairness & Bedtime Recaps
- **Age-Tiered Filter (`enforceAgeTieredGuardrails`)**: `COZY_G`, `ADVENTURE_PG`, `CLASSIC_PG13` sanitize grimdark phrasing into gentle storybook narration.
- **Sibling Spotlight (`computeSiblingSpotlightFairness`)**: Surfaces when any child lags behind in turns and suggests pet/class spotlight beats.
- **Pause for Bedtime (`createBedtimeFreezeSnapshot`)**: Freezes exact map coords, initiative, and flags into a `"Previously On..."` storybook recap.

## 4. Build Currency Stamp
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.30` (Build `#31`)
- **Updated At**: `2026-11-16T02:26:30.401Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->
