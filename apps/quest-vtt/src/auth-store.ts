/**
 * HearthQuest VTT Account Auth & Session 1 Demo Paywall Engine
 * - SQLite `vtt_accounts` table inside shared `hearthquest.db` (`test-hearthquest.db` in tests)
 * - Scrypt salted password hashing + HMAC-SHA256 session cookies/tokens
 * - Syncs paid entitlements directly with `/store` SQLite `households` and signed `HQ-...` keys
 * - Enforces: Account Sign-Up + Full Session 1 Free Play -> Payment Required for Session 2+
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { AgeGroupPreset, RoomSessionState, RulesTier, SubscriptionTier } from "@hearthquest/shared-types";
import { generateTailoredAccountSession } from "@hearthquest/srd-rules";
import {
  getOrCreateRoom,
  getVttDatabasePath,
  replaceRoomSessionState,
  saveRoomsToDisk,
} from "./room-store";

export interface VttPublicAccount {
  id: string;
  familyName: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  preferredRulesTier: RulesTier;
  preferredAgeGroup: AgeGroupPreset;
  licenseKey?: string;
  trialRoomCode: string;
  createdAt: string;
  updatedAt: string;
}

function getAuthSecret(): string {
  return (
    process.env.HEARTHQUEST_LICENSE_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    "hearthquest-default-unraid-signing-secret-2026"
  );
}

function withAuthDb<T>(fn: (db: DatabaseSync) => T): T {
  const dbPath = getVttDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  try {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA busy_timeout = 5000;");
    db.exec(`
      CREATE TABLE IF NOT EXISTS vtt_accounts (
        id TEXT PRIMARY KEY,
        family_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        subscription_tier TEXT NOT NULL DEFAULT 'TRIAL_PREVIEW',
        preferred_rules_tier TEXT NOT NULL DEFAULT 'STORYBOOK_D6',
        preferred_age_group TEXT NOT NULL DEFAULT 'AGES_8_10',
        license_key TEXT,
        trial_room_code TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS households (
        id TEXT PRIMARY KEY,
        family_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        subscription_tier TEXT NOT NULL,
        subscription_status TEXT NOT NULL,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        license_key TEXT NOT NULL,
        ai_monthly_quota_used INTEGER NOT NULL DEFAULT 0,
        default_rules_tier TEXT NOT NULL DEFAULT 'STORYBOOK_D6',
        default_content_rating TEXT NOT NULL DEFAULT 'COZY_G',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Safe additive schema migration for pre-existing vtt_accounts DB files
    const cols = db
      .prepare("PRAGMA table_info(vtt_accounts)")
      .all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "preferred_rules_tier")) {
      db.exec("ALTER TABLE vtt_accounts ADD COLUMN preferred_rules_tier TEXT NOT NULL DEFAULT 'STORYBOOK_D6';");
    }
    if (!cols.some((c) => c.name === "preferred_age_group")) {
      db.exec("ALTER TABLE vtt_accounts ADD COLUMN preferred_age_group TEXT NOT NULL DEFAULT 'AGES_8_10';");
    }
    return fn(db);
  } finally {
    try {
      db.close();
    } catch {
      // Ignore close error
    }
  }
}

function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyPasswordScrypt(password: string, storedHash: string): boolean {
  const parts = String(storedHash || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hexHash] = parts;
  const expected = Buffer.from(hexHash, "hex");
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function verifyVttLicenseKey(licenseKey: string): {
  valid: boolean;
  tier?: SubscriptionTier;
} {
  const parts = String(licenseKey || "")
    .trim()
    .toUpperCase()
    .split("-");
  if (parts.length !== 4 || parts[0] !== "HQ") {
    return { valid: false };
  }
  const [, tierCode, cleanId, providedSig] = parts;
  const expectedSig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(`${tierCode}:${cleanId}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();

  const a = Buffer.from(providedSig, "utf-8");
  const b = Buffer.from(expectedSig, "utf-8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false };
  }

  const tier: SubscriptionTier =
    tierCode === "PRO"
      ? "GAME_IN_A_BOX_PRO"
      : tierCode === "PLUS"
      ? "DIGITAL_PLUS"
      : tierCode === "UPD"
      ? "DIGITAL_UPDATES"
      : "TRIAL_PREVIEW";
  return { valid: true, tier };
}

function signSessionToken(accountId: string, email: string): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 14;
  const payload = Buffer.from(JSON.stringify({ sub: accountId, email, exp })).toString(
    "base64url"
  );
  const sig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
  return `hqvtt_${payload}.${sig}`;
}

export function verifySessionToken(token: string): { accountId: string; email: string } | null {
  const raw = String(token || "").trim();
  if (!raw.startsWith("hqvtt_")) return null;
  const body = raw.slice("hqvtt_".length);
  const dotIdx = body.lastIndexOf(".");
  if (dotIdx <= 0) return null;
  const payloadB64 = body.slice(0, dotIdx);
  const providedSig = body.slice(dotIdx + 1);
  const expectedSig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(payloadB64)
    .digest("base64url");

  const a = Buffer.from(providedSig, "utf-8");
  const b = Buffer.from(expectedSig, "utf-8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    if (!parsed.sub || !parsed.exp || Date.now() > Number(parsed.exp)) return null;
    return { accountId: String(parsed.sub), email: String(parsed.email || "") };
  } catch {
    return null;
  }
}

function syncTierFromHouseholds(
  db: DatabaseSync,
  accountRow: Record<string, any>
): VttPublicAccount {
  const email = String(accountRow.email).toLowerCase();
  const hh = db
    .prepare("SELECT subscription_tier, license_key FROM households WHERE LOWER(email) = ?")
    .get(email) as { subscription_tier?: string; license_key?: string } | undefined;

  let tier = String(accountRow.subscription_tier || "TRIAL_PREVIEW") as SubscriptionTier;
  let licenseKey = accountRow.license_key ? String(accountRow.license_key) : undefined;

  if (
    hh?.subscription_tier &&
    hh.subscription_tier !== "TRIAL_PREVIEW" &&
    tier === "TRIAL_PREVIEW"
  ) {
    tier = hh.subscription_tier as SubscriptionTier;
    licenseKey = hh.license_key || licenseKey;
    db.prepare(
      "UPDATE vtt_accounts SET subscription_tier = ?, license_key = ?, updated_at = ? WHERE id = ?"
    ).run(tier, licenseKey || null, new Date().toISOString(), String(accountRow.id));
  }

  return {
    id: String(accountRow.id),
    familyName: String(accountRow.family_name),
    email: String(accountRow.email),
    subscriptionTier: tier,
    preferredRulesTier: (accountRow.preferred_rules_tier || "STORYBOOK_D6") as RulesTier,
    preferredAgeGroup: (accountRow.preferred_age_group || "AGES_8_10") as AgeGroupPreset,
    licenseKey,
    trialRoomCode: String(accountRow.trial_room_code),
    createdAt: String(accountRow.created_at),
    updatedAt: String(accountRow.updated_at),
  };
}

function generateDemoRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return code;
}

export function registerVttAccount(params: {
  familyName: string;
  email: string;
  password: string;
  preferredRulesTier?: RulesTier;
  preferredAgeGroup?: AgeGroupPreset;
}): { account: VttPublicAccount; token: string; room: RoomSessionState } {
  const email = (params.email || "").trim().toLowerCase();
  const familyName = (params.familyName || "Adventuring Family").trim();
  const password = String(params.password || "");
  const preferredRulesTier: RulesTier = params.preferredRulesTier || "STORYBOOK_D6";
  const preferredAgeGroup: AgeGroupPreset = params.preferredAgeGroup || "AGES_8_10";

  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const account = withAuthDb((db) => {
    const existing = db
      .prepare("SELECT id FROM vtt_accounts WHERE LOWER(email) = ?")
      .get(email);
    if (existing) {
      throw new Error("An account with this email already exists. Please sign in.");
    }

    const hh = db
      .prepare("SELECT subscription_tier, license_key FROM households WHERE LOWER(email) = ?")
      .get(email) as { subscription_tier?: string; license_key?: string } | undefined;

    const tier: SubscriptionTier =
      hh?.subscription_tier && hh.subscription_tier !== "TRIAL_PREVIEW"
        ? (hh.subscription_tier as SubscriptionTier)
        : "TRIAL_PREVIEW";
    const licenseKey =
      hh?.subscription_tier && hh.subscription_tier !== "TRIAL_PREVIEW"
        ? hh.license_key || null
        : null;

    const id = `acct_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
    const trialRoomCode = generateDemoRoomCode();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO vtt_accounts (
        id, family_name, email, password_hash, subscription_tier,
        preferred_rules_tier, preferred_age_group, license_key, trial_room_code, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      familyName,
      email,
      hashPasswordScrypt(password),
      tier,
      preferredRulesTier,
      preferredAgeGroup,
      licenseKey,
      trialRoomCode,
      now,
      now
    );

    const inserted = db
      .prepare("SELECT * FROM vtt_accounts WHERE id = ?")
      .get(id) as Record<string, any>;
    return syncTierFromHouseholds(db, inserted);
  });

  // Generate tailored Session 1 Hook, Scenario, NPCs, Enemies & Boss from account game type + age group
  const tailoredRoom = generateTailoredAccountSession({
    roomCode: account.trialRoomCode,
    rulesTier: account.preferredRulesTier,
    ageGroup: account.preferredAgeGroup,
    familyName: account.familyName,
    householdId: account.id,
  });
  const room = replaceRoomSessionState(tailoredRoom);
  if (process.env.NODE_ENV !== "test") {
    saveRoomsToDisk();
  }

  const token = signSessionToken(account.id, account.email);
  return { account, token, room };
}

export function updateVttAccountPreferences(params: {
  accountId: string;
  preferredRulesTier: RulesTier;
  preferredAgeGroup: AgeGroupPreset;
  roomCode?: string;
  regenerateRoom?: boolean;
}): { account: VttPublicAccount; room: RoomSessionState } {
  const account = withAuthDb((db) => {
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE vtt_accounts SET preferred_rules_tier = ?, preferred_age_group = ?, updated_at = ? WHERE id = ?"
    ).run(params.preferredRulesTier, params.preferredAgeGroup, now, params.accountId);
    const updated = db
      .prepare("SELECT * FROM vtt_accounts WHERE id = ?")
      .get(params.accountId) as Record<string, any> | undefined;
    if (!updated) {
      throw new Error("Account not found.");
    }
    return syncTierFromHouseholds(db, updated);
  });

  const targetCode = (params.roomCode || account.trialRoomCode).toUpperCase();
  if (params.regenerateRoom === false) {
    const existing = getOrCreateRoom(targetCode);
    return { account, room: existing };
  }

  const tailoredRoom = generateTailoredAccountSession({
    roomCode: targetCode,
    rulesTier: account.preferredRulesTier,
    ageGroup: account.preferredAgeGroup,
    familyName: account.familyName,
    householdId: account.id,
  });
  const room = replaceRoomSessionState(tailoredRoom);
  return { account, room };
}

export function loginVttAccount(params: {
  email: string;
  password: string;
}): { account: VttPublicAccount; token: string; room: RoomSessionState } {
  const email = (params.email || "").trim().toLowerCase();
  const password = String(params.password || "");
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const account = withAuthDb((db) => {
    const row = db
      .prepare("SELECT * FROM vtt_accounts WHERE LOWER(email) = ?")
      .get(email) as Record<string, any> | undefined;
    if (!row || !verifyPasswordScrypt(password, String(row.password_hash))) {
      throw new Error("Invalid email or password.");
    }
    return syncTierFromHouseholds(db, row);
  });

  const room = getOrCreateRoom(account.trialRoomCode);
  const token = signSessionToken(account.id, account.email);
  return { account, token, room };
}

export function getVttAccountByToken(token?: string): VttPublicAccount | null {
  const verified = verifySessionToken(token || "");
  if (!verified) return null;
  return withAuthDb((db) => {
    const row = db
      .prepare("SELECT * FROM vtt_accounts WHERE id = ?")
      .get(verified.accountId) as Record<string, any> | undefined;
    if (!row) return null;
    return syncTierFromHouseholds(db, row);
  });
}

export function activateLicenseOnVttAccount(params: {
  accountId: string;
  licenseKey: string;
}): VttPublicAccount {
  const check = verifyVttLicenseKey(params.licenseKey);
  if (!check.valid || !check.tier || check.tier === "TRIAL_PREVIEW") {
    throw new Error("Invalid or unpaid license key. Purchase a kit or plan in /store to receive a valid HQ key.");
  }

  const cleanKey = params.licenseKey.trim().toUpperCase();
  return withAuthDb((db) => {
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE vtt_accounts SET subscription_tier = ?, license_key = ?, updated_at = ? WHERE id = ?"
    ).run(check.tier!, cleanKey, now, params.accountId);
    const updated = db
      .prepare("SELECT * FROM vtt_accounts WHERE id = ?")
      .get(params.accountId) as Record<string, any> | undefined;
    if (!updated) {
      throw new Error("Account not found.");
    }
    return syncTierFromHouseholds(db, updated);
  });
}

/**
 * Checks whether the current account/session may progress into the requested story node.
 * Node 0 (Session 1) is ALWAYS free for demo play once an account exists;
 * Node 1+ (Session 2 & beyond) requires a paid subscription/DIY tier or license key.
 */
export function evaluateVttSessionProgressionGate(params: {
  room: RoomSessionState;
  targetNodeId: string;
  account: VttPublicAccount | null;
  overrideLicenseKey?: string;
}): {
  allowed: boolean;
  paywallRequired: boolean;
  reason?: string;
  activeTier: SubscriptionTier | "UNAUTHENTICATED";
} {
  const nodeIdx = params.room.storyNodes.findIndex((n) => n.id === params.targetNodeId);

  // One-shots or invalid node ids: handled cleanly; first encounter (idx === 0) always allowed if signed in or testing
  if (nodeIdx === 0) {
    return {
      allowed: true,
      paywallRequired: false,
      activeTier: params.account ? params.account.subscriptionTier : "UNAUTHENTICATED",
    };
  }

  if (params.overrideLicenseKey) {
    const check = verifyVttLicenseKey(params.overrideLicenseKey);
    if (check.valid && check.tier && check.tier !== "TRIAL_PREVIEW") {
      return {
        allowed: true,
        paywallRequired: false,
        activeTier: check.tier,
      };
    }
  }

  if (params.account && params.account.subscriptionTier !== "TRIAL_PREVIEW") {
    return {
      allowed: true,
      paywallRequired: false,
      activeTier: params.account.subscriptionTier,
    };
  }

  if (!params.account) {
    return {
      allowed: false,
      paywallRequired: true,
      activeTier: "UNAUTHENTICATED",
      reason:
        "Create a free Demo Account to play Session 1, or sign in with a paid account / HQ License Key to unlock Session 2+!",
    };
  }

  return {
    allowed: false,
    paywallRequired: true,
    activeTier: params.account.subscriptionTier,
    reason:
      "You reached the end of the Free Session 1 Demo! Unlock Session 2+ in the Storefront with $5/mo Digital Updates, $15 Print-at-Home DIY Pack, or $49 Starter Box.",
  };
}
