/**
 * HearthQuest Public Storefront Backend Engine
 * - SQLite-backed Shopping Carts (`store_carts`) & Promo Codes (`promo_codes`)
 * - Server-Authoritative Pricing, Shipping & Discount Quote Calculator
 * - Dynamic Party-Level One-Shot Store Preview Catalog (wired to `lore_registry`)
 * - Multi-Item Storefront Checkout (Stripe Checkout Live OR Unraid Sandbox)
 * - Customer Self-Service Order Tracking Lookup (`orderId` + `email`)
 */

import crypto from "node:crypto";
import {
  LoreRegistryEntry,
  PrintFulfillmentOrder,
  PrintFulfillmentPackage,
  SubscriptionPlan,
  SubscriptionTier,
  secureRandomId,
  validateDisplayName,
} from "@hearthquest/shared-types";
import {
  FAMILY_CAMPAIGNS,
  ONE_SHOT_SIDEQUEST_CATALOG,
} from "@hearthquest/srd-rules";
import {
  createCheckoutSession,
  getAdminDbConnection,
  listLoreRegistry,
  PHYSICAL_PACKAGES,
  processPaymentWebhookEvent,
  SUBSCRIPTION_PLANS,
  verifyLicenseKey,
} from "./admin-store";

export interface StoreCartItem {
  itemType: "PHYSICAL_KIT" | "SUBSCRIPTION" | "ONE_SHOT_PACK";
  productId: string;
  campaignId?: string;
  oneShotSlug?: string;
  partyLevel?: number;
  quantity: number;
}

export interface StoreQuoteLineItem {
  itemType: "PHYSICAL_KIT" | "SUBSCRIPTION" | "ONE_SHOT_PACK";
  productId: string;
  title: string;
  campaignId?: string;
  oneShotSlug?: string;
  partyLevel?: number;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  requiresShipping: boolean;
}

export interface StoreQuoteSummary {
  lines: StoreQuoteLineItem[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  appliedPromo?: {
    code: string;
    description: string;
  };
  promoError?: string;
}

export interface StoreOneShotCatalogItem {
  slug: string;
  title: string;
  biome: string;
  premise: string;
  antagonist: string;
  antagonistEmoji: string;
  zones: [string, string, string];
  lootName: string;
  recommendedPartyLevel: number;
  scaledBossHp: number;
  scaledDc5e: number;
  priceUsd: number;
  alreadyPlayedOnServer: boolean;
}

export interface StoreCatalogResponse {
  packages: PrintFulfillmentPackage[];
  subscriptions: SubscriptionPlan[];
  campaigns: Array<{
    id: string;
    title: string;
    zonesCount: number;
    chaptersCount: number;
  }>;
  oneShots: StoreOneShotCatalogItem[];
  activePromos: Array<{
    code: string;
    description: string;
  }>;
  paymentGatewayMode: "STRIPE_LIVE" | "SANDBOX_SIMULATED";
}

function clampPartyLevel(level?: number): number {
  const num = Number(level || 1);
  if (!Number.isFinite(num)) return 1;
  return Math.max(1, Math.min(5, Math.round(num)));
}

export function getStoreCatalog(partyLevel?: number): StoreCatalogResponse {
  const level = clampPartyLevel(partyLevel);
  const db = getAdminDbConnection();
  const loreRows = listLoreRegistry();
  const usedSlugs = new Set(loreRows.map((l) => l.slug));

  const promoRows = db
    .prepare("SELECT code, description FROM promo_codes WHERE active = 1 ORDER BY code ASC")
    .all() as Array<{ code: string; description: string }>;

  const oneShotPkg =
    PHYSICAL_PACKAGES.find((p) => p.id === "pkg-oneshot-pack") ??
    PHYSICAL_PACKAGES[PHYSICAL_PACKAGES.length - 1];
  const oneShotPrice = oneShotPkg ? oneShotPkg.priceUsd : 4;

  const oneShots: StoreOneShotCatalogItem[] = ONE_SHOT_SIDEQUEST_CATALOG.map((bp) => ({
    slug: bp.slug,
    title: bp.title,
    biome: bp.biome,
    premise: bp.premise,
    antagonist: bp.antagonist,
    antagonistEmoji: bp.antagonistEmoji,
    zones: bp.zones,
    lootName: bp.lootName,
    recommendedPartyLevel: level,
    scaledBossHp: level * 4 + 8,
    scaledDc5e: 10 + level,
    priceUsd: oneShotPrice,
    alreadyPlayedOnServer: usedSlugs.has(bp.slug),
  }));

  const stripeSecret = (process.env.STRIPE_SECRET_KEY || "").trim();
  return {
    packages: PHYSICAL_PACKAGES,
    subscriptions: SUBSCRIPTION_PLANS,
    campaigns: FAMILY_CAMPAIGNS.map((c) => ({
      id: c.id,
      title: c.title,
      zonesCount: c.zones.length,
      chaptersCount: c.storyNodes.length,
    })),
    oneShots,
    activePromos: promoRows.map((p) => ({
      code: String(p.code),
      description: String(p.description),
    })),
    paymentGatewayMode:
      stripeSecret && stripeSecret.startsWith("sk_") ? "STRIPE_LIVE" : "SANDBOX_SIMULATED",
  };
}

function resolveCatalogItemPrice(item: StoreCartItem): StoreQuoteLineItem {
  const qty = Math.max(1, Math.min(20, Math.round(Number(item.quantity || 1))));

  if (item.itemType === "SUBSCRIPTION") {
    const plan =
      SUBSCRIPTION_PLANS.find((p) => p.tier === item.productId) ?? SUBSCRIPTION_PLANS[1];
    const unitPriceCents = plan.priceMonthlyUsd * 100;
    return {
      itemType: "SUBSCRIPTION",
      productId: plan.tier,
      title: `${plan.name} (Monthly)`,
      quantity: 1,
      unitPriceCents,
      lineTotalCents: unitPriceCents,
      requiresShipping: plan.tier === "GAME_IN_A_BOX_PRO",
    };
  }

  if (item.itemType === "ONE_SHOT_PACK") {
    const pkg =
      PHYSICAL_PACKAGES.find((p) => p.id === "pkg-oneshot-pack") ?? PHYSICAL_PACKAGES[2];
    const bp = ONE_SHOT_SIDEQUEST_CATALOG.find((b) => b.slug === item.oneShotSlug);
    const level = clampPartyLevel(item.partyLevel);
    const title = bp
      ? `One-Shot Pack (Lvl ${level}): ${bp.title}`
      : `${pkg.title} (Lvl ${level})`;
    const unitPriceCents = pkg.priceUsd * 100;
    return {
      itemType: "ONE_SHOT_PACK",
      productId: "pkg-oneshot-pack",
      title,
      oneShotSlug: bp?.slug || item.oneShotSlug,
      partyLevel: level,
      quantity: qty,
      unitPriceCents,
      lineTotalCents: unitPriceCents * qty,
      requiresShipping: false,
    };
  }

  const pkg =
    PHYSICAL_PACKAGES.find((p) => p.id === item.productId) ?? PHYSICAL_PACKAGES[0];
  const camp = FAMILY_CAMPAIGNS.find((c) => c.id === item.campaignId);
  const title = camp ? `${pkg.title} — ${camp.title}` : pkg.title;
  const unitPriceCents = pkg.priceUsd * 100;
  return {
    itemType: "PHYSICAL_KIT",
    productId: pkg.id,
    title,
    campaignId: item.campaignId || pkg.campaignId,
    quantity: qty,
    unitPriceCents,
    lineTotalCents: unitPriceCents * qty,
    requiresShipping: pkg.includesDryEraseGrid || pkg.includesPhysicalDiceSet,
  };
}

/**
 * Server-authoritative cart pricing, promo validation, and shipping calculator.
 */
export function quoteStoreItems(
  rawItems: StoreCartItem[],
  promoCode?: string
): StoreQuoteSummary {
  const db = getAdminDbConnection();
  const lines = (rawItems || [])
    .filter((i) => i && i.productId)
    .map((item) => resolveCatalogItemPrice(item));

  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  let discountCents = 0;
  let appliedPromo: { code: string; description: string } | undefined;
  let promoError: string | undefined;

  const cleanPromo = (promoCode || "").trim().toUpperCase();
  if (cleanPromo) {
    const promoRow = db
      .prepare("SELECT * FROM promo_codes WHERE UPPER(code) = ? AND active = 1")
      .get(cleanPromo) as Record<string, any> | undefined;
    if (!promoRow) {
      promoError = `Promo code "${cleanPromo}" is not valid.`;
    } else if (subtotalCents < Number(promoRow.min_subtotal_cents || 0)) {
      const minUsd = (Number(promoRow.min_subtotal_cents || 0) / 100).toFixed(2);
      promoError = `Promo code "${cleanPromo}" requires at least $${minUsd} subtotal.`;
    } else {
      const discountType = String(promoRow.discount_type);
      const val = Number(promoRow.discount_value || 0);
      if (discountType === "PERCENT") {
        discountCents = Math.round((subtotalCents * val) / 100);
      } else {
        discountCents = Math.min(subtotalCents, val);
      }
      appliedPromo = {
        code: String(promoRow.code),
        description: String(promoRow.description),
      };
    }
  }

  const discountedSubtotal = Math.max(0, subtotalCents - discountCents);
  const needsShipping = lines.some((l) => l.requiresShipping);
  // Free shipping on physical orders >= $49, or lightweight $3.95 flat mailer otherwise
  const shippingCents =
    !needsShipping || discountedSubtotal === 0 || subtotalCents >= 4900 ? 0 : 395;

  return {
    lines,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: discountedSubtotal + shippingCents,
    appliedPromo,
    promoError,
  };
}

export function getStoreCart(sessionId: string): {
  sessionId: string;
  items: StoreCartItem[];
  promoCode: string;
  quote: StoreQuoteSummary;
} {
  const cleanSession = (sessionId || "default-guest").trim().slice(0, 64);
  const db = getAdminDbConnection();
  const row = db
    .prepare("SELECT * FROM store_carts WHERE session_id = ?")
    .get(cleanSession) as { items_json: string; promo_code: string | null } | undefined;

  const items: StoreCartItem[] = row ? JSON.parse(String(row.items_json || "[]")) : [];
  const promoCode = row?.promo_code ? String(row.promo_code) : "";
  return {
    sessionId: cleanSession,
    items,
    promoCode,
    quote: quoteStoreItems(items, promoCode),
  };
}

export function updateStoreCart(params: {
  sessionId: string;
  action: "ADD" | "REMOVE" | "SET_QTY" | "APPLY_PROMO" | "CLEAR";
  item?: StoreCartItem;
  productId?: string;
  oneShotSlug?: string;
  quantity?: number;
  promoCode?: string;
}): {
  sessionId: string;
  items: StoreCartItem[];
  promoCode: string;
  quote: StoreQuoteSummary;
} {
  const current = getStoreCart(params.sessionId);
  let items = [...current.items];
  let promoCode = current.promoCode;

  if (params.action === "CLEAR") {
    items = [];
    promoCode = "";
  } else if (params.action === "APPLY_PROMO") {
    promoCode = (params.promoCode || "").trim().toUpperCase();
  } else if (params.action === "REMOVE" && params.productId) {
    items = items.filter(
      (i) =>
        !(
          i.productId === params.productId &&
          (params.oneShotSlug ? i.oneShotSlug === params.oneShotSlug : true)
        )
    );
  } else if (params.action === "SET_QTY" && params.productId) {
    const qty = Math.round(Number(params.quantity || 0));
    if (qty <= 0) {
      items = items.filter(
        (i) =>
          !(
            i.productId === params.productId &&
            (params.oneShotSlug ? i.oneShotSlug === params.oneShotSlug : true)
          )
      );
    } else {
      items = items.map((i) =>
        i.productId === params.productId &&
        (params.oneShotSlug ? i.oneShotSlug === params.oneShotSlug : true)
          ? { ...i, quantity: i.itemType === "SUBSCRIPTION" ? 1 : Math.min(20, qty) }
          : i
      );
    }
  } else if (params.action === "ADD" && params.item) {
    const add = params.item;
    const idx = items.findIndex(
      (i) =>
        i.itemType === add.itemType &&
        i.productId === add.productId &&
        (add.oneShotSlug ? i.oneShotSlug === add.oneShotSlug : !i.oneShotSlug) &&
        (add.campaignId ? i.campaignId === add.campaignId : true)
    );
    const safeAdd: StoreCartItem = {
      itemType: add.itemType,
      productId: validateDisplayName(add.productId, "", 64),
      campaignId: add.campaignId ? validateDisplayName(add.campaignId, "", 64) : undefined,
      oneShotSlug: add.oneShotSlug ? validateDisplayName(add.oneShotSlug, "", 80) : undefined,
      partyLevel: typeof add.partyLevel === "number" ? Math.max(1, Math.min(20, add.partyLevel)) : undefined,
      quantity: add.itemType === "SUBSCRIPTION" ? 1 : Math.max(1, Math.min(20, add.quantity || 1)),
    };
    if (idx >= 0) {
      items[idx] = {
        ...items[idx],
        quantity:
          safeAdd.itemType === "SUBSCRIPTION"
            ? 1
            : Math.min(20, items[idx].quantity + safeAdd.quantity),
      };
    } else {
      items.push(safeAdd);
    }
  }

  const db = getAdminDbConnection();
  db.prepare(
    `INSERT INTO store_carts (session_id, items_json, promo_code, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       items_json = excluded.items_json,
       promo_code = excluded.promo_code,
       updated_at = excluded.updated_at`
  ).run(current.sessionId, JSON.stringify(items), promoCode || null, new Date().toISOString());

  return {
    sessionId: current.sessionId,
    items,
    promoCode,
    quote: quoteStoreItems(items, promoCode),
  };
}

export async function checkoutStoreCart(params: {
  sessionId?: string;
  items?: StoreCartItem[];
  promoCode?: string;
  familyName: string;
  email: string;
  shippingName?: string;
  shippingAddress?: string;
}): Promise<{
  ok: true;
  mode: "STRIPE_LIVE" | "SANDBOX_SIMULATED";
  receiptNumber: string;
  quote: StoreQuoteSummary;
  checkoutUrl?: string;
  orders: PrintFulfillmentOrder[];
  licenseKey?: string;
  subscriptionTier?: SubscriptionTier;
}> {
  const email = (params.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("A valid email address is required for checkout receipts and order tracking.");
  }
  const familyName = (params.familyName || "Adventuring Family").trim();

  let items = params.items && params.items.length > 0 ? params.items : [];
  let promoCode = params.promoCode || "";

  if (items.length === 0 && params.sessionId) {
    const saved = getStoreCart(params.sessionId);
    items = saved.items;
    promoCode = promoCode || saved.promoCode;
  }
  if (items.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const quote = quoteStoreItems(items, promoCode);
  const stripeSecret = (process.env.STRIPE_SECRET_KEY || "").trim();
  const publicUrl = (process.env.PUBLIC_ADMIN_URL || "http://localhost:3001").replace(
    /\/$/,
    ""
  );

  const subLine = quote.lines.find((l) => l.itemType === "SUBSCRIPTION");
  const primaryPhysicalLine = quote.lines.find((l) => l.itemType !== "SUBSCRIPTION");

  if (stripeSecret && stripeSecret.startsWith("sk_")) {
    const form = new URLSearchParams();
    form.set("mode", subLine && quote.lines.length === 1 ? "subscription" : "payment");
    form.set("success_url", `${publicUrl}/store?checkout=success`);
    form.set("cancel_url", `${publicUrl}/store?checkout=canceled`);
    form.set("customer_email", email);
    form.set("line_items[0][quantity]", "1");
    form.set("line_items[0][price_data][currency]", "usd");
    form.set("line_items[0][price_data][unit_amount]", String(quote.totalCents));
    form.set(
      "line_items[0][price_data][product_data][name]",
      quote.lines.map((l) => `${l.quantity}x ${l.title}`).join(", ").slice(0, 180)
    );
    if (subLine && quote.lines.length === 1) {
      form.set("line_items[0][price_data][recurring][interval]", "month");
    }
    form.set("metadata[checkoutKind]", primaryPhysicalLine ? "PHYSICAL_KIT" : "SUBSCRIPTION");
    if (primaryPhysicalLine) {
      form.set("metadata[packageId]", primaryPhysicalLine.productId);
      if (primaryPhysicalLine.campaignId) {
        form.set("metadata[campaignId]", primaryPhysicalLine.campaignId);
      }
    }
    if (subLine) {
      form.set("metadata[subscriptionTier]", subLine.productId);
    }
    form.set("metadata[familyName]", familyName);
    form.set("metadata[email]", email);
    form.set("metadata[shippingName]", params.shippingName || familyName);
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
      ok: true,
      mode: "STRIPE_LIVE",
      receiptNumber: `HQ-${Date.now().toString(36).toUpperCase()}`,
      quote,
      checkoutUrl: json.url,
      orders: [],
    };
  }

  // Unraid Sandbox Mode: process each line through SQLite transactional webhook processor
  const createdOrders: PrintFulfillmentOrder[] = [];
  let latestLicenseKey: string | undefined;
  let latestTier: SubscriptionTier | undefined;

  for (let i = 0; i < quote.lines.length; i++) {
    const line = quote.lines[i];
    if (line.itemType === "SUBSCRIPTION") {
      const res = await createCheckoutSession({
        checkoutKind: "SUBSCRIPTION",
        subscriptionTier: line.productId as SubscriptionTier,
        familyName,
        email,
      });
      if (res.household) {
        latestLicenseKey = res.household.licenseKey;
        latestTier = res.household.subscriptionTier;
      }
    } else {
      const event = {
        id: secureRandomId(`evt_store_${i}`),
        type: "checkout.session.completed" as const,
        data: {
          object: {
            id: secureRandomId(`cs_store_${i}`),
            customer_email: email,
            metadata: {
              checkoutKind: "PHYSICAL_KIT" as const,
              packageId: line.productId,
              subscriptionTier: latestTier,
              campaignId: line.campaignId || line.oneShotSlug || "camp-goblin-bakery",
              familyName: validateDisplayName(familyName, "Family", 64),
              email,
              shippingName: validateDisplayName(params.shippingName || familyName, "Family", 64),
              shippingAddress:
                validateDisplayName(params.shippingAddress, "123 Hearthstone Lane, Tabletop City", 180),
              paymentMode: "SANDBOX_SIMULATED" as const,
            },
          },
        },
      };
      const processed = processPaymentWebhookEvent(event);
      if (processed.household) {
        latestLicenseKey = processed.household.licenseKey;
        latestTier = processed.household.subscriptionTier;
      }
      if (processed.order) {
        createdOrders.push(processed.order);
      }
    }
  }

  if (params.sessionId) {
    updateStoreCart({ sessionId: params.sessionId, action: "CLEAR" });
  }

  return {
    ok: true,
    mode: "SANDBOX_SIMULATED",
    receiptNumber: `HQ-${Date.now().toString(36).toUpperCase()}`,
    quote,
    orders: createdOrders,
    licenseKey: latestLicenseKey,
    subscriptionTier: latestTier,
  };
}

export function lookupCustomerOrder(params: {
  orderId: string;
  email: string;
}): {
  found: boolean;
  order?: PrintFulfillmentOrder;
  householdLicenseKey?: string;
  subscriptionTier?: SubscriptionTier;
} {
  const orderId = (params.orderId || "").trim();
  const email = (params.email || "").trim().toLowerCase();
  if (!orderId || !email) {
    return { found: false };
  }

  const db = getAdminDbConnection();
  const row = db
    .prepare("SELECT * FROM orders WHERE id = ? AND LOWER(email) = ?")
    .get(orderId, email) as Record<string, any> | undefined;
  if (!row) {
    return { found: false };
  }

  const hhRow = db
    .prepare("SELECT license_key, subscription_tier FROM households WHERE id = ?")
    .get(String(row.household_id)) as
    | { license_key?: string; subscription_tier?: string }
    | undefined;

  return {
    found: true,
    order: {
      id: String(row.id),
      householdId: String(row.household_id),
      familyName: String(row.family_name),
      email: String(row.email),
      packageId: String(row.package_id),
      packageTitle: String(row.package_title),
      campaignId: String(row.campaign_id),
      amountCents: Number(row.amount_cents),
      paymentMode: row.payment_mode as "STRIPE_LIVE" | "SANDBOX_SIMULATED",
      status: row.status as any,
      shippingName: String(row.shipping_name),
      shippingAddress: String(row.shipping_address),
      trackingNumber: row.tracking_number ? String(row.tracking_number) : undefined,
      printableBundleUrl: String(row.printable_bundle_url),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    },
    householdLicenseKey: hhRow?.license_key ? String(hhRow.license_key) : undefined,
    subscriptionTier: hhRow?.subscription_tier
      ? (String(hhRow.subscription_tier) as SubscriptionTier)
      : undefined,
  };
}

export interface TrialEncounterOverview {
  campaignId: string;
  campaignTitle: string;
  encounterNumber: number;
  encounterTitle: string;
  readAloudCozy: string;
  readAloudHeroic: string;
  choices: Array<{
    id: string;
    label: string;
    dcStoryD6: number;
    successText: string;
    rallyText: string;
  }>;
  nextLockedEncounterTitle: string;
}

const TRIAL_ENCOUNTER_1: TrialEncounterOverview = {
  campaignId: "camp-goblin-bakery",
  campaignTitle: "The Great Goblin Bakery Heist",
  encounterNumber: 1,
  encounterTitle: "Encounter 1 (Free Preview): The Cinnamon Courtyard Door",
  readAloudCozy:
    "Sweet cinnamon clouds puff from the brass keyhole! Standing on an overturned flour barrel is Sprinkles the Goblin, wearing a tall chef hat and juggling three warm honey biscuits.",
  readAloudHeroic:
    "Ahead looms the riveted Pantry Gate! Sprinkles the Goblin Baker bars the threshold with a giant rolling pin, though his stomach rumbles loudly at the smell of fresh honey scones.",
  choices: [
    {
      id: "biscuit",
      label: "🍯 Share a Honey Biscuit with Sprinkles (Friendly d6)",
      dcStoryD6: 3,
      successText:
        "Sprinkles bursts into delighted giggles, unlatches the Cinnamon Door, and hands your party a sparkling Cookie of Bravery!",
      rallyText:
        "Sprinkles drops a biscuit in surprise, tastes a crumb anyway, and happily swings the door wide open so everyone cheers!",
    },
    {
      id: "tiptoe",
      label: "🐾 Tiptoe Past the Flour Barrels (Clever d6)",
      dcStoryD6: 4,
      successText:
        "You glide past without stepping on a single creaky board and swipe the brass bakery key right off the hook!",
      rallyText:
        "A flour puff tickles your nose—ACHOO!—covering Sprinkles in snowy sugar while you heroically tumble safely inside!",
    },
    {
      id: "glitter",
      label: "✨ Sparkle Flour Illusion Trick (Brave d6)",
      dcStoryD6: 3,
      successText:
        "Your swirling lantern light dances across the frosting jars like fireflies—Sprinkles claps in awe and waves you right through!",
      rallyText:
        "Your sparklers fizzle into floating golden bubbles that distract Sprinkles long enough for the whole family to slip past!",
    },
  ],
  nextLockedEncounterTitle: "Encounter 2: The Flour-Cloud Pantry & Rising Dough Vault",
};

export function getTrialEncounterOverview(): TrialEncounterOverview {
  return TRIAL_ENCOUNTER_1;
}

export function playFreeTrialEncounter(params: {
  choiceId: string;
  rollValue?: number;
}): {
  ok: true;
  encounter1Completed: true;
  rolled: number;
  dcStoryD6: number;
  outcomeType: "CRITICAL_SUCCESS" | "SUCCESS" | "HEROIC_RALLY";
  narrative: string;
  rewardName: string;
  nextLockedEncounterTitle: string;
} {
  const choice =
    TRIAL_ENCOUNTER_1.choices.find((c) => c.id === params.choiceId) ??
    TRIAL_ENCOUNTER_1.choices[0];
  const rolled =
    typeof params.rollValue === "number"
      ? Math.max(1, Math.min(6, Math.round(params.rollValue)))
      : crypto.randomInt(1, 7);
  const outcomeType =
    rolled === 6
      ? "CRITICAL_SUCCESS"
      : rolled >= choice.dcStoryD6
      ? "SUCCESS"
      : "HEROIC_RALLY";
  const narrative =
    outcomeType === "HEROIC_RALLY" ? choice.rallyText : choice.successText;

  return {
    ok: true,
    encounter1Completed: true,
    rolled,
    dcStoryD6: choice.dcStoryD6,
    outcomeType,
    narrative,
    rewardName: "Cookie of Bravery",
    nextLockedEncounterTitle: TRIAL_ENCOUNTER_1.nextLockedEncounterTitle,
  };
}

export function attemptAdvanceTrialToEncounter2(params: {
  licenseKey?: string;
}): {
  allowed: boolean;
  paywallRequired: boolean;
  unlockedTier?: SubscriptionTier;
  message: string;
  nextEncounter?: {
    title: string;
    readAloud: string;
    bossName: string;
  };
  upgradeOptions?: Array<{
    kind: "SUBSCRIPTION" | "PHYSICAL_KIT";
    productId: string;
    label: string;
    priceUsd: number;
    badge: string;
  }>;
} {
  const check = verifyLicenseKey(params.licenseKey || "");
  if (check.valid && check.tier && check.tier !== "TRIAL_PREVIEW") {
    return {
      allowed: true,
      paywallRequired: false,
      unlockedTier: check.tier,
      message: `Unlocked with ${check.tier} License! Welcome to Encounter 2!`,
      nextEncounter: {
        title: "Encounter 2: The Flour-Cloud Pantry & Chef Snickerdoodle",
        readAloud:
          "Giant floating sacks of sugar-flour drift gently under enchanted lantern beams while Chef Snickerdoodle guards the Glowing Frosting Vault!",
        bossName: "Chef Snickerdoodle & The Living Gingerbread Guards",
      },
    };
  }

  return {
    allowed: false,
    paywallRequired: true,
    message:
      "You finished the Free First Encounter! Unlock Encounter 2+ with $5/mo Digital Creator Updates or $15 Print-at-Home DIY PDF (or order the $49 Shipped Starter Box).",
    upgradeOptions: [
      {
        kind: "SUBSCRIPTION",
        productId: "DIGITAL_UPDATES",
        label: "Digital Explorer & Creator Updates ($5/mo — No Shipping)",
        priceUsd: 5,
        badge: "Lowest Monthly",
      },
      {
        kind: "PHYSICAL_KIT",
        productId: "pkg-starter-diy",
        label: "Print-at-Home DIY Starter Pack PDF + Full Campaign ($15 — No Shipping)",
        priceUsd: 15,
        badge: "Print Your Own",
      },
      {
        kind: "PHYSICAL_KIT",
        productId: "pkg-starter-box",
        label: "Shipped Starter Box w/ Dice, Standees & Dry-Erase Grid ($49)",
        priceUsd: 49,
        badge: "Shipped Hardware",
      },
    ],
  };
}

export { listLoreRegistry };
