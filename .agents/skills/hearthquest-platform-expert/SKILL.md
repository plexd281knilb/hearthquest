---
name: hearthquest-platform-expert
description: Full-stack platform architecture guide for HearthQuest. Covers Next.js, multi-container Docker topology on Unraid, local RTX 3080 AI bridge, Stripe billing, and Print-on-Demand (POD) fulfillment pipelines.
---

# HearthQuest Platform & Infrastructure Guide

## 1. Multi-Container Fleet on Unraid

### Docker Fleet Topology:
1. **`quest-vtt` (Port 3000):** Real-time interactive tabletop canvas (Next.js, Pixi.js, Socket.io, Howler.js).
2. **`quest-admin` (Port 3001):** Storefront, user authentication, subscription billing, and physical order tracking.
3. **`quest-ai-bridge` (Port 8000):** FastAPI / Node.js gateway routing between local LAN RTX 3080 (Ollama/vLLM) and cloud failover (Gemini 2.0 Flash).
4. **`quest-redis` (Port 6379):** Distributed state store and WebSocket message broker.
5. **`quest-db` (Port 5432):** PostgreSQL + Prisma (or local SQLite for single-node Unraid).

---

## 2. Print-on-Demand (POD) Physical Fulfillment
- **Pipeline:** Automated PDF generation via Puppeteer / PDFKit rendering:
  - High-res folding battle maps with 1-inch grids.
  - Cutout cardboard standees with printable bases.
  - Laminated character and spell cards.
- **Webhook Dispatch:** Integrates with fulfillment partners (Printful / Prodigi / Lulu) for direct mailing of boxed adventure kits.

---

## 3. RTX 3080 Local AI Bridge Strategy
- **Local Host:** LAN connection to gaming PC running Ollama / vLLM.
- **Model Recommendation:** Qwen 2.5 14B or Llama 3.3 70B (4-bit quant) for high-speed dialogue and rules reasoning within 10GB/12GB VRAM.
- **Health Check & Auto-Failover:** Pings gaming PC `/api/health`. If timeout > 800ms or connection refused (PC off), routes dynamically to Google Gemini 2.0 Flash API with zero user disruption.
