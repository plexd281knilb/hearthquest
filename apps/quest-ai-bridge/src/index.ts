import {
  AiCoPilotWhisper,
  ContentRating,
  RoomSessionState,
  RulesTier,
  isSafeServiceProbeUrl,
  secureRandomId,
} from "@hearthquest/shared-types";
import {
  calculateEncounterAutoBalance,
  computeSiblingSpotlightFairness,
  enforceAgeTieredGuardrails,
} from "@hearthquest/srd-rules";

export interface Rtx3080BridgeHealth {
  rtx3080ConfiguredHost: string;
  rtx3080Online: boolean;
  activeModel: string;
  failoverEngine: "GEMINI_2_0_FLASH" | "DETERMINISTIC_FAMILY_GM_ENGINE";
  latencyMs: number;
}

/**
 * Probes the local RTX 3080 Gaming PC running Ollama / vLLM.
 * Automatically fails over in <800ms if the gaming PC is sleeping or powered off.
 */
export async function probeRtx3080Health(
  ollamaUrl = process.env.OLLAMA_HOST || "http://127.0.0.1:11434"
): Promise<Rtx3080BridgeHealth> {
  const start = Date.now();
  let cleanUrl = String(ollamaUrl || "").trim();
  while (cleanUrl.endsWith("/")) cleanUrl = cleanUrl.slice(0, -1);
  if (!isSafeServiceProbeUrl(cleanUrl)) {
    return {
      rtx3080ConfiguredHost: cleanUrl || "invalid",
      rtx3080Online: false,
      activeModel: "standby (Invalid or Unsafe Host URL)",
      failoverEngine: process.env.GEMINI_API_KEY
        ? "GEMINI_2_0_FLASH"
        : "DETERMINISTIC_FAMILY_GM_ENGINE",
      latencyMs: Date.now() - start,
    };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 800);
    const res = await fetch(`${cleanUrl}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      return {
        rtx3080ConfiguredHost: ollamaUrl,
        rtx3080Online: true,
        activeModel: process.env.OLLAMA_MODEL || "qwen2.5:14b-instruct",
        failoverEngine: process.env.GEMINI_API_KEY
          ? "GEMINI_2_0_FLASH"
          : "DETERMINISTIC_FAMILY_GM_ENGINE",
        latencyMs: Date.now() - start,
      };
    }
  } catch {
    // Gaming PC is asleep or offline — seamless failover engaged
  }

  return {
    rtx3080ConfiguredHost: ollamaUrl,
    rtx3080Online: false,
    activeModel: "standby (Gaming PC Asleep)",
    failoverEngine: process.env.GEMINI_API_KEY
      ? "GEMINI_2_0_FLASH"
      : "DETERMINISTIC_FAMILY_GM_ENGINE",
    latencyMs: Date.now() - start,
  };
}

/**
 * Generates an instant GM Co-Pilot Whisper for the parent running the game,
 * including 3 read-aloud tones, age-appropriate rules guidance, fail-forward ideas,
 * and Sibling Spotlight fairness prompts.
 */
export async function generateGmCoPilotWhisper(params: {
  question: string;
  session: RoomSessionState;
  ollamaUrl?: string;
}): Promise<AiCoPilotWhisper> {
  const { question, session, ollamaUrl } = params;
  const start = Date.now();
  const rating: ContentRating = session.contentRating;
  const tier: RulesTier = session.rulesTier;

  const spotlights = computeSiblingSpotlightFairness(
    session.heroes,
    session.spotlightRecords
  );
  const needsSpotlight = spotlights.find((s) => s.needsSpotlightNudge);
  const balance = calculateEncounterAutoBalance(session);

  const checkRecommendation =
    tier === "STORYBOOK_D6"
      ? "Have them roll 1d6 (or 2d6 if a sibling helps!). On a 4, 5, or 6, it works splendidly!"
      : tier === "APPRENTICE_5E_LITE"
      ? "Ask for a d20 check (DC 10). Grant Advantage (roll two d20s, pick highest) for creative teamwork!"
      : "Call for a standard 5e Ability Check (DC 12) with proficiency bonus applied.";

  // 1. Attempt Local RTX 3080 Inference if online
  let host = String(ollamaUrl || process.env.OLLAMA_HOST || "http://127.0.0.1:11434").trim();
  while (host.endsWith("/")) host = host.slice(0, -1);
  try {
    if (!isSafeServiceProbeUrl(host)) {
      throw new Error("Blocked unsafe OLLAMA host");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 900);
    const res = await fetch(`${host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "qwen2.5:14b-instruct",
        stream: false,
        prompt: `You are HearthQuest AI GM Co-Pilot. Content Rating: ${rating}. Rules Tier: ${tier}. GM asks: "${question}". Reply with a short, warm 2-sentence narration for kids.`,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as { response?: string };
      if (data.response) {
        const cleanText = enforceAgeTieredGuardrails(data.response.trim(), rating);
        return {
          id: `whisper_${Date.now()}`,
          sourceEngine: "RTX_3080_LOCAL_OLLAMA",
          latencyMs: Date.now() - start,
          contentRating: rating,
          readAloudOptions: {
            cozySilly: cleanText,
            actionHeroic: cleanText,
            mysteryAtmospheric: cleanText,
          },
          ruleGuidance: `${checkRecommendation} (${balance.gmAdvice})`,
          failForwardIdea: enforceAgeTieredGuardrails(
            "Even on a low roll, let the idea partially succeed with a funny twist that keeps the story moving forward!",
            rating
          ),
          spotlightSuggestion: needsSpotlight?.suggestedSpotlightHook,
        };
      }
    }
  } catch {
    // Proceed to deterministic / cloud fallback
  }

  // 2. Deterministic Zero-Latency Family GM Co-Pilot Engine
  const cleanQ = question.trim() || "What happens next in this room?";
  const cozyRaw = `As you try "${cleanQ}", a puff of cinnamon-scented magic swirls around your boots! The nearby goblin gasps in amazement, dropping his wooden spoon with a clatter!`;
  const actionRaw = `With bold determination, you attempt "${cleanQ}"! Sparks of heroic energy ripple across the flagstones as the chamber reacts to your daring move!`;
  const mysteryRaw = `A hush falls over the room as you attempt "${cleanQ}". Ancient runes along the archway flicker with a warm golden glow, revealing a hidden mechanism.`;

  return {
    id: secureRandomId("whisper"),
    sourceEngine: "DETERMINISTIC_HEURISTIC",
    latencyMs: Date.now() - start,
    contentRating: rating,
    readAloudOptions: {
      cozySilly: enforceAgeTieredGuardrails(cozyRaw, rating),
      actionHeroic: enforceAgeTieredGuardrails(actionRaw, rating),
      mysteryAtmospheric: enforceAgeTieredGuardrails(mysteryRaw, rating),
    },
    ruleGuidance: `${checkRecommendation} | ${balance.gmAdvice}`,
    failForwardIdea: enforceAgeTieredGuardrails(
      `If the roll is low: Their attempt causes a loud, funny distraction (like a stack of tin pie pans tumbling over), opening a side door instead!`,
      rating
    ),
    spotlightSuggestion: needsSpotlight?.suggestedSpotlightHook,
  };
}
