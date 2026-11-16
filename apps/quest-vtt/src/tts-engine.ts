import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type TtsPreferredMode = "AUTO" | "LOCAL_NEURAL" | "CLOUD_AI" | "BROWSER_NATURAL";
export type TtsCloudProvider = "NONE" | "OPENAI" | "ELEVENLABS";
export type TtsSpeakerRole = "NARRATOR" | "NPC" | "BOSS";

export interface TtsRoleVoiceProfile {
  localVoice: string;
  openaiVoice: string;
  elevenLabsVoiceId: string;
  browserPitch: number;
  browserRate: number;
}

export interface TtsSettings {
  preferredMode: TtsPreferredMode;
  localTtsUrl: string;
  localTtsModel: string;
  cloudProvider: TtsCloudProvider;
  cloudApiKey: string;
  cloudModel: string;
  cacheEnabled: boolean;
  narratorSpeed: number;
  roleVoices: Record<TtsSpeakerRole, TtsRoleVoiceProfile>;
}

export interface PublicTtsConfig {
  preferredMode: TtsPreferredMode;
  localTtsUrl: string;
  localTtsModel: string;
  localConfigured: boolean;
  cloudProvider: TtsCloudProvider;
  cloudConfigured: boolean;
  cloudKeyMasked: string;
  cloudModel: string;
  cacheEnabled: boolean;
  cacheEntries: number;
  narratorSpeed: number;
  fallbackChain: string[];
  roleVoices: Record<TtsSpeakerRole, TtsRoleVoiceProfile>;
}

export interface TtsSynthesisResult {
  ok: boolean;
  provider: "disk-cache" | "local-neural" | "cloud-openai" | "cloud-elevenlabs" | "browser-natural";
  fallbackToBrowser: boolean;
  audioBuffer?: Buffer;
  contentType?: string;
  attemptedProviders: string[];
  errors: string[];
  cacheHit: boolean;
  voiceProfile: TtsRoleVoiceProfile;
  fallbackReason?: string;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  headers?: { get?: (name: string) => string | null };
  arrayBuffer: () => Promise<ArrayBuffer>;
  text?: () => Promise<string>;
}>;

const DEFAULT_ROLE_VOICES: Record<TtsSpeakerRole, TtsRoleVoiceProfile> = {
  NARRATOR: {
    localVoice: "bm_george",
    openaiVoice: "onyx",
    elevenLabsVoiceId: "pNInz6obpgDQGcFmaJgB",
    browserPitch: 0.94,
    browserRate: 0.94,
  },
  NPC: {
    localVoice: "af_bella",
    openaiVoice: "nova",
    elevenLabsVoiceId: "EXAVITQu4vr4xnSDxMaL",
    browserPitch: 1.1,
    browserRate: 0.98,
  },
  BOSS: {
    localVoice: "am_adam",
    openaiVoice: "echo",
    elevenLabsVoiceId: "VR6AewLTigWG4xSOukaG",
    browserPitch: 0.85,
    browserRate: 0.9,
  },
};

function getDataDir(): string {
  const dir = process.env.HEARTHQUEST_DATA_DIR || path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getSettingsFilePath(): string {
  return path.join(getDataDir(), "tts-settings.json");
}

function getTtsCacheDir(): string {
  const cacheDir = path.join(getDataDir(), "tts-cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

function createDefaultTtsSettings(): TtsSettings {
  const envCloudOpenAi = (process.env.OPENAI_API_KEY || "").trim();
  const envEleven = (process.env.ELEVENLABS_API_KEY || "").trim();
  return {
    preferredMode: "AUTO",
    localTtsUrl: (process.env.TTS_HOST || "").trim(),
    localTtsModel: (process.env.TTS_MODEL || "kokoro").trim(),
    cloudProvider: envEleven ? "ELEVENLABS" : envCloudOpenAi ? "OPENAI" : "NONE",
    cloudApiKey: envEleven || envCloudOpenAi,
    cloudModel: envEleven ? "eleven_flash_v2_5" : "gpt-4o-mini-tts",
    cacheEnabled: true,
    narratorSpeed: 1.0,
    roleVoices: JSON.parse(JSON.stringify(DEFAULT_ROLE_VOICES)),
  };
}

let inMemorySettings: TtsSettings | null = null;
const inMemoryAudioCache = new Map<string, { buffer: Buffer; contentType: string }>();

function loadTtsSettingsFromDisk(): TtsSettings {
  const base = createDefaultTtsSettings();
  if (process.env.NODE_ENV === "test") {
    return base;
  }
  try {
    const file = getSettingsFilePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<TtsSettings>;
      return {
        ...base,
        ...parsed,
        roleVoices: {
          NARRATOR: { ...base.roleVoices.NARRATOR, ...(parsed.roleVoices?.NARRATOR || {}) },
          NPC: { ...base.roleVoices.NPC, ...(parsed.roleVoices?.NPC || {}) },
          BOSS: { ...base.roleVoices.BOSS, ...(parsed.roleVoices?.BOSS || {}) },
        },
      };
    }
  } catch {
    // Ignore malformed file and fall back cleanly to defaults
  }
  return base;
}

export function getTtsSettings(): TtsSettings {
  if (!inMemorySettings) {
    inMemorySettings = loadTtsSettingsFromDisk();
  }
  return inMemorySettings;
}

export function resetTtsStateForTesting(): void {
  inMemorySettings = createDefaultTtsSettings();
  inMemoryAudioCache.clear();
}

export function saveTtsSettings(patch: Partial<TtsSettings> & { clearCloudKey?: boolean }): TtsSettings {
  const current = getTtsSettings();
  const next: TtsSettings = {
    ...current,
    preferredMode: patch.preferredMode || current.preferredMode,
    localTtsUrl:
      typeof patch.localTtsUrl === "string" ? patch.localTtsUrl.trim().replace(/\/+$/, "") : current.localTtsUrl,
    localTtsModel:
      typeof patch.localTtsModel === "string" && patch.localTtsModel.trim()
        ? patch.localTtsModel.trim()
        : current.localTtsModel,
    cloudProvider: patch.cloudProvider || current.cloudProvider,
    cloudApiKey: patch.clearCloudKey
      ? ""
      : typeof patch.cloudApiKey === "string" && patch.cloudApiKey.trim()
      ? patch.cloudApiKey.trim()
      : current.cloudApiKey,
    cloudModel:
      typeof patch.cloudModel === "string" && patch.cloudModel.trim()
        ? patch.cloudModel.trim()
        : current.cloudModel,
    cacheEnabled: typeof patch.cacheEnabled === "boolean" ? patch.cacheEnabled : current.cacheEnabled,
    narratorSpeed:
      typeof patch.narratorSpeed === "number" && Number.isFinite(patch.narratorSpeed)
        ? Math.max(0.75, Math.min(1.4, patch.narratorSpeed))
        : current.narratorSpeed,
    roleVoices: {
      NARRATOR: { ...current.roleVoices.NARRATOR, ...(patch.roleVoices?.NARRATOR || {}) },
      NPC: { ...current.roleVoices.NPC, ...(patch.roleVoices?.NPC || {}) },
      BOSS: { ...current.roleVoices.BOSS, ...(patch.roleVoices?.BOSS || {}) },
    },
  };
  inMemorySettings = next;
  if (process.env.NODE_ENV !== "test") {
    try {
      fs.writeFileSync(getSettingsFilePath(), JSON.stringify(next, null, 2), "utf8");
    } catch {
      // Non-fatal in read-only test containers
    }
  }
  return next;
}

function maskSecretKey(rawKey: string): string {
  const k = (rawKey || "").trim();
  if (!k) return "";
  if (k.length <= 8) return "****";
  return `${k.slice(0, 4)}...${k.slice(-4)}`;
}

export function getPublicTtsConfig(): PublicTtsConfig {
  const s = getTtsSettings();
  const localConfigured = Boolean(s.localTtsUrl);
  const cloudConfigured = s.cloudProvider !== "NONE" && Boolean(s.cloudApiKey);
  const fallbackChain: string[] = [];
  if (s.preferredMode === "AUTO") {
    if (localConfigured) fallbackChain.push("Local GPU Neural (TTS_HOST)");
    if (cloudConfigured) fallbackChain.push(`Cloud AI (${s.cloudProvider})`);
    fallbackChain.push("Browser Natural Neural Voices");
  } else if (s.preferredMode === "LOCAL_NEURAL") {
    if (localConfigured) fallbackChain.push("Local GPU Neural (TTS_HOST)");
    if (cloudConfigured) fallbackChain.push(`Fallback Cloud (${s.cloudProvider})`);
    fallbackChain.push("Fallback Browser Natural Voices");
  } else if (s.preferredMode === "CLOUD_AI") {
    if (cloudConfigured) fallbackChain.push(`Cloud AI (${s.cloudProvider})`);
    if (localConfigured) fallbackChain.push("Fallback Local GPU Neural");
    fallbackChain.push("Fallback Browser Natural Voices");
  } else {
    fallbackChain.push("Browser Natural Neural Voices (Immediate)");
  }

  let cacheEntries = inMemoryAudioCache.size;
  if (process.env.NODE_ENV !== "test") {
    try {
      cacheEntries = fs.readdirSync(getTtsCacheDir()).filter((f) => f.endsWith(".mp3") || f.endsWith(".wav")).length;
    } catch {
      // ignore
    }
  }

  return {
    preferredMode: s.preferredMode,
    localTtsUrl: s.localTtsUrl,
    localTtsModel: s.localTtsModel,
    localConfigured,
    cloudProvider: s.cloudProvider,
    cloudConfigured,
    cloudKeyMasked: maskSecretKey(s.cloudApiKey),
    cloudModel: s.cloudModel,
    cacheEnabled: s.cacheEnabled,
    cacheEntries,
    narratorSpeed: s.narratorSpeed,
    fallbackChain,
    roleVoices: s.roleVoices,
  };
}

export function clearTtsAudioCache(): number {
  let removed = inMemoryAudioCache.size;
  inMemoryAudioCache.clear();
  if (process.env.NODE_ENV !== "test") {
    try {
      const dir = getTtsCacheDir();
      for (const file of fs.readdirSync(dir)) {
        if (file.endsWith(".mp3") || file.endsWith(".wav")) {
          fs.unlinkSync(path.join(dir, file));
          removed++;
        }
      }
    } catch {
      // ignore
    }
  }
  return removed;
}

function buildCacheKey(text: string, role: TtsSpeakerRole, speed: number, voiceHint: string): string {
  return crypto
    .createHash("sha256")
    .update(`${role}|${speed.toFixed(2)}|${voiceHint}|${text.trim()}`)
    .digest("hex")
    .slice(0, 24);
}

function readCachedAudio(key: string): { buffer: Buffer; contentType: string } | null {
  const mem = inMemoryAudioCache.get(key);
  if (mem) return mem;
  if (process.env.NODE_ENV === "test") return null;
  const mp3Path = path.join(getTtsCacheDir(), `${key}.mp3`);
  if (fs.existsSync(mp3Path)) {
    return { buffer: fs.readFileSync(mp3Path), contentType: "audio/mpeg" };
  }
  return null;
}

function writeCachedAudio(key: string, buffer: Buffer, contentType: string): void {
  inMemoryAudioCache.set(key, { buffer, contentType });
  if (process.env.NODE_ENV === "test") return;
  try {
    fs.writeFileSync(path.join(getTtsCacheDir(), `${key}.mp3`), buffer);
  } catch {
    // non-fatal
  }
}

export async function probeLocalTtsHealth(
  overrideUrl?: string,
  fetchImpl?: FetchLike
): Promise<{ online: boolean; url: string; latencyMs: number; detail: string }> {
  const settings = getTtsSettings();
  const baseUrl = (overrideUrl || settings.localTtsUrl || "").trim().replace(/\/+$/, "");
  if (!baseUrl) {
    return { online: false, url: "", latencyMs: 0, detail: "No TTS_HOST URL configured." };
  }
  const f = fetchImpl || (globalThis.fetch as unknown as FetchLike);
  const start = Date.now();
  const candidateUrls = [`${baseUrl}/health`, `${baseUrl}/v1/audio/voices`];
  for (const probeUrl of candidateUrls) {
    try {
      const res = await f(probeUrl, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok || res.status === 200 || res.status === 404) {
        return {
          online: true,
          url: baseUrl,
          latencyMs: Date.now() - start,
          detail: `Connected cleanly to Local Neural TTS (${probeUrl}, HTTP ${res.status}).`,
        };
      }
    } catch {
      // try next probe endpoint
    }
  }
  return {
    online: false,
    url: baseUrl,
    latencyMs: Date.now() - start,
    detail: `Could not reach ${baseUrl}. Falling back cleanly to Cloud AI / Browser Voices.`,
  };
}

/**
 * Multi-Tier Neural TTS Dispatcher with Automatic Cascading Fallbacks:
 * 1. Disk/Memory Cache -> 2. Local Unraid/RTX 3080 GPU Neural (Kokoro / openedai-speech)
 * -> 3. Cloud AI TTS (OpenAI / ElevenLabs) -> 4. Browser Natural Neural Signal
 */
export async function synthesizeSpeechWithFallback(params: {
  text: string;
  speakerRole?: TtsSpeakerRole;
  modeOverride?: TtsPreferredMode;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<TtsSynthesisResult> {
  const settings = getTtsSettings();
  const role: TtsSpeakerRole =
    params.speakerRole === "BOSS" || params.speakerRole === "NPC" ? params.speakerRole : "NARRATOR";
  const voiceProfile = settings.roleVoices[role] || DEFAULT_ROLE_VOICES.NARRATOR;
  const cleanText = String(params.text || "").trim().slice(0, 1800);
  const mode = params.modeOverride || settings.preferredMode;
  const timeoutMs = params.timeoutMs ?? 4500;
  const f = params.fetchImpl || (globalThis.fetch as unknown as FetchLike);
  const attemptedProviders: string[] = [];
  const errors: string[] = [];

  if (!cleanText || mode === "BROWSER_NATURAL") {
    return {
      ok: true,
      provider: "browser-natural",
      fallbackToBrowser: true,
      attemptedProviders: ["browser-natural"],
      errors: [],
      cacheHit: false,
      voiceProfile,
      fallbackReason: cleanText ? "Browser Natural mode selected." : "Empty text.",
    };
  }

  const cacheKey = buildCacheKey(
    cleanText,
    role,
    settings.narratorSpeed,
    `${settings.localTtsUrl}|${settings.cloudProvider}|${voiceProfile.localVoice}|${voiceProfile.openaiVoice}`
  );
  if (settings.cacheEnabled) {
    const hit = readCachedAudio(cacheKey);
    if (hit && hit.buffer.length > 0) {
      return {
        ok: true,
        provider: "disk-cache",
        fallbackToBrowser: false,
        audioBuffer: hit.buffer,
        contentType: hit.contentType,
        attemptedProviders: ["disk-cache"],
        errors: [],
        cacheHit: true,
        voiceProfile,
      };
    }
  }

  const tryLocalNeural = async (): Promise<TtsSynthesisResult | null> => {
    if (!settings.localTtsUrl) return null;
    attemptedProviders.push("local-neural");
    try {
      const endpoint = `${settings.localTtsUrl}/v1/audio/speech`;
      const res = await f(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: settings.localTtsModel || "kokoro",
          input: cleanText,
          voice: voiceProfile.localVoice,
          response_format: "mp3",
          speed: settings.narratorSpeed,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        errors.push(`local-neural HTTP ${res.status}`);
        return null;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 32) {
        errors.push("local-neural returned empty audio");
        return null;
      }
      const ctype = res.headers?.get?.("content-type") || "audio/mpeg";
      if (settings.cacheEnabled) writeCachedAudio(cacheKey, buf, ctype);
      return {
        ok: true,
        provider: "local-neural",
        fallbackToBrowser: false,
        audioBuffer: buf,
        contentType: ctype,
        attemptedProviders,
        errors,
        cacheHit: false,
        voiceProfile,
      };
    } catch (err) {
      errors.push(`local-neural unreachable: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  };

  const tryCloudAi = async (): Promise<TtsSynthesisResult | null> => {
    if (settings.cloudProvider === "NONE" || !settings.cloudApiKey) return null;
    if (settings.cloudProvider === "OPENAI") {
      attemptedProviders.push("cloud-openai");
      try {
        const res = await f("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.cloudApiKey}`,
          },
          body: JSON.stringify({
            model: settings.cloudModel || "gpt-4o-mini-tts",
            voice: voiceProfile.openaiVoice,
            input: cleanText,
            instructions:
              role === "BOSS"
                ? "Speak like a dramatic theatrical fantasy villain at a D&D table."
                : role === "NPC"
                ? "Speak warmly and urgently in character like an RPG companion."
                : "Speak like an engaging, atmospheric Dungeon Master setting a vivid fantasy scene.",
            speed: settings.narratorSpeed,
            response_format: "mp3",
          }),
          signal: AbortSignal.timeout(timeoutMs + 2500),
        });
        if (!res.ok) {
          errors.push(`cloud-openai HTTP ${res.status}`);
          return null;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 32) {
          errors.push("cloud-openai returned empty audio");
          return null;
        }
        if (settings.cacheEnabled) writeCachedAudio(cacheKey, buf, "audio/mpeg");
        return {
          ok: true,
          provider: "cloud-openai",
          fallbackToBrowser: false,
          audioBuffer: buf,
          contentType: "audio/mpeg",
          attemptedProviders,
          errors,
          cacheHit: false,
          voiceProfile,
        };
      } catch (err) {
        errors.push(`cloud-openai error: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      }
    }

    if (settings.cloudProvider === "ELEVENLABS") {
      attemptedProviders.push("cloud-elevenlabs");
      try {
        const vid = voiceProfile.elevenLabsVoiceId || "pNInz6obpgDQGcFmaJgB";
        const res = await f(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(vid)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": settings.cloudApiKey,
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: settings.cloudModel || "eleven_flash_v2_5",
          }),
          signal: AbortSignal.timeout(timeoutMs + 2500),
        });
        if (!res.ok) {
          errors.push(`cloud-elevenlabs HTTP ${res.status}`);
          return null;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 32) {
          errors.push("cloud-elevenlabs returned empty audio");
          return null;
        }
        if (settings.cacheEnabled) writeCachedAudio(cacheKey, buf, "audio/mpeg");
        return {
          ok: true,
          provider: "cloud-elevenlabs",
          fallbackToBrowser: false,
          audioBuffer: buf,
          contentType: "audio/mpeg",
          attemptedProviders,
          errors,
          cacheHit: false,
          voiceProfile,
        };
      } catch (err) {
        errors.push(`cloud-elevenlabs error: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      }
    }
    return null;
  };

  // Honor preferred order while always cascading cleanly on failure
  const steps =
    mode === "CLOUD_AI"
      ? [tryCloudAi, tryLocalNeural]
      : [tryLocalNeural, tryCloudAi];

  for (const attempt of steps) {
    const result = await attempt();
    if (result) return result;
  }

  attemptedProviders.push("browser-natural");
  return {
    ok: true,
    provider: "browser-natural",
    fallbackToBrowser: true,
    attemptedProviders,
    errors,
    cacheHit: false,
    voiceProfile,
    fallbackReason:
      errors.length > 0
        ? `Fallback to Browser Neural Voices (${errors.join("; ")})`
        : "No GPU/Cloud TTS endpoint configured; using Browser Natural Voices.",
  };
}
