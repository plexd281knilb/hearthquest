---
name: family-gm-copilot
description: AI Game Master Co-Pilot for zero-prep family tabletop sessions: in-ear whispering, Sibling Spotlight fairness tracking, Age-Tiered Content Guardrails (Cozy G, Adventure PG, Classic PG-13), Pause for Bedtime recaps, and RTX 3080 health checks.
---

# Family GM & AI Co-Pilot Expert Guide

## 1. Core Mission: Zero-Prep Family Tabletop
- **Never Replaces the Parent GM**: Generates whisper coaching (`generateGmCoPilotWhisper`), multi-tone read-aloud blurbs (*Cozy Silly* vs *Action Heroic*), and instant improvised answers via `/api/room/copilot`.
- **RTX 3080 LAN Auto-Failover**: Probes `OLLAMA_HOST` health (`probeRtx3080Health`, testable live in Admin via `POST /api/rtx/test`) and falls back transparently to cloud/deterministic storytelling if offline.

## 2. Guardrails, Fairness & Bedtime Recaps
- **Age-Tiered Filter (`enforceAgeTieredGuardrails`)**: `COZY_G`, `ADVENTURE_PG`, `CLASSIC_PG13` sanitize grimdark phrasing into gentle storybook narration.
- **Sibling Spotlight (`computeSiblingSpotlightFairness`)**: Surfaces when any child lags behind in turns and suggests pet/class spotlight beats.
- **Pause for Bedtime (`createBedtimeFreezeSnapshot`)**: Freezes exact map coords, initiative, and flags into a `"Previously On..."` storybook recap.

## 3. Build Currency Stamp
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.17` (Build `#18`)
- **Updated At**: `2026-11-15T03:34:17.938Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->
