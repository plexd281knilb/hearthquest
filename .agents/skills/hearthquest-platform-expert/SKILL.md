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

## 3. RTX 3080 Local AI Bridge (`apps/quest-ai-bridge`)
- Connects on LAN to gaming PC Ollama host (`OLLAMA_HOST`) or fails over gracefully to Gemini Flash with zero disruption.

## 4. Build Currency Stamp
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.16` (Build `#17`)
- **Updated At**: `2026-11-15T03:25:42.587Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->
