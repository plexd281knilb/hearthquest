# 🛡️ HearthQuest

> **Zero-Prep Family Tabletop D&D Engine with AI Dungeon Master Co-Pilot**

HearthQuest makes tabletop roleplaying accessible, fast, and fun for busy families and first-time adventurers. It combines a lightweight browser-based Virtual Tabletop (VTT), an intelligent local/cloud AI DM Co-Pilot running on your home rig, and physical print-on-demand fulfillment.

---

## 🌟 Highlights
- **🤖 The AI DM Co-Pilot:** Instant in-ear narration, real-time rules assistance, and creative suggestions so parents can run a game in minutes with zero prep.
- **🗺️ Interactive Family VTT:** Smooth 2D map canvas with dynamic lighting, fog of war, ambient soundscapes, and synchronized multi-device play (tablets, laptops, TV).
- **⚔️ Tiered Rulesets:**
  - *Storybook Mode (Ages 5–8):* 3 simple stats, d6 dice, visual action cards.
  - *Apprentice Mode (Ages 8–12):* Streamlined 5e mechanics with visual cards.
  - *Standard 5e (Teens & Adults):* Full SRD 5.1 rules for authentic play.
- **🎨 5-Minute Character Wizard:** Fast visual quiz that generates high-res custom character portraits, printable card decks, and digital sheets.
- **📦 Physical Kit Fulfillment:** 1-click export of laminated dry-erase battle maps, standees, and custom adventure boxes mailed to players.

---

## 🏗️ Architecture & Containers
- `quest-vtt`: Real-time interactive tabletop canvas (Next.js, Pixi.js, WebSockets, Howler.js).
- `quest-admin`: Account portal, guides CMS, Stripe subscription billing, and print fulfillment.
- `quest-ai-bridge`: Local inference engine (RTX 3080 via Ollama/vLLM) with automatic Gemini 2.0 cloud failover.

---

## 🌿 Git Branching Strategy
- `main`: Production-ready, verified releases and Docker images.
- `beta`: Staging builds for internal playtesting and Unraid beta deployments.
- `dev`: Active feature development and component integration.
