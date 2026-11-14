---
name: vtt-canvas-architect
description: Comprehensive architectural patterns for high-performance 2D WebGL Virtual Tabletops (VTT) like Foundry and Owlbear Rodeo. Covers Pixi.js, multi-device touch gestures (iOS/Android tablets and phones), fog of war shaders, dynamic lighting, and real-time WebSocket state synchronization.
---

# VTT Canvas & Multi-Device Architect Guide

## 1. Multi-Device Philosophy (Foundry-Style on All Screens)
Kids and family members join games from diverse devices:
- **Parent / GM:** Laptop or Desktop (Mouse + Keyboard, high-resolution multi-panel UI).
- **Kids:** iPads, Android tablets, Nintendo Switch browsers, or smartphones.
- **Living Room Display:** TV casting the shared player map.

---

## 2. Pixi.js 2D WebGL Layer Architecture
The VTT viewport is organized into hardware-accelerated rendering containers:
1. **Background / Grid Layer:** Static map texture + dynamic square/hex grid overlay.
2. **Lighting & Shadow Layer:** WebGL 2D raycasting shader generating soft shadows from wall segments.
3. **Fog of War Layer:** Render-texture mask. Discovered areas stay dimly visible (grayed out); undiscovered areas remain black.
4. **Token & Miniature Layer:** Draggable player/monster sprites with HP rings, status badges, and name tags.
5. **Spell & Animation FX Layer:** Particle systems (fireballs, healing sparkles, weather).
6. **Interaction & UI Layer:** Native HTML/CSS overlay for menus, dice rollers, and character sheets.

---

## 3. Touch Gesture & Responsive Controls
- **Pinch-to-Zoom & Pan:** Native PointerEvents supporting multi-touch pinch scaling and 2-finger panning without browser scroll conflicts (`touch-action: none`).
- **Token Dragging:** Tap-and-drag with magnetic grid snapping (center-of-square alignment) and touch haptic feedback.
- **Phone Mode (Companion Sheet):** When screen width < 768px, the interface defaults to an interactive dice tray and action cards with a mini-map radar toggle.
- **Dynamic Resolution Scaling:** Auto-scales pixel ratio (1x vs 2x Retina) to prevent tablet thermal throttling.
