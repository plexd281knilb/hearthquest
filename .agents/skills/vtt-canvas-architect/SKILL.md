---
name: vtt-canvas-architect
description: Architectural patterns for the HearthQuest multi-device VTT: Jackbox room codes, 3-screen modes, Engraved 3D Three.js Dice, 2D Raycast Lighting & Doors, 5ft Ruler & AoE Templates, SQLite Account Auth, and Session 1 Free -> Session 2+ Paywall Gate.
---

# VTT Canvas & Multi-Device Architect Guide

## 1. The 3-Screen Family Ecosystem
HearthQuest connects three roles via real-time SSE (`/api/room/stream`):
1. **`GM_COMMAND` (Parent Laptop/Tablet):** Full fog/trap visibility, branching story selector, Combat Turn Tracker, Actor & Token Forge, dynamic lighting & weather tools, RTX 3080 AI Co-Pilot whisper panel, and 1-click **"Pause for Bedtime"**.
2. **`TABLE_TV_DISPLAY` (Living Room TV):** Distraction-free board showing revealed Fog of War, raycast light cones, 3D dice tray overlay, weather particles, and top-bar **Room Code + QR Badge** (`/api/room/qr`).
3. **`PLAYER_CONTROLLER` (Kids' Tablets/Phones):** Touch drag/DPad movement, illustrated Action Cards, clickable Skill Checks, and Hybrid Physical/Digital dice prompt.

## 2. Foundry Visual Engines Implemented in VTT
- **Engraved 3D & 2D Polyhedral Dice (`dice-3d-engine.ts`)**: `d4`–`d20` meshes with high-DPI canvas face textures (`1..N`, `6.`/`9.` underlines), boundary bounce physics, golden crit bursts, and quaternion target-face alignment.
- **2D Raycast Lighting & Doors (`lighting-2d-engine.ts`)**: Dynamic darkness modes (`DAY`, `TWILIGHT`, `MIDNIGHT`), hero/token radial point lights, wall shadow occlusion (`WallSegment`), and clickable swinging doors (`/api/room/lighting`).
- **Tactical Tools & Combat (`tools-weather-engine.ts`, `combat-audio-engine.ts`)**: `5ft/sq` distance ruler, Spell AoE templates (`CIRCLE`, `CONE`, `LINE`), weather emitters, initiative tracker, and scenic SVG backdrops (`assets/backgrounds/`).

## 3. VTT Demo Accounts & Session 1 Free Paywall (`auth-store.ts`)
- **Account Persistence (`vtt_accounts` in SQLite `hearthquest.db`)**: Scrypt salted password hashes (`scrypt$<salt>$<hash>`) + HMAC-SHA256 bearer/cookie session tokens (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/activate-license`).
- **Storefront Entitlement Sync**: Automatically syncs paid tiers (`DIGITAL_UPDATES`, `DIGITAL_PLUS`, `GAME_IN_A_BOX_PRO`) from SQLite `households` matching user email OR activated `HQ-...` license keys.
- **Session 1 Free -> Session 2+ Paywall**:
  - `evaluateVttSessionProgressionGate()` allows Scene/Session 1 (`nodeIdx === 0`) free once signed up, and blocks advancing into `nodeIdx >= 1` (`402 paywallRequired: true`) until a paid plan, Print-at-Home DIY kit, or valid paid `HQ-...` key is unlocked.
  - **Route Alias Lesson Learned**: Both `/api/room/advance-story` & `/api/room/story-branch`, and `/api/room/toggle-zone` & `/api/room/zone-fog` must remain handled identically in `apps/quest-vtt/src/server.ts` so UI buttons and API clients never drift.

## 4. Build Currency Stamp
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.15` (Build `#16`)
- **Updated At**: `2026-11-15T03:18:57.842Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->
