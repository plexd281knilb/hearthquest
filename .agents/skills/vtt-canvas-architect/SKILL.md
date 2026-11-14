---
name: vtt-canvas-architect
description: Architectural patterns for multi-device family Virtual Tabletops (VTT). Covers Jackbox-style 4-letter Room Code join flows, 3-screen modes (GM Command, Living Room TV Table, Kid Tablet/Phone Controller), Hybrid Physical/Digital Dice prompts, and touch-first 2D WebGL canvas controls.
---

# VTT Canvas & Multi-Device Architect Guide

## 1. The 3-Screen Family Ecosystem
HearthQuest is architected so every device in the living room plays a specialized role:
1. **`GM_COMMAND` (Parent's Laptop / Tablet):**
   - Full map visibility (sees hidden traps, secret doors, and unrevealed rooms).
   - Branching story node selector and encounter auto-balancer.
   - AI Co-Pilot whisper sidebar and Sibling Spotlight fairness tracker.
   - 1-Click **"Pause for Bedtime"** freeze control.
2. **`TABLE_TV_DISPLAY` (Living Room TV / Center Table iPad):**
   - Clean, distraction-free shared board view.
   - Displays only player-revealed Fog of War, animated weather, turn order banner, and a corner **4-Letter Room Code + QR Code** for instant joining.
3. **`PLAYER_CONTROLLER` (Kids' Tablets, Phones, Laptops):**
   - Zero-login join via 4-letter Room Code (e.g., `DRGN`).
   - Touch D-Pad and drag-to-move token control with magnetic grid snapping.
   - Big, color-coded visual **Action Cards** and illustrated inventory items.

---

## 2. "Real Dice vs. Digital Dice" Hybrid Engine
When a player taps an Action Card on their tablet or phone, the dice modal supports two seamless modes:
- **Physical Dice Input ("Roll Your Real Dice!"):** Prompts the child which physical die to roll on the table (e.g., *"Roll your 20-sided die!"*) and displays large tap buttons (`1`–`20` or `1`–`6`) to enter what they rolled, automatically adding their character's bonus and celebrating critical hits.
- **Digital 3D Dice Roll:** 1-tap animated digital roll for players on the go without physical dice.

---

## 3. Touch Gesture & Canvas Layering
- **Layers:** Background Map → Grid Overlay → Fog of War Mask → Secret GM Traps → Tokens & HP Rings → Weather/FX Particles.
- **Touch Controls:** PointerEvents with `touch-action: none` for smooth pinch-to-zoom and tap-to-move across iOS, Android, and desktop browsers.
