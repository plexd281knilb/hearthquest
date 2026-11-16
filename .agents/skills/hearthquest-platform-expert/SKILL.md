---
name: hearthquest-platform-expert
description: Full-stack platform architecture guide for HearthQuest. Covers Node 24 TypeScript workspaces, native SQLite WAL persistence, Unraid Docker topology, Public Storefront (/store), Stripe HMAC webhooks, Print-on-Demand fulfillment, DIY pricing, and RTX 3080 AI bridge.
---

# HearthQuest Platform & Infrastructure Guide

## 1. Monorepo Workspaces & Runtime Stack
- **Runtime**: **Node 24** (`node:24-alpine` in `docker/Dockerfile` and `node-version: 24` in `.github/workflows/docker-publish.yml`) for unflagged built-in **`node:sqlite` (`DatabaseSync`)**.
- **Single-File Shared SQLite (`hearthquest.db`)**:
  - Location: `/app/data/hearthquest.db` (`data/.test/test-hearthquest.db` when `NODE_ENV=test`).
  - Always set `PRAGMA journal_mode = WAL;` and `PRAGMA busy_timeout = 5000;` on every connection.
  - **Cross-Process Test Safety**: In tests, `room-store.ts` & `auth-store.ts` use short-lived open/close `withRoomDb` / `withAuthDb` helpers so Windows test resets in `admin-store.ts` never hit `EBUSY` file locks.
  - **Tables**: `rooms`, `vtt_accounts`, `households`, `orders`, `processed_webhooks`, `lore_registry`, `store_carts`, `promo_codes`.

## 2. Storefront (`/store`), Payments & Fulfillment (`apps/quest-admin`)
- **Public Storefront (`store-frontend.ts` + `store-backend.ts`)**:
  - Dedicated storefront at `GET /store` with interactive **Encounter 1 Free Preview -> Paywall Gate**, server-authoritative SQLite Carts (`/api/store/cart`, `/api/store/quote`, `/api/store/checkout`), promo codes (`HEARTH10`, `FAMILYFIRST`), and customer Order Lookup (`/api/store/orders/lookup`).
  - **Pricing Model (No `$0` Free Self-Host Tier)**:
    - **Subscriptions**: `$5/mo` *Digital Explorer & Creator Updates*, `$9/mo` *Print-at-Home Vault + Cloud AI*, `$19/mo` *Monthly Chapter Envelope + Digital*.
    - **Starter & DIY Editions**: Cheaper **Print-at-Home DIY PDFs** (`$15` Starter DIY / `$4` Level-Scaled One-Shot DIY, `$0` shipping) vs **Shipped Boxes** (`$49` Starter Box / `$69` Deluxe Hardcover Box).
- **Stripe Webhooks & POD Queue (`admin-store.ts`)**: HMAC-SHA256 signature verification (`verifyStripeWebhookSignature`), idempotency table (`processed_webhooks`), signed license keys (`HQ-<TIER>-<ID>-<HMAC>`), and Operator PIN-gated fulfillment workflow (`/printable-kit`).

## 3. VTT Authentication, First-Login Admin & Google OAuth (`apps/quest-vtt`)
- **First Login = Server Admin & Creator Adventure Dispatch**: `auth-store.ts` (`registerVttAccount` and `loginOrRegisterGoogleAccount`) atomically checks `SELECT COUNT(*) FROM vtt_accounts` and assigns `role = 'ADMIN'` to the very first account created (email or Google SSO), defaulting subsequent accounts to `'USER'`. Admins can manage roles via `/api/vtt-admin/accounts` & `/api/vtt-admin/accounts/role`, and push static Campaigns, Procedural Maps, or Level-Scaled One-Shots to any user room via `POST /api/vtt-admin/send-adventure` (`#vtt-admin-modal`). Non-admin `USER` accounts receive `403` on `/api/room/switch-campaign`, `/api/room/procedural-map`, and `/api/room/generate-oneshot` so session maps remain static.
- **Google OAuth 2.0 + OIDC (`google-auth.ts`)**: Uses zero-dependency PKCE (`S256`), HMAC-signed `hq_google_oauth` state/nonce cookie, and native `node:crypto` `RS256` JWKS signature verification (`/api/auth/google/start`, `/api/auth/google/callback`, `/api/auth/google/token`, `/api/auth/google/status`, with guided local dev preview when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are unset).

## 4. RTX 3080 Local AI Bridge (`apps/quest-ai-bridge`)
- Connects on LAN to gaming PC Ollama host (`OLLAMA_HOST`) or fails over gracefully to Gemini Flash with zero disruption.

## 5. Build Currency Stamp
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.27` (Build `#28`)
- **Updated At**: `2026-11-16T01:47:00.207Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->
