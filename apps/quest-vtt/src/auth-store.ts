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
  hasRoomInStore,
  replaceRoomSessionState,
  saveRoomsToDisk,
} from "./room-store";

export type VttAccountRole = "ADMIN" | "USER";
export type VttAuthProvider = "LOCAL" | "GOOGLE";

export interface VttPublicAccount {
  id: string;
  familyName: string;
  email: string;
  role: VttAccountRole;
  authProvider: VttAuthProvider;
  googleSub?: string;
  avatarUrl?: string;
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
        role TEXT NOT NULL DEFAULT 'USER',
        auth_provider TEXT NOT NULL DEFAULT 'LOCAL',
        google_sub TEXT,
        avatar_url TEXT,
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
    let addedRoleColumn = false;
    if (!cols.some((c) => c.name === "role")) {
      db.exec("ALTER TABLE vtt_accounts ADD COLUMN role TEXT NOT NULL DEFAULT 'USER';");
      addedRoleColumn = true;
    }
    if (!cols.some((c) => c.name === "auth_provider")) {
      db.exec("ALTER TABLE vtt_accounts ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'LOCAL';");
    }
    if (!cols.some((c) => c.name === "google_sub")) {
      db.exec("ALTER TABLE vtt_accounts ADD COLUMN google_sub TEXT;");
    }
    if (!cols.some((c) => c.name === "avatar_url")) {
      db.exec("ALTER TABLE vtt_accounts ADD COLUMN avatar_url TEXT;");
    }
    if (addedRoleColumn) {
      const adminExists = db
        .prepare("SELECT COUNT(*) AS cnt FROM vtt_accounts WHERE role = 'ADMIN'")
        .get() as { cnt: number };
      if (Number(adminExists?.cnt || 0) === 0) {
        db.exec(
          "UPDATE vtt_accounts SET role = 'ADMIN' WHERE id = (SELECT id FROM vtt_accounts ORDER BY created_at ASC LIMIT 1);"
        );
      }
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
    role: String(accountRow.role || "USER").toUpperCase() === "ADMIN" ? "ADMIN" : "USER",
    authProvider:
      String(accountRow.auth_provider || "LOCAL").toUpperCase() === "GOOGLE"
        ? "GOOGLE"
        : "LOCAL",
    googleSub: accountRow.google_sub ? String(accountRow.google_sub) : undefined,
    avatarUrl: accountRow.avatar_url ? String(accountRow.avatar_url) : undefined,
    subscriptionTier: tier,
    preferredRulesTier: (accountRow.preferred_rules_tier || "STORYBOOK_D6") as RulesTier,
    preferredAgeGroup: (accountRow.preferred_age_group || "AGES_8_10") as AgeGroupPreset,
    licenseKey,
    trialRoomCode: String(accountRow.trial_room_code),
    createdAt: String(accountRow.created_at),
    updatedAt: String(accountRow.updated_at),
  };
}

export function getVttAccountCount(): number {
  return withAuthDb((db) => {
    const row = db.prepare("SELECT COUNT(*) AS cnt FROM vtt_accounts").get() as { cnt: number };
    return Number(row?.cnt || 0);
  });
}

function generateDemoRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 25; attempt++) {
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars[crypto.randomInt(0, chars.length)];
    }
    if (code !== "DRGN" && !hasRoomInStore(code)) {
      return code;
    }
  }
  return "H" + crypto.randomBytes(2).toString("hex").toUpperCase().slice(0, 3);
}

/**
 * Loads an authenticated user's own private room session, generating and persisting their
 * tailored adventure if their account's room has not been initialized yet.
 */
export function ensureAccountSessionRoom(account: VttPublicAccount): RoomSessionState {
  const code = (account.trialRoomCode || generateDemoRoomCode()).toUpperCase();
  if (hasRoomInStore(code)) {
    const existing = getOrCreateRoom(code);
    if (existing.householdId === account.id || !existing.householdId) {
      if (!existing.householdId) {
        existing.householdId = account.id;
      }
      return existing;
    }
  }
  const tailored = generateTailoredAccountSession({
    roomCode: code,
    rulesTier: account.preferredRulesTier,
    ageGroup: account.preferredAgeGroup,
    familyName: account.familyName,
    householdId: account.id,
  });
  const saved = replaceRoomSessionState(tailored);
  if (process.env.NODE_ENV !== "test") {
    saveRoomsToDisk();
  }
  return saved;
}

export function registerVttAccount(params: {
  familyName: string;
  email: string;
  password: string;
  preferredRulesTier?: RulesTier;
  preferredAgeGroup?: AgeGroupPreset;
  roomCode?: string;
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

    const totalAccountsRow = db
      .prepare("SELECT COUNT(*) AS cnt FROM vtt_accounts")
      .get() as { cnt: number };
    const assignedRole: VttAccountRole = Number(totalAccountsRow?.cnt || 0) === 0 ? "ADMIN" : "USER";

    const id = `acct_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
    const trialRoomCode = (params.roomCode || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4) || generateDemoRoomCode();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO vtt_accounts (
        id, family_name, email, password_hash, role, auth_provider, subscription_tier,
        preferred_rules_tier, preferred_age_group, license_key, trial_room_code, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'LOCAL', ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      familyName,
      email,
      hashPasswordScrypt(password),
      assignedRole,
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
    if (!row) {
      throw new Error("Invalid email or password.");
    }
    if (String(row.password_hash || "").startsWith("google_oauth_only$")) {
      throw new Error("This account uses Google Sign-In. Click 'Continue with Google' to sign in.");
    }
    if (!verifyPasswordScrypt(password, String(row.password_hash))) {
      throw new Error("Invalid email or password.");
    }
    return syncTierFromHouseholds(db, row);
  });

  const room = ensureAccountSessionRoom(account);
  const token = signSessionToken(account.id, account.email);
  return { account, token, room };
}

/**
 * Signs in or registers a user authenticated via Google OAuth/OIDC.
 * - Matches an existing user by `google_sub` or `email` (linking Google SSO cleanly)
 * - If this is the very first account in the database, automatically promotes to `ADMIN`
 * - Ensures an isolated private room exists for this account
 */
export function loginOrRegisterGoogleAccount(params: {
  googleSub: string;
  email: string;
  familyName: string;
  avatarUrl?: string;
  preferredRulesTier?: RulesTier;
  preferredAgeGroup?: AgeGroupPreset;
  roomCode?: string;
}): { account: VttPublicAccount; token: string; room: RoomSessionState; isNewAccount: boolean } {
  const email = (params.email || "").trim().toLowerCase();
  const googleSub = String(params.googleSub || "").trim();
  const familyName = (params.familyName || email.split("@")[0] || "Adventurer").trim();
  if (!email || !email.includes("@") || !googleSub) {
    throw new Error("Verified Google sub and email address are required.");
  }

  const { account, isNewAccount } = withAuthDb((db) => {
    const now = new Date().toISOString();
    const bySub = db
      .prepare("SELECT * FROM vtt_accounts WHERE google_sub = ?")
      .get(googleSub) as Record<string, any> | undefined;
    const byEmail = bySub
      ? bySub
      : (db
          .prepare("SELECT * FROM vtt_accounts WHERE LOWER(email) = ?")
          .get(email) as Record<string, any> | undefined);

    if (byEmail) {
      db.prepare(
        "UPDATE vtt_accounts SET google_sub = ?, auth_provider = 'GOOGLE', avatar_url = COALESCE(?, avatar_url), updated_at = ? WHERE id = ?"
      ).run(googleSub, params.avatarUrl || null, now, String(byEmail.id));
      const updated = db
        .prepare("SELECT * FROM vtt_accounts WHERE id = ?")
        .get(String(byEmail.id)) as Record<string, any>;
      return { account: syncTierFromHouseholds(db, updated), isNewAccount: false };
    }

    const totalAccountsRow = db
      .prepare("SELECT COUNT(*) AS cnt FROM vtt_accounts")
      .get() as { cnt: number };
    const assignedRole: VttAccountRole = Number(totalAccountsRow?.cnt || 0) === 0 ? "ADMIN" : "USER";

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
    const trialRoomCode =
      (params.roomCode || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 4) || generateDemoRoomCode();
    const preferredRulesTier: RulesTier = params.preferredRulesTier || "STORYBOOK_D6";
    const preferredAgeGroup: AgeGroupPreset = params.preferredAgeGroup || "AGES_8_10";
    const placeholderHash = `google_oauth_only$${crypto.randomBytes(24).toString("hex")}`;

    db.prepare(
      `INSERT INTO vtt_accounts (
        id, family_name, email, password_hash, role, auth_provider, google_sub, avatar_url,
        subscription_tier, preferred_rules_tier, preferred_age_group, license_key, trial_room_code,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'GOOGLE', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      familyName,
      email,
      placeholderHash,
      assignedRole,
      googleSub,
      params.avatarUrl || null,
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
    return { account: syncTierFromHouseholds(db, inserted), isNewAccount: true };
  });

  const room = isNewAccount
    ? replaceRoomSessionState(
        generateTailoredAccountSession({
          roomCode: account.trialRoomCode,
          rulesTier: account.preferredRulesTier,
          ageGroup: account.preferredAgeGroup,
          familyName: account.familyName,
          householdId: account.id,
        })
      )
    : ensureAccountSessionRoom(account);

  if (isNewAccount && process.env.NODE_ENV !== "test") {
    saveRoomsToDisk();
  }

  const token = signSessionToken(account.id, account.email);
  return { account, token, room, isNewAccount };
}

export function listVttAccountsForAdmin(): VttPublicAccount[] {
  return withAuthDb((db) => {
    const rows = db
      .prepare("SELECT * FROM vtt_accounts ORDER BY created_at ASC")
      .all() as Array<Record<string, any>>;
    return rows.map((r) => syncTierFromHouseholds(db, r));
  });
}

export function setVttAccountRoleByAdmin(params: {
  targetAccountId: string;
  nextRole: VttAccountRole;
}): VttPublicAccount {
  return withAuthDb((db) => {
    const target = db
      .prepare("SELECT * FROM vtt_accounts WHERE id = ?")
      .get(params.targetAccountId) as Record<string, any> | undefined;
    if (!target) {
      throw new Error("Target account not found.");
    }
    if (params.nextRole === "USER" && String(target.role) === "ADMIN") {
      const adminCntRow = db
        .prepare("SELECT COUNT(*) AS cnt FROM vtt_accounts WHERE role = 'ADMIN'")
        .get() as { cnt: number };
      if (Number(adminCntRow?.cnt || 0) <= 1) {
        throw new Error("Cannot demote the last remaining Admin account.");
      }
    }
    const now = new Date().toISOString();
    db.prepare("UPDATE vtt_accounts SET role = ?, updated_at = ? WHERE id = ?").run(
      params.nextRole,
      now,
      params.targetAccountId
    );
    const updated = db
      .prepare("SELECT * FROM vtt_accounts WHERE id = ?")
      .get(params.targetAccountId) as Record<string, any>;
    return syncTierFromHouseholds(db, updated);
  });
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

export function computeRoomInviteSig(roomCode: string): string {
  const clean = (roomCode || "").trim().toUpperCase();
  return crypto
    .createHmac("sha256", getAuthSecret())
    .update(`hq_invite:${clean}`)
    .digest("hex")
    .slice(0, 12);
}

export function verifyRoomInviteSig(roomCode: string, sig?: string): boolean {
  if (!roomCode || !sig) return false;
  const expected = computeRoomInviteSig(roomCode);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sig.trim(), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function signRoomGuestToken(
  roomCode: string,
  mode: "PLAYER_CONTROLLER" | "TABLE_TV_DISPLAY" = "PLAYER_CONTROLLER"
): string {
  const cleanRoom = (roomCode || "").trim().toUpperCase();
  const exp = Date.now() + 1000 * 60 * 60 * 24;
  const payload = Buffer.from(
    JSON.stringify({ kind: "GUEST_INVITE", roomCode: cleanRoom, mode, exp })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(`guest:${payload}`)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyRoomGuestToken(token?: string): {
  roomCode: string;
  mode: "PLAYER_CONTROLLER" | "TABLE_TV_DISPLAY";
} | null {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto
    .createHmac("sha256", getAuthSecret())
    .update(`guest:${payload}`)
    .digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      kind?: string;
      roomCode?: string;
      mode?: "PLAYER_CONTROLLER" | "TABLE_TV_DISPLAY";
      exp?: number;
    };
    if (parsed.kind !== "GUEST_INVITE" || !parsed.roomCode) return null;
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return {
      roomCode: parsed.roomCode.toUpperCase(),
      mode: parsed.mode === "TABLE_TV_DISPLAY" ? "TABLE_TV_DISPLAY" : "PLAYER_CONTROLLER",
    };
  } catch {
    return null;
  }
}

export function authorizeRoomAccess(params: {
  requestedRoomCode?: string;
  account: VttPublicAccount | null;
  guestToken?: string;
  requireGmOwner?: boolean;
}): {
  authorized: boolean;
  status: 200 | 401 | 403;
  resolvedRoomCode: string;
  isGuest: boolean;
  error?: string;
} {
  const cleanReq = (params.requestedRoomCode || "").trim().toUpperCase().slice(0, 4);

  if (params.account) {
    const ownCode = params.account.trialRoomCode.toUpperCase();
    const targetCode = cleanReq || ownCode;
    if (targetCode === ownCode) {
      return {
        authorized: true,
        status: 200,
        resolvedRoomCode: ownCode,
        isGuest: false,
      };
    }
    if (hasRoomInStore(targetCode)) {
      const targetRoom = getOrCreateRoom(targetCode);
      if (targetRoom.householdId === params.account.id) {
        return {
          authorized: true,
          status: 200,
          resolvedRoomCode: targetCode,
          isGuest: false,
        };
      }
    }
    return {
      authorized: false,
      status: 403,
      resolvedRoomCode: ownCode,
      isGuest: false,
      error: "Access denied: you can only open and modify your own session instance.",
    };
  }

  const guest = verifyRoomGuestToken(params.guestToken);
  if (guest) {
    if (cleanReq && cleanReq !== guest.roomCode) {
      return {
        authorized: false,
        status: 403,
        resolvedRoomCode: guest.roomCode,
        isGuest: true,
        error: `Guest pass is only authorized for Room ${guest.roomCode}.`,
      };
    }
    if (params.requireGmOwner) {
      return {
        authorized: false,
        status: 403,
        resolvedRoomCode: guest.roomCode,
        isGuest: true,
        error: "Host sign-in required for GM controls.",
      };
    }
    if (!hasRoomInStore(guest.roomCode)) {
      return {
        authorized: false,
        status: 401,
        resolvedRoomCode: guest.roomCode,
        isGuest: true,
        error: "Host session is not active yet. Please ask the host to sign in first.",
      };
    }
    return {
      authorized: true,
      status: 200,
      resolvedRoomCode: guest.roomCode,
      isGuest: true,
    };
  }

  return {
    authorized: false,
    status: 401,
    resolvedRoomCode: "",
    isGuest: false,
    error: "Authentication required. Please sign in or create an account to launch your own VTT session.",
  };
}
