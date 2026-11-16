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

## 2. Ambient Soundscape Mixer & Multi-Tier Voice TTS (`tts-engine.ts`)
- **Ambient Loops**: `COZY_TAVERN` (hearth crackle), `GOBLIN_KITCHEN` (bubbling pots), `WHISPERING_WOODS` (crickets/canopy), `CRYSTAL_CAVERN` (astral harmonic shimmer), and `SILENT`.
- **3-Tier Cascading DM Voice TTS (`synthesizeSpeechWithFallback` + `POST /api/tts/speak`)**:
  1. **Disk/Memory Cache (`data/tts-cache/`)**: SHA-256 keyed audio cache serves repeat box text instantaneously.
  2. **Local Unraid / RTX 3080 GPU Neural TTS (`TTS_HOST` -> `/v1/audio/speech` e.g. Kokoro-FastAPI)**: Warm audiobook voices per character role (`NARRATOR`, `NPC`, `BOSS`) with 4.5s timeout guard.
  3. **Cloud AI TTS (`OPENAI` `gpt-4o-mini-tts` / `ELEVENLABS`)**: Automatic fallback if Local GPU is offline or Cloud mode is preferred (API keys masked in `getPublicTtsConfig()`).
  4. **Enhanced Browser Natural Neural Voices (`speakBrowserSentenceChunked`)**: Scores `Online (Natural)`/`Google`/`Neural` browser voices above legacy voices, splits long paragraphs sentence-by-sentence to prevent Chromium cutoff, and preserves distinct role pitch/speed profiles.
- **Controls**: Top-header always-on Music toggle + `#tts-voice-controls-box` engine/voice/speed controls + Admin `#admin-tts-settings-box` server setup (`/api/vtt-admin/tts-settings`).

## 3. Build Currency Stamp
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.28` (Build `#29`)
- **Updated At**: `2026-11-16T01:53:16.530Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->
