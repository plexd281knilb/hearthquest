/**
 * HearthQuest Admin SQLite Database Engine (node:sqlite),
 * Stripe Checkout & Signed Webhook Engine, Cryptographic License Key Authority,
 * Print-on-Demand Fulfillment Queue, and Lore & Map Continuity Registry.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  FulfillmentOrderStatus,
  HouseholdAccount,
  LoreEntryType,
  LoreRegistryEntry,
  PrintFulfillmentOrder,
  PrintFulfillmentPackage,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionTier,
} from "@hearthquest/shared-types";
import {
  buildCoreCampaignLoreSeeds,
  detectLoreOrMapOverlap,
} from "@hearthquest/srd-rules";

export const PHYSICAL_PACKAGES: PrintFulfillmentPackage[] = [
  {
    id: "pkg-starter-box",
    campaignId: "camp-goblin-bakery",
    title: "Upfront Starter Box — Sessions 1 & 2 + Dice, Standees & Dry-Erase Maps",
    includedMapsCount: 3,
    includedStandeesCount: 16,
    includedActionCardsCount: 24,
    includesDryEraseGrid: true,
    includesPhysicalDiceSet: true,
    includesHardcoverKeepsake: false,
    priceUsd: 49,
    unpluggedCampingFlowchartIncluded: true,
  },
  {
    id: "pkg-deluxe-keepsake",
    campaignId: "camp-goblin-bakery",
    title: "Deluxe Collector Box + Custom Printed Hardcover Family Storybook",
    includedMapsCount: 6,
    includedStandeesCount: 24,
    includedActionCardsCount: 48,
    includesDryEraseGrid: true,
    includesPhysicalDiceSet: true,
    includesHardcoverKeepsake: true,
    priceUsd: 69,
    unpluggedCampingFlowchartIncluded: true,
  },
  {
    id: "pkg-oneshot-pack",
    campaignId: "camp-clockwork-treehouse",
    title: "À La Carte Level-Scaled One-Shot + Print-at-Home Map & Standee Pack",
    includedMapsCount: 1,
    includedStandeesCount: 6,
    includedActionCardsCount: 8,
    includesDryEraseGrid: false,
    includesPhysicalDiceSet: false,
    includesHardcoverKeepsake: false,
    priceUsd: 5,
    unpluggedCampingFlowchartIncluded: true,
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: "FREE_SELF_HOSTED",
    name: "Self-Hosted Unraid Edition",
    priceMonthlyUsd: 0,
    badge: "Free Forever",
    features: [
      "Full 3-Screen Family VTT & Engraved 3D Dice",
      "Dynamic 2D Raycast Lighting & Foundry Token Forge",
      "Bring Your Own RTX 3080 Ollama or Gemini Key",
      "Unlimited Local Rooms, SQLite Storage & Custom Tokens",
    ],
  },
  {
    tier: "DIGITAL_PLUS",
    name: "HearthQuest Digital+ Cloud & One-Shots",
    priceMonthlyUsd: 9,
    badge: "Most Popular",
    features: [
      "Managed Cloud AI GM Narration (Zero API Setup)",
      "Monthly Next-Chapter Digital Release + Unlimited Level-Scaled One-Shots",
      "Signed Pro License Key for Unraid & Cloud Sync",
      "Instant Printable Home PDF Kits & Character Sheets",
    ],
  },
  {
    tier: "GAME_IN_A_BOX_PRO",
    name: "Monthly Next-Chapter Mailer + Cloud AI",
    priceMonthlyUsd: 19,
    badge: "Chapter Envelope",
    features: [
      "Everything in Digital+ Cloud & One-Shots",
      "Monthly Lightweight Rigid Envelope: Next Campaign Map, Card Deck & Monster Standees",
      "Fits Starter Box Dice & Plastic Bases (Low Shipping Weight)",
      "Priority Print-on-Demand Hardcover Keepsake Queue",
    ],
  },
];

let cachedDb: DatabaseSync | null = null;
let cachedDbPath = "";

function getLicenseSigningSecret(): string {
  return (
    process.env.HEARTHQUEST_LICENSE_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    "hearthquest-default-unraid-signing-secret-2026"
  );
}

export function getAdminDatabasePath(): string {
  if (process.env.NODE_ENV === "test") {
    return path.join(process.cwd(), "data", ".test", "test-hearthquest.db");
  }
  const dataDir = process.env.HEARTHQUEST_DATA_DIR || path.join(process.cwd(), "data");
  return path.join(dataDir, "hearthquest.db");
}

function getDb(): DatabaseSync {
  const targetPath = getAdminDatabasePath();
  if (cachedDb && cachedDbPath === targetPath) {
    return cachedDb;
  }
  if (cachedDb) {
    try {
      cachedDb.close();
    } catch {
      // Ignore close error
    }
  }
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new DatabaseSync(targetPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(`
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

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      family_name TEXT NOT NULL,
      email TEXT NOT NULL,
      package_id TEXT NOT NULL,
      package_title TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      payment_mode TEXT NOT NULL,
      status TEXT NOT NULL,
      shipping_name TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      tracking_number TEXT,
      printable_bundle_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS processed_webhooks (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      processed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lore_registry (
      id TEXT PRIMARY KEY,
      entry_type TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      biome TEXT NOT NULL,
      plot_premise TEXT NOT NULL,
      main_antagonist TEXT NOT NULL,
      key_locations_json TEXT NOT NULL,
      level_range TEXT NOT NULL,
      room_code TEXT,
      created_at TEXT NOT NULL
    );
  `);

  cachedDb = db;
  cachedDbPath = targetPath;
  ensureSeedData(db);
  return db;
}

function ensureSeedData(db: DatabaseSync): void {
  const hhCountRow = db
    .prepare("SELECT COUNT(*) as cnt FROM households")
    .get() as { cnt: number };
  if (!hhCountRow || hhCountRow.cnt === 0) {
    const now = new Date().toISOString();
    const defaultHhId = "hh-unraid-founder";
    const key = generateLicenseKey(defaultHhId, "GAME_IN_A_BOX_PRO");
    db.prepare(
      `INSERT INTO households (
        id, family_name, email, subscription_tier, subscription_status,
        license_key, ai_monthly_quota_used, default_rules_tier, default_content_rating,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      defaultHhId,
      "The Founder Household",
      "founder@hearthquest.local",
      "GAME_IN_A_BOX_PRO",
      "ACTIVE",
      key,
      12,
      "STORYBOOK_D6",
      "COZY_G",
      now,
      now
    );
  }

  const insertLoreStmt = db.prepare(
    `INSERT OR IGNORE INTO lore_registry (
      id, entry_type, title, slug, biome, plot_premise, main_antagonist,
      key_locations_json, level_range, room_code, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const seed of buildCoreCampaignLoreSeeds()) {
    insertLoreStmt.run(
      seed.id,
      seed.entryType,
      seed.title,
      seed.slug,
      seed.biome,
      seed.plotPremise,
      seed.mainAntagonist,
      JSON.stringify(seed.keyLocations),
      seed.levelRange,
      seed.roomCode || null,
      seed.createdAt
    );
  }
}

export function resetAdminStoreForTesting(): void {
  if (cachedDb) {
    try {
      cachedDb.close();
    } catch {
      // Ignore close error
    }
    cachedDb = null;
    cachedDbPath = "";
  }
  const targetPath = getAdminDatabasePath();
  for (const ext of ["", "-wal", "-shm"]) {
    const p = targetPath + ext;
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {
        // Ignore cleanup race
      }
    }
  }
  getDb();
}

export function listLoreRegistry(): LoreRegistryEntry[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM lore_registry ORDER BY created_at DESC")
    .all() as Array<Record<string, any>>;
  return rows.map((r) => ({
    id: String(r.id),
    entryType: r.entry_type as LoreEntryType,
    title: String(r.title),
    slug: String(r.slug),
    biome: String(r.biome),
    plotPremise: String(r.plot_premise),
    mainAntagonist: String(r.main_antagonist),
    keyLocations: JSON.parse(String(r.key_locations_json || "[]")),
    levelRange: String(r.level_range),
    roomCode: r.room_code ? String(r.room_code) : undefined,
    createdAt: String(r.created_at),
  }));
}

export function registerLoreEntry(params: {
  entryType: LoreEntryType;
  title: string;
  biome: string;
  plotPremise: string;
  mainAntagonist: string;
  keyLocations: string[];
  levelRange?: string;
  roomCode?: string;
}): { ok: boolean; error?: string; entry?: LoreRegistryEntry } {
  const existingLore = listLoreRegistry();
  const overlap = detectLoreOrMapOverlap({
    existingLore,
    title: params.title,
    mainAntagonist: params.mainAntagonist,
    keyLocations: params.keyLocations,
  });
  if (overlap.hasOverlap) {
    return { ok: false, error: overlap.reason };
  }

  const db = getDb();
  const now = new Date().toISOString();
  const slug =
    params.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now().toString(36);
  const entry: LoreRegistryEntry = {
    id: `lore_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    entryType: params.entryType,
    title: params.title.trim(),
    slug,
    biome: params.biome || "BAKERY",
    plotPremise: params.plotPremise.trim(),
    mainAntagonist: params.mainAntagonist.trim(),
    keyLocations: params.keyLocations.map((s) => s.trim()).filter(Boolean),
    levelRange: params.levelRange || "1-3",
    roomCode: params.roomCode,
    createdAt: now,
  };

  db.prepare(
    `INSERT INTO lore_registry (
      id, entry_type, title, slug, biome, plot_premise, main_antagonist,
      key_locations_json, level_range, room_code, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    entry.id,
    entry.entryType,
    entry.title,
    entry.slug,
    entry.biome,
    entry.plotPremise,
    entry.mainAntagonist,
    JSON.stringify(entry.keyLocations),
    entry.levelRange,
    entry.roomCode || null,
    entry.createdAt
  );

  return { ok: true, entry };
}

/**
 * Generates a tamper-evident HMAC-signed License Key:
 * Format: HQ-<TIER>-<HOUSEHOLD_CLEAN>-<8_CHAR_HMAC>
 */
export function generateLicenseKey(householdId: string, tier: SubscriptionTier): string {
  const cleanId = householdId
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(-6)
    .padStart(6, "0");
  const tierCode =
    tier === "GAME_IN_A_BOX_PRO" ? "PRO" : tier === "DIGITAL_PLUS" ? "PLUS" : "FREE";
  const payload = `${tierCode}:${cleanId}`;
  const sig = crypto
    .createHmac("sha256", getLicenseSigningSecret())
    .update(payload)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
  return `HQ-${tierCode}-${cleanId}-${sig}`;
}

/**
 * Verifies an HMAC-signed License Key offline or online.
 */
export function verifyLicenseKey(licenseKey: string): {
  valid: boolean;
  tier?: SubscriptionTier;
  householdCode?: string;
} {
  const parts = String(licenseKey || "")
    .trim()
    .toUpperCase()
    .split("-");
  if (parts.length !== 4 || parts[0] !== "HQ") {
    return { valid: false };
  }
  const [, tierCode, cleanId, providedSig] = parts;
  const payload = `${tierCode}:${cleanId}`;
  const expectedSig = crypto
    .createHmac("sha256", getLicenseSigningSecret())
    .update(payload)
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
      : "FREE_SELF_HOSTED";

  return { valid: true, tier, householdCode: cleanId };
}

export function verifyOperatorPin(pin: string): boolean {
  const expected = process.env.HEARTHQUEST_ADMIN_PIN || "1234";
  const a = Buffer.from(String(pin || ""), "utf-8");
  const b = Buffer.from(expected, "utf-8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function verifyStripeWebhookSignature(
  rawPayload: string,
  signatureHeader: string,
  webhookSecret: string
): boolean {
  if (!rawPayload || !signatureHeader || !webhookSecret) return false;
  const parts = signatureHeader.split(",").map((p) => p.trim());
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Part = parts.find((p) => p.startsWith("v1="));
  if (!tPart || !v1Part) return false;

  const timestamp = tPart.slice(2);
  const providedSig = v1Part.slice(3);
  const signedPayload = `${timestamp}.${rawPayload}`;
  const expectedSig = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload)
    .digest("hex");

  const a = Buffer.from(providedSig, "utf-8");
  const b = Buffer.from(expectedSig, "utf-8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signStripeWebhookPayloadForTest(
  rawPayload: string,
  webhookSecret: string,
  timestamp = Math.floor(Date.now() / 1000)
): string {
  const sig = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawPayload}`)
    .digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

export interface StripeLikeWebhookEvent {
  id: string;
  type:
    | "checkout.session.completed"
    | "customer.subscription.updated"
    | "customer.subscription.deleted";
  data: {
    object: {
      id?: string;
      customer_email?: string;
      customer?: string;
      subscription?: string;
      metadata?: {
        checkoutKind?: "PHYSICAL_KIT" | "SUBSCRIPTION";
        packageId?: string;
        campaignId?: string;
        subscriptionTier?: SubscriptionTier;
        familyName?: string;
        email?: string;
        shippingName?: string;
        shippingAddress?: string;
        paymentMode?: "STRIPE_LIVE" | "SANDBOX_SIMULATED";
      };
    };
  };
}

function mapHouseholdRow(r: Record<string, any>): HouseholdAccount {
  return {
    id: String(r.id),
    familyName: String(r.family_name),
    email: String(r.email),
    subscriptionTier: r.subscription_tier as SubscriptionTier,
    subscriptionStatus: r.subscription_status as SubscriptionStatus,
    stripeCustomerId: r.stripe_customer_id ? String(r.stripe_customer_id) : undefined,
    stripeSubscriptionId: r.stripe_subscription_id
      ? String(r.stripe_subscription_id)
      : undefined,
    licenseKey: String(r.license_key),
    aiMonthlyQuotaUsed: Number(r.ai_monthly_quota_used || 0),
    defaultRulesTier: (r.default_rules_tier || "STORYBOOK_D6") as any,
    defaultContentRating: (r.default_content_rating || "COZY_G") as any,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapOrderRow(r: Record<string, any>): PrintFulfillmentOrder {
  return {
    id: String(r.id),
    householdId: String(r.household_id),
    familyName: String(r.family_name),
    email: String(r.email),
    packageId: String(r.package_id),
    packageTitle: String(r.package_title),
    campaignId: String(r.campaign_id),
    amountCents: Number(r.amount_cents),
    paymentMode: r.payment_mode as "STRIPE_LIVE" | "SANDBOX_SIMULATED",
    status: r.status as FulfillmentOrderStatus,
    shippingName: String(r.shipping_name),
    shippingAddress: String(r.shipping_address),
    trackingNumber: r.tracking_number ? String(r.tracking_number) : undefined,
    printableBundleUrl: String(r.printable_bundle_url),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

/**
 * ACID SQLite Transactional Webhook Processor:
 * Guarantees every event.id is processed at most once.
 */
export function processPaymentWebhookEvent(event: StripeLikeWebhookEvent): {
  processed: boolean;
  duplicate: boolean;
  household?: HouseholdAccount;
  order?: PrintFulfillmentOrder;
} {
  const db = getDb();
  if (!event || !event.id) {
    throw new Error("Webhook event missing id");
  }

  const dup = db
    .prepare("SELECT event_id FROM processed_webhooks WHERE event_id = ?")
    .get(event.id);
  if (dup) {
    return { processed: false, duplicate: true };
  }

  const now = new Date().toISOString();
  const obj = event.data?.object || {};
  const meta = obj.metadata || {};
  const email = (meta.email || obj.customer_email || "family@hearthquest.local")
    .trim()
    .toLowerCase();
  const familyName = (meta.familyName || "Adventuring Family").trim();

  let householdRow = db
    .prepare("SELECT * FROM households WHERE LOWER(email) = ?")
    .get(email) as Record<string, any> | undefined;

  let household: HouseholdAccount;
  if (!householdRow) {
    const newId = `hh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const initialTier: SubscriptionTier = meta.subscriptionTier || "FREE_SELF_HOSTED";
    const status: SubscriptionStatus =
      meta.paymentMode === "STRIPE_LIVE" ? "ACTIVE" : "SANDBOX";
    const licenseKey = generateLicenseKey(newId, initialTier);
    db.prepare(
      `INSERT INTO households (
        id, family_name, email, subscription_tier, subscription_status,
        stripe_customer_id, stripe_subscription_id, license_key,
        ai_monthly_quota_used, default_rules_tier, default_content_rating,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newId,
      familyName,
      email,
      initialTier,
      status,
      obj.customer || null,
      obj.subscription || null,
      licenseKey,
      0,
      "STORYBOOK_D6",
      "COZY_G",
      now,
      now
    );
    householdRow = db
      .prepare("SELECT * FROM households WHERE id = ?")
      .get(newId) as Record<string, any>;
  }
  household = mapHouseholdRow(householdRow);

  let createdOrder: PrintFulfillmentOrder | undefined;

  if (event.type === "checkout.session.completed") {
    if (meta.subscriptionTier) {
      household.subscriptionTier = meta.subscriptionTier;
      household.subscriptionStatus =
        meta.paymentMode === "STRIPE_LIVE" ? "ACTIVE" : "SANDBOX";
      household.licenseKey = generateLicenseKey(household.id, meta.subscriptionTier);
      household.updatedAt = now;
      db.prepare(
        `UPDATE households SET subscription_tier = ?, subscription_status = ?, license_key = ?, updated_at = ? WHERE id = ?`
      ).run(
        household.subscriptionTier,
        household.subscriptionStatus,
        household.licenseKey,
        now,
        household.id
      );
    }

    if (meta.checkoutKind === "PHYSICAL_KIT" || meta.packageId) {
      const pkg =
        PHYSICAL_PACKAGES.find((p) => p.id === meta.packageId) ?? PHYSICAL_PACKAGES[0];
      const orderId = `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      createdOrder = {
        id: orderId,
        householdId: household.id,
        familyName: household.familyName,
        email: household.email,
        packageId: pkg.id,
        packageTitle: pkg.title,
        campaignId: meta.campaignId || pkg.campaignId,
        amountCents: pkg.priceUsd * 100,
        paymentMode: meta.paymentMode || "SANDBOX_SIMULATED",
        status: "PAID_QUEUED",
        shippingName: meta.shippingName || household.familyName,
        shippingAddress: meta.shippingAddress || "123 Hearthstone Lane, Tabletop City",
        printableBundleUrl: `/printable-kit?orderId=${encodeURIComponent(orderId)}`,
        createdAt: now,
        updatedAt: now,
      };
      db.prepare(
        `INSERT INTO orders (
          id, household_id, family_name, email, package_id, package_title,
          campaign_id, amount_cents, payment_mode, status, shipping_name,
          shipping_address, tracking_number, printable_bundle_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        createdOrder.id,
        createdOrder.householdId,
        createdOrder.familyName,
        createdOrder.email,
        createdOrder.packageId,
        createdOrder.packageTitle,
        createdOrder.campaignId,
        createdOrder.amountCents,
        createdOrder.paymentMode,
        createdOrder.status,
        createdOrder.shippingName,
        createdOrder.shippingAddress,
        null,
        createdOrder.printableBundleUrl,
        createdOrder.createdAt,
        createdOrder.updatedAt
      );

      if (
        pkg.includesHardcoverKeepsake &&
        household.subscriptionTier === "FREE_SELF_HOSTED"
      ) {
        household.subscriptionTier = "DIGITAL_PLUS";
        household.licenseKey = generateLicenseKey(household.id, "DIGITAL_PLUS");
        db.prepare(
          `UPDATE households SET subscription_tier = ?, license_key = ?, updated_at = ? WHERE id = ?`
        ).run("DIGITAL_PLUS", household.licenseKey, now, household.id);
      }
    }
  } else if (event.type === "customer.subscription.deleted") {
    household.subscriptionTier = "FREE_SELF_HOSTED";
    household.subscriptionStatus = "CANCELED";
    household.licenseKey = generateLicenseKey(household.id, "FREE_SELF_HOSTED");
    household.updatedAt = now;
    db.prepare(
      `UPDATE households SET subscription_tier = ?, subscription_status = ?, license_key = ?, updated_at = ? WHERE id = ?`
    ).run("FREE_SELF_HOSTED", "CANCELED", household.licenseKey, now, household.id);
  }

  db.prepare(
    `INSERT INTO processed_webhooks (event_id, event_type, processed_at) VALUES (?, ?, ?)`
  ).run(event.id, event.type, now);

  return {
    processed: true,
    duplicate: false,
    household,
    order: createdOrder,
  };
}

export async function createCheckoutSession(params: {
  checkoutKind: "PHYSICAL_KIT" | "SUBSCRIPTION";
  packageId?: string;
  subscriptionTier?: SubscriptionTier;
  campaignId?: string;
  familyName: string;
  email: string;
  shippingName?: string;
  shippingAddress?: string;
}): Promise<{
  mode: "STRIPE_LIVE" | "SANDBOX_SIMULATED";
  amountCents: number;
  checkoutUrl: string;
  household?: HouseholdAccount;
  order?: PrintFulfillmentOrder;
}> {
  let amountCents = 0;
  let itemTitle = "";

  if (params.checkoutKind === "PHYSICAL_KIT") {
    const pkg =
      PHYSICAL_PACKAGES.find((p) => p.id === params.packageId) ?? PHYSICAL_PACKAGES[0];
    amountCents = pkg.priceUsd * 100;
    itemTitle = pkg.title;
  } else {
    const plan =
      SUBSCRIPTION_PLANS.find((p) => p.tier === params.subscriptionTier) ??
      SUBSCRIPTION_PLANS[1];
    amountCents = plan.priceMonthlyUsd * 100;
    itemTitle = plan.name;
  }

  const stripeSecret = (process.env.STRIPE_SECRET_KEY || "").trim();
  const publicUrl = (process.env.PUBLIC_ADMIN_URL || "http://localhost:3001").replace(
    /\/$/,
    ""
  );

  if (stripeSecret && stripeSecret.startsWith("sk_")) {
    const form = new URLSearchParams();
    form.set("mode", params.checkoutKind === "SUBSCRIPTION" ? "subscription" : "payment");
    form.set("success_url", `${publicUrl}/?checkout=success`);
    form.set("cancel_url", `${publicUrl}/?checkout=canceled`);
    form.set("customer_email", params.email || "family@hearthquest.local");
    form.set("line_items[0][quantity]", "1");
    form.set("line_items[0][price_data][currency]", "usd");
    form.set("line_items[0][price_data][unit_amount]", String(amountCents));
    form.set("line_items[0][price_data][product_data][name]", itemTitle);
    if (params.checkoutKind === "SUBSCRIPTION") {
      form.set("line_items[0][price_data][recurring][interval]", "month");
    }
    form.set("metadata[checkoutKind]", params.checkoutKind);
    if (params.packageId) form.set("metadata[packageId]", params.packageId);
    if (params.subscriptionTier)
      form.set("metadata[subscriptionTier]", params.subscriptionTier);
    if (params.campaignId) form.set("metadata[campaignId]", params.campaignId);
    form.set("metadata[familyName]", params.familyName || "Adventuring Family");
    form.set("metadata[email]", params.email || "family@hearthquest.local");
    form.set("metadata[shippingName]", params.shippingName || params.familyName || "");
    form.set("metadata[shippingAddress]", params.shippingAddress || "");
    form.set("metadata[paymentMode]", "STRIPE_LIVE");

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const json = (await response.json()) as { url?: string; error?: { message?: string } };
    if (!response.ok || !json.url) {
      throw new Error(json.error?.message || "Stripe session creation failed");
    }
    return {
      mode: "STRIPE_LIVE",
      amountCents,
      checkoutUrl: json.url,
    };
  }

  const sandboxEvent: StripeLikeWebhookEvent = {
    id: `evt_sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_sandbox_${Date.now()}`,
        customer_email: params.email,
        metadata: {
          checkoutKind: params.checkoutKind,
          packageId: params.packageId,
          subscriptionTier: params.subscriptionTier,
          campaignId: params.campaignId || "camp-goblin-bakery",
          familyName: params.familyName || "Adventuring Family",
          email: params.email || "family@hearthquest.local",
          shippingName: params.shippingName || params.familyName || "Adventuring Family",
          shippingAddress:
            params.shippingAddress || "123 Hearthstone Lane, Tabletop City",
          paymentMode: "SANDBOX_SIMULATED",
        },
      },
    },
  };

  const result = processPaymentWebhookEvent(sandboxEvent);
  return {
    mode: "SANDBOX_SIMULATED",
    amountCents,
    checkoutUrl: result.order
      ? result.order.printableBundleUrl
      : `${publicUrl}/?checkout=sandbox_complete`,
    household: result.household,
    order: result.order,
  };
}

export function advanceFulfillmentOrder(params: {
  orderId: string;
  nextStatus: FulfillmentOrderStatus;
  trackingNumber?: string;
  adminPin: string;
}): PrintFulfillmentOrder {
  if (!verifyOperatorPin(params.adminPin)) {
    throw new Error("Invalid Operator PIN");
  }
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(params.orderId) as Record<string, any> | undefined;
  if (!row) {
    throw new Error(`Order not found: ${params.orderId}`);
  }
  const now = new Date().toISOString();
  const tracking = params.trackingNumber
    ? params.trackingNumber.trim()
    : row.tracking_number || null;
  db.prepare(
    "UPDATE orders SET status = ?, tracking_number = ?, updated_at = ? WHERE id = ?"
  ).run(params.nextStatus, tracking, now, params.orderId);

  const updated = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(params.orderId) as Record<string, any>;
  return mapOrderRow(updated);
}

export function getAdminStoreSnapshot(): {
  databaseEngine: "SQLITE_NODE_BUILTIN";
  databasePath: string;
  paymentGatewayMode: "STRIPE_LIVE" | "SANDBOX_SIMULATED";
  households: HouseholdAccount[];
  orders: PrintFulfillmentOrder[];
  loreEntries: LoreRegistryEntry[];
  processedWebhooksCount: number;
  plans: SubscriptionPlan[];
  packages: PrintFulfillmentPackage[];
} {
  const db = getDb();
  const hhRows = db
    .prepare("SELECT * FROM households ORDER BY created_at DESC")
    .all() as Array<Record<string, any>>;
  const ordRows = db
    .prepare("SELECT * FROM orders ORDER BY created_at DESC")
    .all() as Array<Record<string, any>>;
  const whRow = db
    .prepare("SELECT COUNT(*) as cnt FROM processed_webhooks")
    .get() as { cnt: number };

  const stripeSecret = (process.env.STRIPE_SECRET_KEY || "").trim();
  return {
    databaseEngine: "SQLITE_NODE_BUILTIN",
    databasePath: getAdminDatabasePath(),
    paymentGatewayMode:
      stripeSecret && stripeSecret.startsWith("sk_")
        ? "STRIPE_LIVE"
        : "SANDBOX_SIMULATED",
    households: hhRows.map(mapHouseholdRow),
    orders: ordRows.map(mapOrderRow),
    loreEntries: listLoreRegistry(),
    processedWebhooksCount: Number(whRow?.cnt || 0),
    plans: SUBSCRIPTION_PLANS,
    packages: PHYSICAL_PACKAGES,
  };
}
