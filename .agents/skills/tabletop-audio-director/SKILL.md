---
name: tabletop-audio-director
description: Expert on procedural Web Audio API soundscapes, dice roll acoustics, kid-safe positive audio feedback, and ambient environmental audio for HearthQuest.
---

# Tabletop Audio Director Skill

## 1. Zero-Dependency Web Audio Synthesis Architecture
HearthQuest runs in diverse environments (Unraid local network, offline tablets, camping mode) without relying on massive external MP3/WAV assets. All core sounds are synthesized in real-time via the browser's standard `AudioContext`:

### 1.1 Sound Effects Catalog
- **`playDiceRollSound()`**: White noise burst shaped by a bandpass filter and rapid decaying envelope mimicking plastic polyhedral dice clattering on wood.
- **`playSuccessChime()`**: Magical upward major triad arpeggio (C5 $\rightarrow$ E5 $\rightarrow$ G5 $\rightarrow$ C6 sine waves) with soft reverb decay.
- **`playFailForwardBoing()`**: Playful, cartoonish frequency-modulated boing (pitch dropping from 320Hz to 110Hz) so kids laugh at low rolls instead of crying.
- **`playHeroicRallyFanfare()`**: Triad horn fanfare with brass-like harmonics that celebrates the Anti-TPK Heroic Rally.
- **`playBedtimeLullaby()`**: Soft music-box celesta chime sequence (E5 $\rightarrow$ G5 $\rightarrow$ B5 $\rightarrow$ E6) celebrating the end of the game session.
- **`playChestOpenFanfare()`**: Shimmering sparkle sweep when an interactive loot chest is opened.

### 1.2 Ambient Soundscapes
- **`COZY_TAVERN`**: Low frequency warm pink noise filtered to simulate a crackling hearth fireplace with gentle soft room resonance.
- **`GOBLIN_KITCHEN`**: Rhythmic, playful bubbling and wooden spoon clatter.
- **`WHISPERING_WOODS` / `CLOCKWORK_TREEHOUSE`**: High-frequency cricket hum and soft mechanical brass gear tick-tock.
- **`CRYSTAL_CAVERN` / `STARLIGHT_SHIP`**: Ethereal astral wind tones with slow LFO pitch modulation.

## 2. Parent & Accessibility Controls
- Every screen must feature an instant **Mute Audio (`🔊 / 🔇`)** toggle.
- GM view includes a master volume slider (`0%` to `100%`) for ambient loops.
- All sound functions must respect the browser's user-interaction requirement (initialize `AudioContext` only after the first user click/tap).
