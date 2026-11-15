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
- **2D Raycast Lighting, Architectural Masonry Walls & Locked/Hinged Doors (`lighting-engine.ts`, `room-store.ts`)**: Dynamic darkness modes (`DAY`, `TWILIGHT`, `MIDNIGHT`), hero/token radial point lights, wall shadow occlusion (`WallSegment`), multi-pass **ashlar stone masonry walls**, **iron-bound padlocked doors** (`isLocked`, `lockDc`, `lockLabel`) with drawn padlock shackles/keyholes on canvas, and clickable on-map `#vtt-door-hitboxes`:
  - **Unlocked doors** open/close freely (`POST /api/room/door-interact` -> `attemptInteractDoor`) and reveal attached room lighting.
  - **Locked doors** prompt `#lockpick-modal` and require a **Sleight of Hand Lockpick Check** (digital 3D roll or real physical table die) via `rollHeroSkillCheck(..., skillId: "sleight_of_hand")` before unlocking and swinging open (`/api/room/lighting` also exposes `toggleLockDoorId` for GM override).
  - **Movement Wall/Door Collision & Static Cross D-Pad**: `attemptMoveRoomToken` (`room-store.ts`) enforces 2D segment-vs-segment collision against partition walls and closed/locked doors so players cannot phase through barriers; bumping a locked door displays `#move-blocked-banner` and pops open `#lockpick-modal`. `#vtt-dpad-controller` renders a non-rebuilt tactile cross D-Pad with `WASD`/Arrow-Key support bound cleanly to the active selected hero token (`getControllableHeroToken`).
- **Pre-Combat Stage Artwork & Base 5e Stat Block Inspector (`#stage-art-showcase`, `#stage-art-lightbox`, `#monster-statblock-card`)**: Before combat starts (`!state.combat?.isActive`), the GM story panel, `#rp-readout-modal`, and Walkthrough Step 4 display clickable Town/Area Maps (`stageAreaMapUrl`) and Mood Art (`stageMoodArtUrl`) with click-to-zoom TV lightbox. Clicking any monster token opens `#monster-statblock-card` showing its full SRD 5.1 5e stat block (`armorClass`, `maxHp`, `hitDice`, `speed`, 6 abilities, `challengeRating`, traits, and actions), scaled dynamically by `#select-difficulty` (`STORY_EASY` | `BALANCED_NORMAL` | `HEROIC_HARD`).
- **Tactical Grid Scale & Backdrop Compositing (`ui-template.ts`)**: Battlemap tile SVGs (`assets/tiles/*.svg`) use semi-translucent mortar/base fills (`background-size: 20% 33.3333%` aligned cleanly to 2×2 tactical squares) so scenic backdrops (`opacity-65` + inner board vignette) illuminate the tabletop without ever reducing `#vtt-grid` opacity (`1.0`), keeping tokens, HP bars, and GM traps 100% vibrant.
- **Tactical Tools & Combat (`tools-weather-engine.ts`, `combat-audio-engine.ts`)**: `5ft/sq` distance ruler, Spell AoE templates (`CIRCLE`, `CONE`, `LINE`), weather emitters, initiative tracker, and scenic SVG backdrops (`assets/backgrounds/`).

## 3. VTT Demo Accounts, Tailored Generation & Session 1 Free Paywall (`auth-store.ts`)
- **Account Persistence (`vtt_accounts` in SQLite `hearthquest.db`)**: Scrypt salted password hashes (`scrypt$<salt>$<hash>`) + HMAC-SHA256 bearer/cookie session tokens (`/api/auth/register` requiring `confirmPassword` match, `/api/auth/login`, `/api/auth/me`, `/api/auth/preferences`, `/api/auth/logout`, `/api/auth/activate-license`). Includes `role` (`ADMIN` first user | `USER`), `authProvider` (`LOCAL` | `GOOGLE`), `preferredRulesTier`, and `preferredAgeGroup` with safe SQLite `ALTER TABLE` migrations.
- **Persistent Interactive Quick-Start Strip (`#start-here-guide-bar`) & Guided Workspace (`#gm-advanced-tools-drawer`)**: Right above `<main>` in `GM_COMMAND` mode, a 4-step interactive launchpad (`1. Read Story Intro`, `2. Invite Kids / TV`, `3. Move Hero & Doors`, `4. Roll First Action`) tracks live session progress (`NEXT` / `DONE ✓`) with one-click deep links so newly logged-in hosts never wonder where to start—while dense tools (Switch Campaign, Dynamic Lighting, Ruler/AoE, Weather, Custom Unraid Tokens) tuck neatly inside a collapsible `#gm-advanced-tools-drawer` accordion beneath the map.
- **Session 1 Setup & Host Walkthrough Modal (`#session-walkthrough-modal`)**: Automatically greets a signed-in host on first launch in `GM_COMMAND` mode (re-openable anytime via `#btn-session-walkthrough`), featuring an instant **"🚀 Start Session 1 Now & Read Opening Hook!"** shortcut on Step 1 alongside **1. Setup & Heroes**, **2. How Others Join**, **3. How to Start & Play**, and **4. What to Read Aloud**.
- **Per-User Isolated Sessions & Scannable ISO QR Codes (`qr-encoder.ts`)**: Opening `/` unauthenticated renders the standalone Login / Create Account Gate (`renderVttLoginGateHtml`); ALL `/api/room/*` endpoints enforce `authorizeRoomAccess` so each signed-in account can only open/modify its own `trialRoomCode` instance (`401`/`403` cross-user isolation). `/api/room/qr` generates an ISO/IEC 18004 EC-M Reed-Solomon QR SVG via `encodeQrMatrix()` pointing to `http(s)://<host>/?room=<CODE>&mode=kid&invite=<HMAC>`, allowing scanned kid tablets/TVs to receive a room-scoped `hq_vtt_guest` token restricted strictly to player actions in that host's room.
- **Account-Tailored World & Spoken RP Modal (`POST /api/room/rp-prompt`, `#rp-readout-modal`)**: Registering or updating preferences regenerates the account's active room via `generateTailoredAccountSession()` and opens `#rp-readout-modal` whenever `activeRpPrompt` fires (Session 1 opening hook, NPC token click, story advance, or boss vault unlock).
- **Storefront Entitlement Sync**: Automatically syncs paid tiers (`DIGITAL_UPDATES`, `DIGITAL_PLUS`, `GAME_IN_A_BOX_PRO`) from SQLite `households` matching user email OR activated `HQ-...` license keys.
- **Session 1 Free -> Session 2+ Paywall**:
  - `evaluateVttSessionProgressionGate()` allows Scene/Session 1 (`nodeIdx === 0`) free once signed up, and blocks advancing into `nodeIdx >= 1` (`402 paywallRequired: true`) until a paid plan, Print-at-Home DIY kit, or valid paid `HQ-...` key is unlocked.
  - **Route Alias Lesson Learned**: Both `/api/room/advance-story` & `/api/room/story-branch`, and `/api/room/toggle-zone` & `/api/room/zone-fog` must remain handled identically in `apps/quest-vtt/src/server.ts` so UI buttons and API clients never drift.

## 4. Build Currency Stamp
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.23` (Build `#24`)
- **Updated At**: `2026-11-15T18:53:50.253Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->
