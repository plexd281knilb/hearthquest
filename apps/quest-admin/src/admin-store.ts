/**
 * HearthQuest Admin Store, Stripe Checkout & Signed Webhook Engine,
 * Cryptographic License Key Authority, and Print-on-Demand Fulfillment Queue.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  FulfillmentOrderStatus,
  HouseholdAccount,
  PrintFulfillmentOrder,
  PrintFulfillmentPackage,
  ProcessedWebhookEvent,
  SubscriptionPlan,
  SubscriptionTier,
} from "@hearthquest/shared-types";

export const PHYSICAL_PACKAGES: PrintFulfillmentPackage[] = [
  {
    id: "pkg-starter-box",
    campaignId: "camp-goblin-bakery",
    title: "The Goblin Bakery Heist — Family Tabletop Box",
    includedMapsCount: 3,
    includedStandeesCount: 12,
    includedActionCardsCount: 24,
    includesDryEraseGrid: true,
    includesPhysicalDiceSet: true,
    includesHardcoverKeepsake: false,
    priceUsd: 34,
    unpluggedCampingFlowchartIncluded: true,
  },
  {
    id: "pkg-deluxe-keepsake",
    campaignId: "camp-goblin-bakery",
    title: "Deluxe Collector Box + Custom Hardcover Family Storybook",
    includedMapsCount: 6,
    includedStandeesCount: 24,
    includedActionCardsCount: 48,
    includesDryEraseGrid: true,
    includesPhysicalDiceSet: true,
    includesHardcoverKeepsake: true,
    priceUsd: 59,
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
      "Full 3-Screen Family VTT & 3D Polyhedral Dice",
      "Dynamic 2D Raycast Torch Lighting & Foundry Token Forge",
      "Bring Your Own RTX 3080 Ollama or Gemini Key",
      "Unlimited Local Rooms & Custom Unraid Tokens",
    ],
  },
  {
    tier: "DIGITAL_PLUS",
    name: "HearthQuest Digital+ Cloud",
    priceMonthlyUsd: 9,
    badge: "Most Popular",
    features: [
      "Managed Cloud AI GM Narration (Zero API Setup)",
      "All 3 Multi-Chapter Family Campaigns + Monthly Releases",
      "Signed Pro License Key for Unraid & Cloud Sync",
      "Instant Printable Home PDF Kits & Character Sheets",
    ],
  },
  {
    tier: "GAME_IN_A_BOX_PRO",
    name: "Game-in-a-Box Collector Club",
    priceMonthlyUsd: 29,
    badge: "Physical + Digital",
    features: [
      "Everything in Digital+ Cloud",
      "Quarterly Shipped Laminated Maps, Standees & Dice Box",
      "Annual Custom Hardcover Family Adventure Storybook",
      "Priority Print-on-Demand Fulfillment Queue",
    ],
  },
];

interface AdminStoreData {
  households: HouseholdAccount[];
  orders: PrintFulfillmentOrder[];
  processedWebhooks: ProcessedWebhookEvent[];
}

const memoryStore: AdminStoreData = {
  households: [],
  orders: [],
  processedWebhooks: [],
};

function getLicenseSigningSecret(): string {
  return (
    process.env.HEARTHQUEST_LICENSE_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    "hearthquest-default-unraid-signing-secret-2026"
  );
}

export function getAdminStoreFilePath(): string {
  if (process.env.NODE_ENV === "test") {
    return path.join(process.cwd(), "data", ".test", "test-admin-store.json");
  }
  const dataDir = process.env.HEARTHQUEST_DATA_DIR || path.join(process.cwd(), "data");
  return path.join(dataDir, "admin-store.json");
}

export function saveAdminStoreToDisk(): void {
  const filePath = getAdminStoreFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(memoryStore, null, 2), "utf-8");
}

export function loadAdminStoreFromDisk(): AdminStoreData {
  const filePath = getAdminStoreFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Partial<AdminStoreData>;
      memoryStore.households = Array.isArray(parsed.households) ? parsed.households : [];
      memoryStore.orders = Array.isArray(parsed.orders) ? parsed.orders : [];
      memoryStore.processedWebhooks = Array.isArray(parsed.processedWebhooks)
        ? parsed.processedWebhooks
        : [];
    } catch {
      // Keep current memory state on malformed file
    }
  }
  if (memoryStore.households.length === 0) {
    const now = new Date().toISOString();
    const defaultHhId = "hh-unraid-founder";
    memoryStore.households.push({
      id: defaultHhId,
      familyName: "The Founder Household",
      email: "founder@hearthquest.local",
      subscriptionTier: "GAME_IN_A_BOX_PRO",
      subscriptionStatus: "ACTIVE",
      defaultRulesTier: "STORYBOOK_D6",
      defaultContentRating: "COZY_G",
      licenseKey: generateLicenseKey(defaultHhId, "GAME_IN_A_BOX_PRO"),
      aiMonthlyQuotaUsed: 12,
      createdAt: now,
      updatedAt: now,
    });
  }
  return memoryStore;
}

export function resetAdminStoreForTesting(): void {
  memoryStore.households = [];
  memoryStore.orders = [];
  memoryStore.processedWebhooks = [];
  const filePath = getAdminStoreFilePath();
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Ignore unlink race
    }
  }
  loadAdminStoreFromDisk();
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

/**
 * Timing-safe Operator PIN check (protects /api/admin/* and fulfillment transitions).
 */
export function verifyOperatorPin(pin: string): boolean {
  const expected = process.env.HEARTHQUEST_ADMIN_PIN || "1234";
  const a = Buffer.from(String(pin || ""), "utf-8");
  const b = Buffer.from(expected, "utf-8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verifies a Stripe-Signature header (`t=<timestamp>,v1=<hmac>`) using HMAC-SHA256.
 */
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

/**
 * Helper to create a valid Stripe-Signature header for local/automated webhook testing.
 */
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

/**
 * Idempotent Webhook Event Processor:
 * Guarantees every event.id is processed at most once.
 */
export function processPaymentWebhookEvent(event: StripeLikeWebhookEvent): {
  processed: boolean;
  duplicate: boolean;
  household?: HouseholdAccount;
  order?: PrintFulfillmentOrder;
} {
  loadAdminStoreFromDisk();

  if (!event || !event.id) {
    throw new Error("Webhook event missing id");
  }

  const alreadyProcessed = memoryStore.processedWebhooks.find(
    (w) => w.eventId === event.id
  );
  if (alreadyProcessed) {
    return { processed: false, duplicate: true };
  }

  const now = new Date().toISOString();
  const obj = event.data?.object || {};
  const meta = obj.metadata || {};
  const email = (meta.email || obj.customer_email || "family@hearthquest.local")
    .trim()
    .toLowerCase();
  const familyName = (meta.familyName || "Adventuring Family").trim();

  let household = memoryStore.households.find((h) => h.email.toLowerCase() === email);
  if (!household) {
    const newId = `hh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const initialTier: SubscriptionTier = meta.subscriptionTier || "FREE_SELF_HOSTED";
    household = {
      id: newId,
      familyName,
      email,
      subscriptionTier: initialTier,
      subscriptionStatus: meta.paymentMode === "STRIPE_LIVE" ? "ACTIVE" : "SANDBOX",
      defaultRulesTier: "STORYBOOK_D6",
      defaultContentRating: "COZY_G",
      stripeCustomerId: obj.customer,
      stripeSubscriptionId: obj.subscription,
      licenseKey: generateLicenseKey(newId, initialTier),
      aiMonthlyQuotaUsed: 0,
      createdAt: now,
      updatedAt: now,
    };
    memoryStore.households.unshift(household);
  }

  let createdOrder: PrintFulfillmentOrder | undefined;

  if (event.type === "checkout.session.completed") {
    if (meta.subscriptionTier) {
      household.subscriptionTier = meta.subscriptionTier;
      household.subscriptionStatus =
        meta.paymentMode === "STRIPE_LIVE" ? "ACTIVE" : "SANDBOX";
      household.licenseKey = generateLicenseKey(household.id, meta.subscriptionTier);
      household.updatedAt = now;
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
      memoryStore.orders.unshift(createdOrder);

      if (pkg.includesHardcoverKeepsake && household.subscriptionTier === "FREE_SELF_HOSTED") {
        household.subscriptionTier = "DIGITAL_PLUS";
        household.licenseKey = generateLicenseKey(household.id, "DIGITAL_PLUS");
      }
    }
  } else if (event.type === "customer.subscription.deleted") {
    household.subscriptionTier = "FREE_SELF_HOSTED";
    household.subscriptionStatus = "CANCELED";
    household.licenseKey = generateLicenseKey(household.id, "FREE_SELF_HOSTED");
    household.updatedAt = now;
  }

  memoryStore.processedWebhooks.unshift({
    eventId: event.id,
    eventType: event.type,
    processedAt: now,
  });

  saveAdminStoreToDisk();
  return {
    processed: true,
    duplicate: false,
    household,
    order: createdOrder,
  };
}

/**
 * Creates a Checkout Session using authoritative server-side prices.
 * Automatically runs in Sandbox Mode when STRIPE_SECRET_KEY is not configured.
 */
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

  // Unraid Local / Sandbox Mode: Execute signed webhook pipeline locally
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

/**
 * Operator-authenticated state transition for Print-on-Demand orders.
 */
export function advanceFulfillmentOrder(params: {
  orderId: string;
  nextStatus: FulfillmentOrderStatus;
  trackingNumber?: string;
  adminPin: string;
}): PrintFulfillmentOrder {
  if (!verifyOperatorPin(params.adminPin)) {
    throw new Error("Invalid Operator PIN");
  }
  loadAdminStoreFromDisk();
  const order = memoryStore.orders.find((o) => o.id === params.orderId);
  if (!order) {
    throw new Error(`Order not found: ${params.orderId}`);
  }
  order.status = params.nextStatus;
  if (params.trackingNumber) {
    order.trackingNumber = params.trackingNumber.trim();
  }
  order.updatedAt = new Date().toISOString();
  saveAdminStoreToDisk();
  return order;
}

export function getAdminStoreSnapshot(): {
  paymentGatewayMode: "STRIPE_LIVE" | "SANDBOX_SIMULATED";
  households: HouseholdAccount[];
  orders: PrintFulfillmentOrder[];
  processedWebhooksCount: number;
  plans: SubscriptionPlan[];
  packages: PrintFulfillmentPackage[];
} {
  loadAdminStoreFromDisk();
  const stripeSecret = (process.env.STRIPE_SECRET_KEY || "").trim();
  return {
    paymentGatewayMode:
      stripeSecret && stripeSecret.startsWith("sk_")
        ? "STRIPE_LIVE"
        : "SANDBOX_SIMULATED",
    households: memoryStore.households,
    orders: memoryStore.orders,
    processedWebhooksCount: memoryStore.processedWebhooks.length,
    plans: SUBSCRIPTION_PLANS,
    packages: PHYSICAL_PACKAGES,
  };
}
