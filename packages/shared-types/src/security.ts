import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const CONFUSABLE_MAP: Record<string, string> = {
  "\u212A": "k",
  "\u017F": "s",
  "\u0131": "i",
  "\u0130": "i",
  "\u00DF": "ss",
  "\u1E9E": "ss",
  "\u0410": "a", "\u0430": "a",
  "\u0412": "b", "\u0432": "b",
  "\u0415": "e", "\u0435": "e",
  "\u0401": "e", "\u0451": "e",
  "\u0404": "e", "\u0454": "e",
  "\u041A": "k", "\u043A": "k",
  "\u041C": "m", "\u043C": "m",
  "\u041D": "h", "\u043D": "h",
  "\u041E": "o", "\u043E": "o",
  "\u0420": "p", "\u0440": "p",
  "\u0421": "c", "\u0441": "c",
  "\u0422": "t", "\u0442": "t",
  "\u0423": "y", "\u0443": "y",
  "\u0425": "x", "\u0445": "x",
  "\u0406": "i", "\u0456": "i",
  "\u0408": "j", "\u0458": "j",
  "\u0405": "s", "\u0455": "s",
  "\u0492": "f", "\u0493": "f",
  "\u04AE": "y", "\u04AF": "y",
  "\u04CF": "l",
  "\u03DC": "f", "\u03DD": "f",
  "\u0391": "a", "\u03B1": "a",
  "\u0392": "b", "\u03B2": "b",
  "\u0395": "e", "\u03B5": "e",
  "\u0396": "z", "\u03B6": "z",
  "\u0397": "n", "\u03B7": "n",
  "\u0399": "i", "\u03B9": "i",
  "\u039A": "k", "\u03BA": "k",
  "\u039C": "m", "\u03BC": "m",
  "\u039D": "v", "\u03BD": "v",
  "\u039F": "o", "\u03BF": "o",
  "\u03A1": "p", "\u03C1": "p",
  "\u03A4": "t", "\u03C4": "t",
  "\u03A5": "y", "\u03C5": "u",
  "\u03A7": "x", "\u03C7": "x",
};

const INVISIBLE_CONTROL_RE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const SAFE_HOST_RE = /^(?:[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*|\[[0-9a-fA-F:]+\])(?::\d{1,5})?$/;

const cachedRuntimeSecrets = new Map<string, string>();

export function getOrCreateRuntimeSecret(
  secretName: "signing" | "webhook" | "admin_pin",
  envKeys: string[]
): string {
  for (const key of envKeys) {
    const val = (process.env[key] || "").trim();
    if (val) return val;
  }
  const existing = cachedRuntimeSecrets.get(secretName);
  if (existing) return existing;

  const baseDir =
    process.env.NODE_ENV === "test"
      ? path.join(process.cwd(), "data", ".test")
      : process.env.HEARTHQUEST_DATA_DIR || path.join(process.cwd(), "data");
  const secretFile = path.join(baseDir, `.hq-${secretName}.secret`);
  try {
    if (fs.existsSync(secretFile)) {
      const diskVal = fs.readFileSync(secretFile, "utf-8").trim();
      if (diskVal.length >= 16) {
        cachedRuntimeSecrets.set(secretName, diskVal);
        return diskVal;
      }
    }
    fs.mkdirSync(baseDir, { recursive: true });
    const generated =
      secretName === "admin_pin"
        ? String(crypto.randomInt(100000, 999999)) + crypto.randomBytes(6).toString("hex")
        : crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(secretFile, generated, { encoding: "utf-8", mode: 0o600 });
    cachedRuntimeSecrets.set(secretName, generated);
    return generated;
  } catch {
    const ephemeral = crypto.randomBytes(32).toString("hex");
    cachedRuntimeSecrets.set(secretName, ephemeral);
    return ephemeral;
  }
}

export function constantTimeEquals(a: string, b: string): boolean {
  const key = crypto.createHash("sha256").update("hearthquest-ct-cmp").digest();
  const macA = crypto.createHmac("sha256", key).update(String(a || ""), "utf8").digest();
  const macB = crypto.createHmac("sha256", key).update(String(b || ""), "utf8").digest();
  return crypto.timingSafeEqual(macA, macB);
}

export function escapeHtml(val: unknown): string {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function stripInvisibleControls(raw: unknown): string {
  return String(raw ?? "").replace(INVISIBLE_CONTROL_RE, "").trim();
}

export function canonicalizeIdentifier(raw: unknown): string {
  const nfkc = stripInvisibleControls(raw).normalize("NFKC");
  let mapped = "";
  for (const ch of nfkc) {
    mapped += CONFUSABLE_MAP[ch] ?? ch;
  }
  return mapped
    .normalize("NFKD")
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .trim();
}

export function validateDisplayName(
  raw: unknown,
  fallback: string = "Adventurer",
  maxLen: number = 64
): string {
  const str = String(raw ?? "");
  const cleaned = str.replace(INVISIBLE_CONTROL_RE, "").trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLen);
}

export function secureRandomId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
}

export function sanitizeHttpUrl(raw: unknown, defaultOrigin?: string): string {
  const s = stripInvisibleControls(raw);
  if (!s) return "";
  try {
    const parsed = defaultOrigin ? new URL(s, defaultOrigin) : new URL(s);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return "";
  } catch {
    return "";
  }
}

export function isSafeServiceProbeUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(String(rawUrl || "").trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (
      host === "metadata.google.internal" ||
      host === "169.254.169.254" ||
      host.startsWith("169.254.")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function sanitizeSvgContent(svg: string): string {
  return String(svg || "")
    .replace(/<!DOCTYPE\b[^>]*>/gi, "")
    .replace(/<!ENTITY\b[^>]*>/gi, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(?:href|xlink:href)\s*=\s*(["'])\s*(?:javascript|vbscript|data:text\/html)[^"']*\1/gi, "$1#$1");
}

export function getSafeRequestOrigin(
  headers: Record<string, string | string[] | undefined>,
  fallbackPort: number,
  envPublicUrl?: string
): string {
  const configured = stripInvisibleControls(envPublicUrl);
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return `${parsed.protocol}//${parsed.host}`;
      }
    } catch {
      // ignore invalid env URL
    }
  }
  const protoHeader = String(headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  const safeProto = protoHeader === "https" ? "https" : "http";
  const rawHost = String(headers["x-forwarded-host"] || headers.host || `localhost:${fallbackPort}`)
    .split(",")[0]
    .trim();
  const safeHost = SAFE_HOST_RE.test(rawHost) ? rawHost : `localhost:${fallbackPort}`;
  return `${safeProto}://${safeHost}`;
}

export function safeParseRequestUrl(rawUrl: string | undefined, hostHeader: string | string[] | undefined, fallbackPort: number): URL {
  const rawHost = String(Array.isArray(hostHeader) ? hostHeader[0] : hostHeader || "").split(",")[0].trim();
  const safeHost = SAFE_HOST_RE.test(rawHost) ? rawHost : `localhost:${fallbackPort}`;
  try {
    return new URL(rawUrl || "/", `http://${safeHost}`);
  } catch {
    return new URL("/", `http://${safeHost}`);
  }
}

const rateBuckets = new Map<string, number[]>();

export function checkHearthQuestRateLimit(
  bucket: string,
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const composite = `${bucket}:${canonicalizeIdentifier(key) || "anon"}`;
  if (rateBuckets.size > 5000) {
    for (const [k, stamps] of rateBuckets.entries()) {
      const active = stamps.filter((t) => now - t < windowMs);
      if (active.length === 0) rateBuckets.delete(k);
      else rateBuckets.set(k, active);
    }
  }
  const existing = (rateBuckets.get(composite) || []).filter((t) => now - t < windowMs);
  if (existing.length >= maxRequests) {
    rateBuckets.set(composite, existing);
    return false;
  }
  existing.push(now);
  rateBuckets.set(composite, existing);
  return true;
}
