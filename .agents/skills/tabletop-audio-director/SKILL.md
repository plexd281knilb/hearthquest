---
name: tabletop-audio-director
description: Expert on zero-dependency procedural Web Audio API soundscapes, dice roll acoustics, ambient mixers, kid-safe positive audio feedback, and SpeechSynthesis Read-Aloud TTS for HearthQuest.
---

# Tabletop Audio Director Skill

## 1. Zero-Dependency Web Audio Synthesis Architecture (`combat-audio-engine.ts`)
HearthQuest synthesizes SFX and continuous ambient soundscapes directly in browser `AudioContext` so offline/camping tables and LAN containers require zero heavy audio file downloads:
- **`playDiceRoll()`**: Rapid filtered triangle/noise bursts simulating polyhedral dice clatter.
- **`playSuccessChime()`**: Ascending C-major chime for critical hits & skill wins.
- **`playFailForwardBoing()`**: Comic low-roll boing keeping failure playful for kids.
- **`playHeroicRallyFanfare()`**: Brass triad fanfare celebrating Anti-TPK rallies.
- **`playBedtimeLullaby()`**: Soft celesta notes on Bedtime Freeze.
- **`playChestOpen()`**: Shimmering arpeggio when tapping Loot Chests.

## 2. Ambient Soundscape Mixer & Voice TTS
- **Ambient Loops**: `COZY_TAVERN` (hearth crackle), `GOBLIN_KITCHEN` (bubbling pots), `WHISPERING_WOODS` (crickets/canopy), `CRYSTAL_CAVERN` (astral harmonic shimmer), and `SILENT`.
- **Voice Read-Aloud (`speakReadAloudText()`)**: Uses `window.speechSynthesis` on the GM Command view to read active story box text aloud cleanly.
- **Controls**: Every view exposes instant Mute toggle (`🔊 / 🔇`) and unlocks `AudioContext` cleanly on first user interaction.

## 3. Build Currency Stamp
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.18` (Build `#19`)
- **Updated At**: `2026-11-15T03:51:00.877Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->
