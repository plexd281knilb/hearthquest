---
name: family-gm-copilot
description: Artificial Intelligence Game Master Co-Pilot for zero-prep family tabletop sessions. Covers real-time in-ear whispering, Sibling Spotlight fairness tracking, Age-Tiered Content Guardrails (Cozy G, Adventure PG, Classic PG-13), Bedtime Recaps, and kid-friendly improv.
---

# Family GM & AI Co-Pilot Expert Guide

## 1. Core Mission: Zero-Prep Family Tabletop
The AI Co-Pilot acts as a quiet assistant on the parent's GM screen:
1. **Never Replaces the Human GM:** The parent remains the storytelling hero; the AI provides instant read-aloud box text, rules checks, and creative twists.
2. **Multi-Tone Read Aloud:** Generates scene descriptions in 3 distinct tones:
   - *Cozy / Silly* (Playful, humorous, zero-scare)
   - *Action / Heroic* (Dynamic, exciting adventure)
   - *Atmospheric / Mystery* (Curious puzzles and ancient secrets)

---

## 2. Age-Tiered Content Guardrails
Every prompt routed through `quest-ai-bridge` enforces the household's selected `ContentRating`:
- **`COZY_G` (Ages 5–8):** Strictly zero blood, gore, or frightening horror. Defeated monsters *"poof into colorful smoke," "turn into harmless frogs,"* or *"run away dizzy dropping their loot."*
- **`ADVENTURE_PG` (Ages 9–12):** Classic *Chronicles of Narnia* or *Lord of the Rings* heroic adventure tone. Non-graphic fantasy combat.
- **`CLASSIC_PG13` (Teens & Adults):** Standard 5e heroic fantasy stakes.

---

## 3. Sibling Spotlight Fairness Engine
- Tracks `turnsTaken` and `lastActionTimestamp` for every child in the party.
- When a player falls behind in participation (e.g., >10 minutes without a spotlight roll or 2+ fewer turns than siblings), the Co-Pilot generates a **Spotlight Whisper** for the GM:
  - Targets the quiet player's specific character class, pet, or inventory item so only they can solve the next moment.

---

## 4. "Pause for Bedtime" & Storybook Keepsake Generator
- **Bedtime Freeze:** Serializes exact room state, token coordinates, active initiative, and story flags.
- **"Previously On..." Recap:** Generates a 30-second illustrated narrative summary when resuming a paused session.
- **Keepsake Comic / Storybook Export:** Compiles the family's session log, critical rolls, and choices into a printable illustrated PDF keepsake.
