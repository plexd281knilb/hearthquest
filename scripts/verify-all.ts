process.env.NODE_ENV = "test";

import assert from "node:assert";
import crypto from "node:crypto";
import http from "node:http";
import {
  generateGmCoPilotWhisper,
  probeRtx3080Health,
} from "../apps/quest-ai-bridge/src/index";
import {
  advanceFulfillmentOrder,
  attemptAdvanceTrialToEncounter2,
  checkoutStoreCart,
  createCheckoutSession,
  generateLicenseKey,
  getAdminDatabasePath,
  getAdminStoreSnapshot,
  getStoreCart,
  getStoreCatalog,
  listLoreRegistry,
  lookupCustomerOrder,
  PHYSICAL_PACKAGES,
  playFreeTrialEncounter,
  processPaymentWebhookEvent,
  quoteStoreItems,
  registerLoreEntry,
  renderAdminHtml,
  renderPrintableKitHtml,
  renderStorefrontHtml,
  resetAdminStoreForTesting,
  signStripeWebhookPayloadForTest,
  SUBSCRIPTION_PLANS,
  updateStoreCart,
  verifyLicenseKey,
  verifyOperatorPin,
  verifyStripeWebhookSignature,
} from "../apps/quest-admin/src/server";
import {
  addCustomHeroToRoom,
  advanceRoomStoryNode,
  attemptInteractDoor,
  attemptMoveRoomToken,
  FAMILY_CAMPAIGNS,
  forgeActorAndTokenInRoom,
  generateJoinQrSvg,
  generateOneShotInRoom,
  getOrCreateRoom,
  getVttDatabasePath,
  loadRoomsFromDisk,
  moveRoomToken,
  openRoomLootChest,
  regenerateRoomProceduralMap,
  resetRoomsForTesting,
  saveRoomsToDisk,
  getCustomTokensDir,
  listCustomTokenAssets,
  spawnCustomTokenInRoom,
  submitHeroSkillRoll,
  submitPlayerActionRoll,
  submitQuickPolyhedralRoll,
  switchRoomCampaign,
  toggleRoomBedtimeFreeze,
  toggleRoomZoneFog,
  triggerRoomRpPrompt,
  updateRoomAtmosphere,
  updateRoomCombat,
  updateRoomLighting,
  updateRoomMapProps,
  updateRoomSettings,
  updateRoomToolsAndWeather,
} from "../apps/quest-vtt/src/room-store";
import {
  activateLicenseOnVttAccount,
  ensureAccountSessionRoom,
  evaluateVttSessionProgressionGate,
  getVttAccountByToken,
  getVttAccountCount,
  listVttAccountsForAdmin,
  loginOrRegisterGoogleAccount,
  loginVttAccount,
  registerVttAccount,
  setVttAccountRoleByAdmin,
  updateVttAccountPreferences,
} from "../apps/quest-vtt/src/auth-store";
import {
  createGoogleOAuthStartParams,
  exchangeGoogleAuthorizationCode,
  verifyGoogleIdToken,
  verifyGoogleOAuthTransactionCookie,
} from "../apps/quest-vtt/src/google-auth";
import { encodeQrMatrix } from "../apps/quest-vtt/src/qr-encoder";
import { server as vttServer } from "../apps/quest-vtt/src/server";
import {
  clearTtsAudioCache,
  getPublicTtsConfig,
  probeLocalTtsHealth,
  resetTtsStateForTesting,
  saveTtsSettings,
  synthesizeSpeechWithFallback,
} from "../apps/quest-vtt/src/tts-engine";
import { renderVttAppHtml, renderVttLoginGateHtml } from "../apps/quest-vtt/src/ui-template";
import {
  APP_VERSION,
  BUILD_NUMBER,
  getBuildMetadata,
  HEARTHQUEST_ASSETS,
  resolveArchetypeAsset,
  resolveAreaMapAsset,
  resolveCampaignTileAsset,
  resolveGroundTileAsset,
  resolveSceneBackdropAsset,
  resolveTokenAsset,
  resolveTrapAsset,
} from "../packages/shared-types/src/index";
import {
  calculateEncounterAutoBalance,
  calculateGridDistanceFeet,
  computeRaySegmentIntersection,
  computeSiblingSpotlightFairness,
  computeVisibilityPolygon,
  createStarterFamilySession,
  getHeroSkillModifiers,
  HEARTHQUEST_SKILLS,
  enforceAgeTieredGuardrails,
  evaluateActionCardRoll,
  SRD_51_CC_BY_40_ATTRIBUTION,
} from "../packages/srd-rules/src/index";

async function runVerification() {
  resetRoomsForTesting();

  console.log("==========================================================");
  console.log("   HEARTHQUEST FAMILY TABLETOP & AI CO-PILOT VERIFICATION ");
  console.log("==========================================================\n");

  // Suite 1: SRD 5.1 Legal Attribution & Starter Campaign
  process.stdout.write("[TEST] Suite 1: CC-BY-4.0 SRD 5.1 Attribution & Starter Session... ");
  assert.ok(SRD_51_CC_BY_40_ATTRIBUTION.includes("Creative Commons Attribution 4.0"));
  const session = createStarterFamilySession("DRGN");
  assert.strictEqual(session.roomCode, "DRGN");
  assert.strictEqual(session.heroes.length, 2);
  assert.strictEqual(session.zones.length, 3);
  console.log("✅ PASSED");

  // Suite 2: 3-Tier Family Rules & Hybrid Physical/Digital Dice
  process.stdout.write("[TEST] Suite 2: 3-Tier Rules & Hybrid Physical/Digital Dice Engine... ");
  const barnaby = session.heroes[0];
  const card = barnaby.actionCards[0];
  const physicalWin = evaluateActionCardRoll({
    character: barnaby,
    card,
    rulesTier: "STORYBOOK_D6",
    source: "PHYSICAL_DICE_TABLE",
    physicalRollValue: 5,
  });
  assert.strictEqual(physicalWin.dieType, "d6");
  assert.strictEqual(physicalWin.succeeded, true);

  const apprenticeRoll = evaluateActionCardRoll({
    character: barnaby,
    card,
    rulesTier: "APPRENTICE_5E_LITE",
    source: "PHYSICAL_DICE_TABLE",
    physicalRollValue: 15,
  });
  assert.strictEqual(apprenticeRoll.dieType, "d20");
  assert.strictEqual(apprenticeRoll.total, 15 + card.bonusByTier.APPRENTICE_5E_LITE);
  assert.strictEqual(apprenticeRoll.succeeded, true);
  console.log("✅ PASSED");

  // Suite 3: Sibling Spotlight Fairness Engine
  process.stdout.write("[TEST] Suite 3: Sibling Spotlight Fairness Tracker... ");
  submitPlayerActionRoll({
    roomCode: "SPOT",
    characterId: "hero-barnaby",
    cardId: "card-shield-bonk",
    source: "PHYSICAL_DICE_TABLE",
    physicalRollValue: 5,
  });
  const afterSecondTurn = submitPlayerActionRoll({
    roomCode: "SPOT",
    characterId: "hero-barnaby",
    cardId: "card-shield-bonk",
    source: "PHYSICAL_DICE_TABLE",
    physicalRollValue: 6,
  });
  const lyraSpotlight = afterSecondTurn.room.spotlightRecords.find(
    (r) => r.characterId === "hero-lyra"
  );
  assert.ok(lyraSpotlight?.needsSpotlightNudge, "Lyra should receive a spotlight nudge when 2 turns behind");
  assert.ok(lyraSpotlight?.suggestedSpotlightHook?.includes("Maya"));
  console.log("✅ PASSED");

  // Suite 4: Anti-TPK Dynamic Encounter Auto-Balancer
  process.stdout.write("[TEST] Suite 4: Anti-TPK Encounter Auto-Balancer (Heroic Rally)... ");
  const rallySession = createStarterFamilySession("TPK1");
  rallySession.heroes[0].storybookStats.hearts = 1;
  const balance = calculateEncounterAutoBalance(rallySession);
  assert.strictEqual(balance.status, "HEROIC_RALLY_ACTIVE");
  assert.strictEqual(balance.grantPartyInspiration, true);
  assert.ok(balance.monsterHpMultiplier < 1.0);
  console.log("✅ PASSED");

  // Suite 5: Age-Tiered Content Guardrails (Cozy G-Rated)
  process.stdout.write("[TEST] Suite 5: Age-Tiered Content Guardrails (Cozy G-Rated)... ");
  const sanitized = enforceAgeTieredGuardrails(
    "The warrior kills the monster in a bloody battle and it dies.",
    "COZY_G"
  );
  assert.ok(!sanitized.includes("kills"));
  assert.ok(!sanitized.includes("bloody"));
  assert.ok(sanitized.includes("bonks dizzy"));
  assert.ok(sanitized.includes("poofs into colorful smoke"));
  console.log("✅ PASSED");

  // Suite 6: "Pause for Bedtime" Snapshot & Storybook Recap
  process.stdout.write("[TEST] Suite 6: Pause for Bedtime Freeze & Storybook Recap... ");
  const paused = toggleRoomBedtimeFreeze("DRGN");
  assert.strictEqual(paused.isPausedForBedtime, true);
  assert.ok(paused.bedtimeSnapshot?.previouslyOnRecap.includes("Previously on"));
  const resumed = toggleRoomBedtimeFreeze("DRGN");
  assert.strictEqual(resumed.isPausedForBedtime, false);
  console.log("✅ PASSED");

  // Suite 7: AI GM Co-Pilot Bridge & RTX 3080 Fail-Safe Router
  process.stdout.write("[TEST] Suite 7: AI GM Co-Pilot Bridge & RTX 3080 Failover... ");
  const health = await probeRtx3080Health("http://127.0.0.1:65530");
  assert.strictEqual(health.rtx3080Online, false);
  const whisper = await generateGmCoPilotWhisper({
    question: "Can we bribe Sprinkles the Goblin with a cookie?",
    session: afterSecondTurn.room,
    ollamaUrl: "http://127.0.0.1:65530",
  });
  assert.ok(whisper.readAloudOptions.cozySilly.length > 20);
  assert.ok(whisper.ruleGuidance.length > 10);
  assert.ok(whisper.spotlightSuggestion?.includes("Maya"));
  console.log("✅ PASSED");

  // Suite 8: Multi-Device Room Store, 5-Min Hero Creator & Print-on-Demand
  process.stdout.write("[TEST] Suite 8: VTT Token Sync, Fog of War, Hero Creator & POD... ");
  const moved = moveRoomToken({ roomCode: "DRGN", tokenId: "tok-barnaby", targetX: 3, targetY: 2 });
  const tok = moved.tokens.find((t) => t.id === "tok-barnaby");
  assert.strictEqual(tok?.gridX, 3);
  assert.strictEqual(tok?.gridY, 2);

  const fogRevealed = toggleRoomZoneFog({ roomCode: "DRGN", zoneId: "zone-pantry" });
  assert.strictEqual(fogRevealed.zones.find((z) => z.id === "zone-pantry")?.isRevealed, true);

  const advanced = advanceRoomStoryNode({
    roomCode: "DRGN",
    targetNodeId: "node-chef-vault",
    consequenceTag: "OPENED_VAULT",
  });
  assert.strictEqual(advanced.activeNodeId, "node-chef-vault");
  assert.ok(advanced.storyFlags.includes("OPENED_VAULT"));

  const withCustomHero = addCustomHeroToRoom({
    roomCode: "DRGN",
    name: "Captain Acorn",
    playerName: "Zoe",
    playerAge: 6,
    archetype: "Forest Ranger",
    companionPet: "Marshmallow",
    avatarEmoji: "🏹",
  });
  assert.strictEqual(withCustomHero.heroes.length, 3);
  assert.ok(PHYSICAL_PACKAGES.length >= 2);
  assert.strictEqual(getOrCreateRoom("DRGN").heroes.length, 3);
  console.log("✅ PASSED");

  // Suite 9: Build Version & Dev/Beta Channel Badge Verification
  process.stdout.write("[TEST] Suite 9: Build Version & Dev/Beta Channel Badge Verification... ");
  assert.ok(/^\d+\.\d+\.\d+$/.test(APP_VERSION), `Invalid APP_VERSION: ${APP_VERSION}`);
  assert.ok(BUILD_NUMBER >= 1);
  const devMeta = getBuildMetadata("dev");
  const betaMeta = getBuildMetadata("beta");
  assert.ok(devMeta.badgeText.includes(`v${APP_VERSION} • DEV`));
  assert.ok(betaMeta.badgeText.includes(`v${APP_VERSION} • BETA`));

  const vttHtml = renderVttAppHtml(getOrCreateRoom("DRGN"));
  assert.ok(vttHtml.includes(`id="build-version-badge"`), "VTT HTML must render #build-version-badge");
  assert.ok(vttHtml.includes(`v${APP_VERSION}`), "VTT HTML must display current APP_VERSION");

  const adminHtml = renderAdminHtml(health);
  assert.ok(adminHtml.includes(`id="admin-build-version-badge"`), "Admin HTML must render #admin-build-version-badge");
  assert.ok(adminHtml.includes(`v${APP_VERSION}`), "Admin HTML must display current APP_VERSION");
  console.log("✅ PASSED");

  // Suite 10: Multi-Campaign Switcher, Procedural Map Generator, Disk Persistence & QR Join SVG
  process.stdout.write("[TEST] Suite 10: Campaigns, Procedural Maps, Disk Persistence & QR SVG... ");
  assert.strictEqual(FAMILY_CAMPAIGNS.length, 3);
  const treehouseRoom = switchRoomCampaign({
    roomCode: "TREE",
    campaignId: "camp-clockwork-treehouse",
  });
  assert.strictEqual(treehouseRoom.campaignId, "camp-clockwork-treehouse");
  assert.ok(treehouseRoom.campaignTitle.includes("Clockwork Treehouse"));

  const procRoom = regenerateRoomProceduralMap({
    roomCode: "TREE",
    theme: "STARLIGHT_SHIP",
  });
  assert.strictEqual(procRoom.zones.length, 3);
  assert.ok(procRoom.tokens.length >= 4);

  const savedPath = saveRoomsToDisk();
  assert.ok(
    savedPath.endsWith(".db") ||
      savedPath.endsWith("test-rooms.json") ||
      savedPath.endsWith("rooms.json")
  );
  const loadedCount = loadRoomsFromDisk();
  assert.ok(loadedCount >= 1);

  const qrSvg = generateJoinQrSvg("DRGN", "http://localhost:3000/?room=DRGN&mode=kid");
  assert.ok(qrSvg.includes("<svg"));
  assert.ok(qrSvg.includes("DRGN"));
  assert.ok(vttHtml.includes("speakReadAloudText()"), "VTT HTML must include Voice TTS button");
  console.log("✅ PASSED");

  // Suite 11: GitHub Actions CI/CD Workflows, Unraid Template & All-In-One Runner
  process.stdout.write("[TEST] Suite 11: GitHub Actions CI/CD, Unraid XML & All-In-One Config... ");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const rootDir = path.resolve(__dirname, "..");
  
  const workflowPath = path.join(rootDir, ".github", "workflows", "docker-publish.yml");
  assert.ok(fs.existsSync(workflowPath), ".github/workflows/docker-publish.yml must exist");
  const workflowContent = fs.readFileSync(workflowPath, "utf8");
  assert.ok(workflowContent.includes("ghcr.io"), "Workflow must publish to ghcr.io");
  assert.ok(workflowContent.includes("branches: [ \"main\", \"beta\", \"dev\" ]"), "Workflow must trigger on dev, beta, and main");
  assert.ok(workflowContent.includes("npm run verify"), "Workflow must run verify gate before building");

  const unraidTemplatePath = path.join(rootDir, "unraid", "hearthquest-unraid-template.xml");
  assert.ok(fs.existsSync(unraidTemplatePath), "Unraid template XML must exist");
  const unraidContent = fs.readFileSync(unraidTemplatePath, "utf8");
  assert.ok(unraidContent.includes("ghcr.io/plexd281knilb/hearthquest"), "Unraid template must point to ghcr.io image");
  assert.ok(unraidContent.includes("3000") && unraidContent.includes("3001") && unraidContent.includes("8000"), "Unraid template must expose ports 3000, 3001, 8000");

  const startAllPath = path.join(rootDir, "scripts", "start-all.ts");
  assert.ok(fs.existsSync(startAllPath), "scripts/start-all.ts must exist");
  console.log("✅ PASSED");

  // Suite 12: Light Mode & Dark Mode Theming
  process.stdout.write("[TEST] Suite 12: Light Mode & Dark Mode Theming (VTT & Admin)... ");
  assert.ok(vttHtml.includes("btn-theme-toggle"), "VTT HTML must include theme toggle button");
  assert.ok(vttHtml.includes("data-theme=\"light\""), "VTT HTML must include light theme styles");
  assert.ok(vttHtml.includes("data-theme=\"dark\""), "VTT HTML must include dark theme styles");
  assert.ok(adminHtml.includes("admin-theme-btn"), "Admin HTML must include theme toggle button");
  assert.ok(adminHtml.includes("hearthquest_theme"), "Theme must be persisted in localStorage");
  console.log("✅ PASSED");

  // Suite 13: Procedural Web Audio Engine & Interactive Loot Chests
  process.stdout.write("[TEST] Suite 13: Web Audio Engine & Interactive Loot Chests... ");
  assert.ok(vttHtml.includes("AudioEngine"), "VTT HTML must include procedural Web Audio engine");
  assert.ok(vttHtml.includes("playDiceRoll"), "Audio engine must support procedural dice roll sound");
  assert.ok(vttHtml.includes("playSuccessChime"), "Audio engine must support success chime");
  assert.ok(vttHtml.includes("playFailForwardBoing"), "Audio engine must support fail-forward boing");
  assert.ok(vttHtml.includes("btn-audio-toggle"), "VTT HTML must include sound toggle button");

  const starterRoom = getOrCreateRoom("DRGN");
  const chestToken = starterRoom.tokens.find((t) => t.isLootChest);
  assert.ok(chestToken, "Starter room must contain an interactive loot chest");
  assert.strictEqual(chestToken?.isChestOpened, false);

  const lootResult = openRoomLootChest({
    roomCode: "DRGN",
    tokenId: chestToken!.id,
    characterId: starterRoom.heroes[0].id,
  });
  const openedChest = lootResult.room.tokens.find((t) => t.id === chestToken!.id);
  assert.strictEqual(openedChest?.isChestOpened, true);
  assert.ok(lootResult.rewardedItem?.name, "Opening chest must reward a magical item");
  assert.ok(lootResult.rewardedItem?.icon, "Rewarded item must have an icon");
  const heroInventory = starterRoom.heroes[0].inventory;
  assert.ok(
    heroInventory.some((i) => i.name === lootResult.rewardedItem?.name),
    "Hero inventory must receive the rewarded item"
  );
  console.log("✅ PASSED");

  // Suite 14: Browser Tab Favicon, Theme Color & Unraid Container Icon
  process.stdout.write("[TEST] Suite 14: Browser Tab Favicon, Theme Color & Unraid Icon... ");
  assert.ok(vttHtml.includes("name=\"theme-color\" content=\"#f59e0b\""), "VTT must set amber theme-color for browser tab");
  assert.ok(vttHtml.includes("rel=\"icon\""), "VTT must include browser tab favicon");
  assert.ok(adminHtml.includes("name=\"theme-color\" content=\"#f59e0b\""), "Admin must set amber theme-color for browser tab");
  assert.ok(adminHtml.includes("rel=\"icon\""), "Admin must include browser tab favicon");

  const iconSvgPath = path.join(rootDir, "assets", "hearthquest-icon.svg");
  const iconPngPath = path.join(rootDir, "assets", "hearthquest-icon.png");
  assert.ok(fs.existsSync(iconSvgPath), "assets/hearthquest-icon.svg must exist");
  assert.ok(fs.existsSync(iconPngPath), "assets/hearthquest-icon.png must exist");

  const unraidXml = fs.readFileSync(path.join(rootDir, "unraid", "hearthquest-unraid-template.xml"), "utf8");
  assert.ok(unraidXml.includes("<Icon>https://raw.githubusercontent.com/plexd281knilb/hearthquest/dev/assets/hearthquest-icon.png</Icon>"), "Unraid XML template must have <Icon>");

  const dockerfile = fs.readFileSync(path.join(rootDir, "docker", "Dockerfile"), "utf8");
  assert.ok(dockerfile.includes("net.unraid.docker.icon"), "Dockerfile must declare net.unraid.docker.icon label");

  const compose = fs.readFileSync(path.join(rootDir, "docker", "docker-compose.yml"), "utf8");
  assert.ok(compose.includes("net.unraid.docker.icon"), "docker-compose.yml must declare net.unraid.docker.icon label");
  console.log("✅ PASSED");

  // Suite 15: Foundry-Grade Visual Asset & Tile Pipeline
  process.stdout.write("[TEST] Suite 15: Foundry Visual Asset & Tile Pipeline... ");
  
  // 1. Verify hero standees on disk
  const heroAssets = [
    "knight-shield.svg",
    "wizard-starlight.svg",
    "ranger-forest.svg",
    "rogue-ninja.svg",
    "bard-melody.svg",
    "druid-bear.svg",
  ];
  for (const h of heroAssets) {
    const fullPath = path.join(rootDir, "assets", "tokens", "heroes", h);
    assert.ok(fs.existsSync(fullPath), `Hero asset ${h} must exist on disk`);
  }

  // 2. Verify monster standees on disk
  const monsterAssets = [
    "goblin-sprinkles.svg",
    "chef-snickerdoodle.svg",
    "brass-squirrel.svg",
    "dragon-puppy.svg",
    "nebula-jelly.svg",
  ];
  for (const m of monsterAssets) {
    const fullPath = path.join(rootDir, "assets", "tokens", "monsters", m);
    assert.ok(fs.existsSync(fullPath), `Monster asset ${m} must exist on disk`);
  }

  // 3. Verify prop tokens on disk
  const propAssets = [
    "chest-closed.svg",
    "chest-open.svg",
    "torch-wall.svg",
    "campfire-hearth.svg",
  ];
  for (const p of propAssets) {
    const fullPath = path.join(rootDir, "assets", "tokens", "props", p);
    assert.ok(fs.existsSync(fullPath), `Prop asset ${p} must exist on disk`);
  }

  // 4. Verify tactical terrain tiles on disk
  const tileAssets = [
    "tile-bakery-floor.svg",
    "tile-treehouse-wood.svg",
    "tile-starlight-deck.svg",
  ];
  for (const t of tileAssets) {
    const fullPath = path.join(rootDir, "assets", "tiles", t);
    assert.ok(fs.existsSync(fullPath), `Tactical tile ${t} must exist on disk`);
  }

  // 5. Verify asset catalog lookups
  assert.strictEqual(
    resolveArchetypeAsset("Shield Knight"),
    HEARTHQUEST_ASSETS.heroes.shieldKnight.path,
    "resolveArchetypeAsset must map Shield Knight"
  );
  assert.strictEqual(
    resolveArchetypeAsset("Wild Druid Bear"),
    HEARTHQUEST_ASSETS.heroes.wildDruid.path,
    "resolveArchetypeAsset must map Wild Druid"
  );
  assert.strictEqual(
    resolveTokenAsset({ name: "Sprinkles the Goblin Guard" }),
    HEARTHQUEST_ASSETS.monsters.goblinSprinkles.path,
    "resolveTokenAsset must map Sprinkles"
  );
  assert.strictEqual(
    resolveTokenAsset({ name: "Chef Snickerdoodle" }),
    HEARTHQUEST_ASSETS.monsters.chefSnickerdoodle.path,
    "resolveTokenAsset must map Chef Snickerdoodle"
  );
  assert.strictEqual(
    resolveTokenAsset({ name: "Chest", isLootChest: true, isChestOpened: false }),
    HEARTHQUEST_ASSETS.props.chestClosed.path,
    "resolveTokenAsset must map closed chest"
  );
  assert.strictEqual(
    resolveTokenAsset({ name: "Chest", isLootChest: true, isChestOpened: true }),
    HEARTHQUEST_ASSETS.props.chestOpen.path,
    "resolveTokenAsset must map open chest"
  );
  assert.strictEqual(
    resolveCampaignTileAsset("camp-clockwork-treehouse"),
    HEARTHQUEST_ASSETS.tiles.treehouseWood.path,
    "resolveCampaignTileAsset must map treehouse tile"
  );

  // 6. Verify VTT CSS and template rendering
  assert.ok(vttHtml.includes("tile-bakery-floor.svg"), "VTT must reference tile-bakery-floor.svg");
  assert.ok(vttHtml.includes("tile-treehouse-wood.svg"), "VTT must reference tile-treehouse-wood.svg");
  assert.ok(vttHtml.includes("tile-starlight-deck.svg"), "VTT must reference tile-starlight-deck.svg");
  assert.ok(vttHtml.includes("token-portrait-img"), "VTT must include token-portrait-img style");

  // 7. Verify dynamic custom hero asset assignment
  const customHeroRoom = addCustomHeroToRoom({
    roomCode: "ASST",
    name: "Shadow Paw",
    playerName: "Riley",
    playerAge: 9,
    archetype: "Sneaky Ninja Rogue",
    companionPet: "Midnight Crow",
    avatarEmoji: "🗡️",
  });
  const createdHero = customHeroRoom.heroes.find((h) => h.name === "Shadow Paw");
  assert.strictEqual(
    createdHero?.assetPath,
    HEARTHQUEST_ASSETS.heroes.ninjaRogue.path,
    "Custom hero must receive resolved assetPath"
  );
  const createdToken = customHeroRoom.tokens.find((t) => t.name === "Shadow Paw");
  assert.strictEqual(
    createdToken?.assetPath,
    HEARTHQUEST_ASSETS.heroes.ninjaRogue.path,
    "Custom token standee must receive resolved assetPath"
  );

  console.log("✅ PASSED");

  // Suite 16: Foundry 3D Physics Dice Engine & Quick Polyhedral Roll Sync
  process.stdout.write("[TEST] Suite 16: 3D Physics Dice Engine & Quick Roll Sync... ");
  assert.ok(vttHtml.includes("three.min.js"), "VTT HTML must load Three.js for 3D dice");
  assert.ok(vttHtml.includes("dice-3d-overlay"), "VTT HTML must include #dice-3d-overlay");
  assert.ok(vttHtml.includes("dice-3d-canvas"), "VTT HTML must include #dice-3d-canvas");
  assert.ok(vttHtml.includes("Dice3DEngine"), "VTT HTML must embed Dice3DEngine");
  assert.ok(vttHtml.includes("createD10Geometry"), "Dice3DEngine must support d10 polyhedral geometry");
  assert.ok(vttHtml.includes("attachFaceNumbers"), "Dice3DEngine must stamp engraved numbers onto all polyhedral faces");
  assert.ok(vttHtml.includes("createNumberTexture"), "Dice3DEngine must generate high-contrast CanvasTexture numbers");
  assert.ok(vttHtml.includes("extractDistinctFacePlanes"), "Dice3DEngine must extract distinct face planes for each die");
  assert.ok(vttHtml.includes("spawnParticles"), "Dice3DEngine must support crit sparkle particle bursts");
  assert.ok(vttHtml.includes("run2DFallbackRoll"), "Dice3DEngine must include 2D canvas fallback for offline LAN");
  assert.ok(vttHtml.includes("quick-dice-tray"), "VTT UI must include Foundry-style quick dice tray");

  const diceTypes = ["d4", "d6", "d8", "d10", "d12", "d20"] as const;
  for (const die of diceTypes) {
    const qRes = submitQuickPolyhedralRoll({
      roomCode: "DICE",
      dieType: die,
    });
    assert.strictEqual(qRes.roll.dieType, die, `Quick roll dieType must be ${die}`);
    assert.strictEqual(qRes.roll.source, "DIGITAL_3D_ROLLER");
    const maxFace = Number(die.slice(1));
    assert.ok(
      qRes.roll.rawRoll >= 1 && qRes.roll.rawRoll <= maxFace,
      `Quick roll ${die} value ${qRes.roll.rawRoll} must be within 1..${maxFace}`
    );
    assert.strictEqual(qRes.room.rollHistory[0].id, qRes.roll.id, "Quick roll must prepend to room rollHistory");
  }
  console.log("✅ PASSED");

  // Suite 17: Foundry 2D Raycast Dynamic Lighting, Shadow Walls & Vision Occlusion
  process.stdout.write("[TEST] Suite 17: 2D Raycast Dynamic Lighting, Shadow Walls & Doors... ");
  assert.ok(vttHtml.includes("vtt-lighting-canvas"), "VTT HTML must include #vtt-lighting-canvas");
  assert.ok(vttHtml.includes("Lighting2DEngine"), "VTT HTML must embed Lighting2DEngine");
  assert.ok(vttHtml.includes("computeVisibilityPolygon"), "Lighting2DEngine must compute 2D visibility polygons");
  assert.ok(vttHtml.includes("intersectRaySegment"), "Lighting2DEngine must include ray-segment intersection");
  assert.ok(vttHtml.includes("lighting-controls-bar"), "VTT HTML must include lighting & door control bar");

  // Direct mathematical test of ray-segment intersection
  const hit = computeRaySegmentIntersection(1.5, 3.0, 1, 0, 4.0, 2.1, 4.0, 3.9);
  assert.ok(hit, "Ray pointing right from (1.5, 3.0) must intersect wall at x=4.0");
  assert.ok(Math.abs(hit!.x - 4.0) < 1e-6, "Intersection X must be 4.0");
  assert.ok(Math.abs(hit!.t - 2.5) < 1e-6, "Intersection distance t must be 2.5");

  // Visibility polygon occlusion test with closed vs open door
  const lightRoom = getOrCreateRoom("LITE");
  assert.ok(lightRoom.walls && lightRoom.walls.length >= 10, "Room must have default shadow-casting walls & doors");
  const polyClosed = computeVisibilityPolygon(1.5, 3.0, 5.0, lightRoom.walls!);
  const maxClosedX = Math.max(...polyClosed.map((p) => p.x));
  assert.ok(
    maxClosedX <= 4.001,
    `Closed door & partition wall at x=4.0 must block light rays (got maxX=${maxClosedX})`
  );

  // Open door-zone-2 and verify light rays pass through into Zone 2
  const openedDoorRoom = updateRoomLighting({
    roomCode: "LITE",
    ambientLightMode: "TORCHLIT_DUNGEON",
    toggleDoorId: "door-zone-2",
  });
  assert.strictEqual(openedDoorRoom.ambientLightMode, "TORCHLIT_DUNGEON");
  const doorSeg = openedDoorRoom.walls?.find((w) => w.id === "door-zone-2");
  assert.strictEqual(doorSeg?.isOpen, true, "Toggled door must be open");
  assert.strictEqual(doorSeg?.blocksVision, false, "Open door must not block vision");

  const polyOpen = computeVisibilityPolygon(1.5, 3.0, 5.0, openedDoorRoom.walls!);
  const maxOpenX = Math.max(...polyOpen.map((p) => p.x));
  assert.ok(
    maxOpenX > 5.5,
    `Open doorway at x=4.0 must allow light rays to penetrate into Zone 2 (got maxX=${maxOpenX})`
  );
  console.log("✅ PASSED");

  // Suite 18: Tabletop Ruler (5ft), Spell AoE Templates, Ambient Weather & Unraid Custom Tokens
  process.stdout.write("18. Testing Tabletop 5ft Ruler, Spell AoE Templates, Weather & Unraid Custom Tokens... ");
  assert.ok(vttHtml.includes("vtt-tools-canvas"), "VTT HTML must mount tools & weather overlay canvas");
  assert.ok(vttHtml.includes("ToolsWeatherEngine"), "VTT HTML must embed ToolsWeatherEngine runtime");
  assert.ok(vttHtml.includes("select-ambient-weather"), "VTT HTML must include ambient weather selector");
  assert.ok(vttHtml.includes("custom-tokens-bar"), "VTT HTML must include custom Unraid token bar");

  // 3-4-5 right triangle grid distance = 5 squares = 25 ft
  const dist25 = calculateGridDistanceFeet(1, 1, 4, 5);
  assert.strictEqual(dist25.squares, 5);
  assert.strictEqual(dist25.feet, 25);

  const toolsRoom = getOrCreateRoom("TOOL");
  const afterTools = updateRoomToolsAndWeather({
    roomCode: "TOOL",
    ambientWeather: "STARLIGHT_DUST",
    addTemplate: {
      id: "tpl-cone-1",
      shape: "CONE",
      originX: 2,
      originY: 2,
      targetX: 5,
      targetY: 2,
      radiusSquares: 3,
      color: "#f97316",
      label: "Burning Hands (15 ft)",
    },
  });
  assert.strictEqual(afterTools.ambientWeather, "STARLIGHT_DUST");
  assert.strictEqual(afterTools.spellTemplates?.length, 1);

  const afterCircle = updateRoomToolsAndWeather({
    roomCode: "TOOL",
    addTemplate: {
      id: "tpl-circle-1",
      shape: "CIRCLE",
      originX: 5,
      originY: 3,
      targetX: 8,
      targetY: 3,
      radiusSquares: 3,
      color: "#ef4444",
      label: "Fireball (15 ft)",
    },
  });
  assert.strictEqual(afterCircle.spellTemplates?.length, 2);

  const clearedTools = updateRoomToolsAndWeather({
    roomCode: "TOOL",
    clearTemplates: true,
  });
  assert.strictEqual(clearedTools.spellTemplates?.length, 0);

  // Test Unraid custom-tokens folder scanning & token spawning
  const nodeFs = await import("fs");
  const nodePath = await import("path");
  const customDir = getCustomTokensDir();
  nodeFs.mkdirSync(customDir, { recursive: true });
  const testTokenFile = nodePath.join(customDir, "test_mimic_chest.svg");
  nodeFs.writeFileSync(testTokenFile, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#b45309"/></svg>`, "utf-8");
  try {
    const scanned = listCustomTokenAssets();
    const found = scanned.find((t) => t.filename === "test_mimic_chest.svg");
    assert.ok(found, "Expected custom-tokens folder scanner to discover test_mimic_chest.svg");
    assert.strictEqual(found?.url, "/custom-tokens/test_mimic_chest.svg");

    const beforeTokenCount = toolsRoom.tokens.length;
    const afterSpawn = spawnCustomTokenInRoom({
      roomCode: "TOOL",
      name: found!.name,
      assetUrl: found!.url,
      type: "MONSTER",
      gridX: 4,
      gridY: 3,
    });
    assert.strictEqual(afterSpawn.tokens.length, beforeTokenCount + 1);
    const spawnedToken = afterSpawn.tokens[afterSpawn.tokens.length - 1];
    assert.strictEqual(spawnedToken.assetPath, "/custom-tokens/test_mimic_chest.svg");
  } finally {
    if (nodeFs.existsSync(testTokenFile)) {
      nodeFs.unlinkSync(testTokenFile);
    }
  }
  console.log("✅ PASSED");

  // Suite 19: Combat Initiative Tracker, Light/Dark Skills & Character Sheets, Soundscapes & Backdrops
  process.stdout.write("19. Testing Combat Tracker, 5e/Storybook Skills, Ambient Audio & Scene Backdrops... ");
  assert.ok(vttHtml.includes("combat-tracker-bar"), "VTT HTML must render combat tracker strip");
  assert.ok(vttHtml.includes("AmbientAudioEngine"), "VTT HTML must embed AmbientAudioEngine soundscape synthesizer");
  assert.ok(vttHtml.includes("select-scene-backdrop"), "VTT HTML must include scene backdrop selector");
  assert.ok(vttHtml.includes("select-ambient-soundscape"), "VTT HTML must include soundscape selector");
  assert.ok(vttHtml.includes("SKILL_CATALOG"), "VTT HTML must embed serialized skill catalog");

  assert.strictEqual(HEARTHQUEST_SKILLS.length, 11, "Expected 11 core skills (including sleight_of_hand) in HEARTHQUEST_SKILLS");
  for (const sk of HEARTHQUEST_SKILLS) {
    assert.ok(sk.accentLightClass && sk.accentDarkClass, `Skill ${sk.name} must define both light & dark theme styles`);
  }

  for (const bg of Object.values(HEARTHQUEST_ASSETS.backgrounds)) {
    const absPath = path.join(process.cwd(), bg.path.replace(/^\//, ""));
    assert.ok(fs.existsSync(absPath), `Missing backdrop SVG asset on disk: ${absPath}`);
  }
  assert.strictEqual(
    resolveSceneBackdropAsset("FOREST_TREEHOUSE"),
    "/assets/backgrounds/backdrop-enchanted-woods.svg"
  );

  const combatRoom = getOrCreateRoom("CMBT");
  const skillsForHero = getHeroSkillModifiers(combatRoom.heroes[0], combatRoom.rulesTier);
  assert.strictEqual(skillsForHero.length, 11);
  const { room: afterSkillRoom, roll: skillRoll } = submitHeroSkillRoll({
    roomCode: "CMBT",
    characterId: combatRoom.heroes[0].id,
    skillId: "athletics",
  });
  assert.ok(skillRoll.actionTitle.includes("Athletics"));
  assert.strictEqual(afterSkillRoom.rollHistory[0].id, skillRoll.id);

  const rolledCombat = updateRoomCombat({ roomCode: "CMBT", action: "ROLL_INITIATIVE" });
  assert.strictEqual(rolledCombat.combat?.isActive, true);
  assert.ok((rolledCombat.combat?.entries.length || 0) >= 2, "Expected combatants in initiative order");
  assert.strictEqual(rolledCombat.combat?.round, 1);

  const totalEntries = rolledCombat.combat!.entries.length;
  for (let step = 0; step < totalEntries; step++) {
    updateRoomCombat({ roomCode: "CMBT", action: "NEXT_TURN" });
  }
  assert.strictEqual(getOrCreateRoom("CMBT").combat?.round, 2, "Advancing full turn cycle must increment round to 2");

  const endedCombat = updateRoomCombat({ roomCode: "CMBT", action: "END_COMBAT" });
  assert.strictEqual(endedCombat.combat?.isActive, false);

  const atmoRoom = updateRoomAtmosphere({
    roomCode: "CMBT",
    ambientSoundscape: "CRYSTAL_CAVERN",
    sceneBackdrop: "STARLIGHT_OBSERVATORY",
  });
  assert.strictEqual(atmoRoom.ambientSoundscape, "CRYSTAL_CAVERN");
  assert.strictEqual(atmoRoom.sceneBackdrop, "STARLIGHT_OBSERVATORY");
  console.log("✅ PASSED");

  // Suite 20: Foundry-Style Actor & Token Forge (Heroes + Monsters + SVG Generation)
  process.stdout.write("20. Testing Foundry Actor & Token Forge (Character/Monster SVG Generator)... ");
  assert.ok(vttHtml.includes("token-forge-modal"), "VTT HTML must render Foundry Token Forge modal");
  assert.ok(vttHtml.includes("openTokenForgeModal"), "VTT HTML must bind openTokenForgeModal()");
  assert.ok(vttHtml.includes("FORGE_PRESETS"), "VTT HTML must embed Foundry Actor & Monster presets");

  const forgeFs = await import("fs");
  const forgedPaths: string[] = [];
  try {
    const forgedHero = forgeActorAndTokenInRoom({
      roomCode: "CMBT",
      actorType: "HERO",
      name: "Valkyrie Astra",
      archetype: "Starlight Paladin",
      bezelStyle: "ASTRAL_SILVER",
      emblem: "KNIGHT_HELM",
      primaryColor: "#4f46e5",
      accentColor: "#38bdf8",
      hp: 28,
      armorClass: 17,
      lightRadius: 4,
      gridX: 3,
      gridY: 2,
      proficientSkills: ["athletics", "arcana", "perception"],
    });
    forgedPaths.push(forgedHero.tokenFilePath);
    assert.ok(forgeFs.existsSync(forgedHero.tokenFilePath), "Expected forged Hero SVG saved to custom-tokens dir");
    const heroSvg = forgeFs.readFileSync(forgedHero.tokenFilePath, "utf-8");
    assert.ok(heroSvg.includes("<svg") && heroSvg.includes("Valkyrie Astra") && heroSvg.includes("HERO"));
    const createdHero = forgedHero.room.heroes.find((h) => h.name === "Valkyrie Astra");
    assert.ok(createdHero && createdHero.assetPath === forgedHero.tokenAssetUrl);

    const forgedMonster = forgeActorAndTokenInRoom({
      roomCode: "CMBT",
      actorType: "MONSTER",
      name: "Embermaw Wyrm",
      archetype: "Ancient Fire Drake",
      bezelStyle: "OBSIDIAN_CRIMSON",
      emblem: "DRAGON_HEAD",
      primaryColor: "#b91c1c",
      accentColor: "#fb923c",
      hp: 45,
      armorClass: 16,
      lightRadius: 3,
      gridX: 6,
      gridY: 3,
    });
    forgedPaths.push(forgedMonster.tokenFilePath);
    assert.ok(forgeFs.existsSync(forgedMonster.tokenFilePath), "Expected forged Monster SVG saved to custom-tokens dir");
    const monsterSvg = forgeFs.readFileSync(forgedMonster.tokenFilePath, "utf-8");
    assert.ok(monsterSvg.includes("<svg") && monsterSvg.includes("Embermaw Wyrm") && monsterSvg.includes("FOE"));
    const spawnedMonster = forgedMonster.room.tokens.find((t) => t.name === "Embermaw Wyrm");
    assert.ok(spawnedMonster && spawnedMonster.type === "MONSTER" && spawnedMonster.assetPath === forgedMonster.tokenAssetUrl);

    const listedCustom = listCustomTokenAssets();
    assert.ok(listedCustom.some((c) => c.url === forgedMonster.tokenAssetUrl), "Forged SVG must appear in custom-tokens scanner");
  } finally {
    for (const p of forgedPaths) {
      if (forgeFs.existsSync(p)) forgeFs.unlinkSync(p);
    }
  }
  console.log("✅ PASSED");

  // Suite 21: Admin Backend, Stripe HMAC Webhooks, Idempotency, License Keys & POD Fulfillment Queue
  process.stdout.write("21. Testing Admin Payments, Stripe HMAC Webhooks, License Keys & POD Queue... ");
  resetAdminStoreForTesting();
  assert.strictEqual(SUBSCRIPTION_PLANS.length, 3, "Expected 3 household subscription tiers");
  const adminPageHtml = renderAdminHtml(await probeRtx3080Health("http://127.0.0.1:65530"));
  assert.ok(adminPageHtml.includes("payment-gateway-badge"), "Admin UI must render payment gateway badge");
  assert.ok(adminPageHtml.includes("orders-queue-section"), "Admin UI must render POD order queue section");
  assert.ok(adminPageHtml.includes("checkout-modal"), "Admin UI must render storefront checkout modal");

  // 1. Cryptographic License Key signing & tamper rejection
  const signedProKey = generateLicenseKey("hh_test_family", "GAME_IN_A_BOX_PRO");
  const verifiedPro = verifyLicenseKey(signedProKey);
  assert.strictEqual(verifiedPro.valid, true, "Generated license key must verify cleanly");
  assert.strictEqual(verifiedPro.tier, "GAME_IN_A_BOX_PRO");
  const tamperedKey = signedProKey.slice(0, -2) + (signedProKey.endsWith("AA") ? "BB" : "AA");
  assert.strictEqual(verifyLicenseKey(tamperedKey).valid, false, "Tampered license key must be rejected");

  // 2. Stripe-Signature HMAC-SHA256 verification + Idempotent Webhook Processing
  const testSecret = "whsec_unit_test_secret_2026";
  const webhookEvent = {
    id: "evt_stripe_idempotency_test_001",
    type: "checkout.session.completed" as const,
    data: {
      object: {
        id: "cs_test_001",
        customer_email: "webhooks@hearthquest.local",
        metadata: {
          checkoutKind: "PHYSICAL_KIT" as const,
          packageId: "pkg-deluxe-keepsake",
          campaignId: "camp-starlight-otter",
          familyName: "The Nova Family",
          email: "webhooks@hearthquest.local",
          shippingName: "The Nova Family",
          shippingAddress: "99 Nebula Way, Austin, TX",
          paymentMode: "STRIPE_LIVE" as const,
        },
      },
    },
  };
  const rawWebhookPayload = JSON.stringify(webhookEvent);
  const validSigHeader = signStripeWebhookPayloadForTest(rawWebhookPayload, testSecret);
  assert.strictEqual(
    verifyStripeWebhookSignature(rawWebhookPayload, validSigHeader, testSecret),
    true,
    "Valid Stripe-Signature HMAC must verify"
  );
  assert.strictEqual(
    verifyStripeWebhookSignature(rawWebhookPayload, "t=12345,v1=deadbeef", testSecret),
    false,
    "Forged Stripe-Signature HMAC must be rejected"
  );

  const firstRun = processPaymentWebhookEvent(webhookEvent);
  assert.strictEqual(firstRun.processed, true);
  assert.strictEqual(firstRun.duplicate, false);
  assert.strictEqual(firstRun.order?.amountCents, 6900, "Deluxe keepsake kit must lock server price at $69.00");
  assert.strictEqual(firstRun.order?.status, "PAID_QUEUED");
  assert.strictEqual(firstRun.household?.subscriptionTier, "DIGITAL_PLUS");

  // Replay exact same webhook event.id -> must be blocked by idempotency table
  const duplicateRun = processPaymentWebhookEvent(webhookEvent);
  assert.strictEqual(duplicateRun.processed, false);
  assert.strictEqual(duplicateRun.duplicate, true, "Duplicate webhook event.id must be ignored");
  assert.strictEqual(
    getAdminStoreSnapshot().orders.filter((o) => o.email === "webhooks@hearthquest.local").length,
    1,
    "Idempotency guard must prevent duplicate order creation"
  );

  // 3. Sandbox Checkout Session + Operator PIN Auth + POD Fulfillment State Machine
  const sandboxSession = await createCheckoutSession({
    checkoutKind: "PHYSICAL_KIT",
    packageId: "pkg-starter-box",
    campaignId: "camp-goblin-bakery",
    familyName: "The Bramble Family",
    email: "bramble@hearthquest.local",
    shippingAddress: "42 Acorn Hollow",
  });
  assert.strictEqual(sandboxSession.mode, "SANDBOX_SIMULATED");
  assert.strictEqual(sandboxSession.amountCents, 4900);
  assert.ok(sandboxSession.order?.id, "Sandbox checkout must queue a PrintFulfillmentOrder");

  assert.strictEqual(verifyOperatorPin("wrong-pin"), false, "Invalid Operator PIN must fail");
  assert.strictEqual(verifyOperatorPin(process.env.HEARTHQUEST_ADMIN_PIN || "1234"), true);

  const orderId = sandboxSession.order!.id;
  const renderingOrder = advanceFulfillmentOrder({
    orderId,
    nextStatus: "RENDERING_PRINT_FILES",
    adminPin: process.env.HEARTHQUEST_ADMIN_PIN || "1234",
  });
  assert.strictEqual(renderingOrder.status, "RENDERING_PRINT_FILES");

  const shippedOrder = advanceFulfillmentOrder({
    orderId,
    nextStatus: "SHIPPED",
    trackingNumber: "USPS-TRACK-777",
    adminPin: process.env.HEARTHQUEST_ADMIN_PIN || "1234",
  });
  assert.strictEqual(shippedOrder.status, "SHIPPED");
  assert.strictEqual(shippedOrder.trackingNumber, "USPS-TRACK-777");

  const manifestHtml = renderPrintableKitHtml(orderId);
  assert.ok(
    manifestHtml.includes(orderId) && manifestHtml.includes("42 Acorn Hollow"),
    "Printable kit HTML must embed order packing slip & shipping address when orderId is provided"
  );
  console.log("✅ PASSED");

  // Suite 22: SQLite (node:sqlite) Persistence, Lore Continuity Keeper & Level-Scaled One-Shots
  process.stdout.write("[TEST] Suite 22: SQLite Backend, Lore Continuity Guard & Level-Scaled One-Shots... ");
  assert.ok(getAdminDatabasePath().endsWith(".db"), "Admin backend must persist to SQLite .db file");
  assert.ok(getVttDatabasePath().endsWith(".db"), "VTT room store must persist to SQLite .db file");
  assert.ok(fs.existsSync(getAdminDatabasePath()), "SQLite database file must exist on disk");

  assert.ok(adminHtml.includes("SQLITE WAL"), "Admin UI must show SQLite WAL indicator");
  assert.ok(adminHtml.includes("Lore &amp; Map Continuity") || adminHtml.includes("Lore & Map Continuity"), "Admin UI must render Lore Continuity Keeper card");

  const coreLore = listLoreRegistry();
  assert.ok(coreLore.length >= 3, "SQLite lore_registry must be seeded with core campaigns");

  const overlapCheck = registerLoreEntry({
    entryType: "ONE_SHOT",
    title: "The Great Goblin Bakery Heist",
    biome: "BAKERY",
    plotPremise: "Duplicate plot test",
    mainAntagonist: "Mayor Bramblecrust",
    keyLocations: ["Croissant Pantry"],
    levelRange: "1-2",
  });
  assert.strictEqual(overlapCheck.ok, false, "Lore Continuity Keeper must reject duplicate campaign titles/bosses");

  // Scale party heroes to level 4 and generate two back-to-back unique One-Shots
  const oneShotRoom = getOrCreateRoom("ONSH");
  for (const h of oneShotRoom.heroes) {
    h.levelStars = 4;
  }
  const firstOneShot = generateOneShotInRoom("ONSH");
  assert.strictEqual(firstOneShot.partyLevel, 4, "One-Shot must scale to party average level 4");
  assert.strictEqual(firstOneShot.room.isOneShot, true);
  assert.strictEqual(firstOneShot.room.zones.length, 3);
  const monsterTokens1 = firstOneShot.room.tokens.filter((t) => t.type === "MONSTER");
  assert.ok(
    monsterTokens1.length >= 2 &&
      Math.max(...monsterTokens1.map((m) => m.maxHp || 0)) >= 20 &&
      monsterTokens1.every((m) => (m.maxHp || 0) >= 8),
    "Level 4 One-Shot boss (>=20 HP) and minions (>=8 HP) must scale upward"
  );

  const secondOneShot = generateOneShotInRoom("ONSH");
  assert.notStrictEqual(
    secondOneShot.loreEntry.title,
    firstOneShot.loreEntry.title,
    "Second procedural One-Shot must not repeat the first One-Shot title"
  );
  assert.notStrictEqual(
    secondOneShot.loreEntry.mainAntagonist,
    firstOneShot.loreEntry.mainAntagonist,
    "Second procedural One-Shot must select a distinct antagonist"
  );
  assert.ok(
    listLoreRegistry().some((l) => l.id === firstOneShot.loreEntry.id) &&
      listLoreRegistry().some((l) => l.id === secondOneShot.loreEntry.id),
    "Generated One-Shots must persist in shared SQLite lore_registry"
  );
  assert.ok(vttHtml.includes("generateScaledOneShot()"), "VTT HTML must include Level-Scaled One-Shot button");

  const loreSkillPath = path.join(rootDir, ".gemini", "skills", "lore-continuity-keeper", "SKILL.md");
  assert.ok(fs.existsSync(loreSkillPath), "Lore Continuity Keeper skill must exist in .gemini/skills/");
  const dockerfileText = fs.readFileSync(path.join(rootDir, "docker", "Dockerfile"), "utf-8");
  assert.ok(dockerfileText.includes("node:24-alpine"), "Dockerfile must use Node 24 for unflagged node:sqlite");
  const ciWorkflowText = fs.readFileSync(path.join(rootDir, ".github", "workflows", "docker-publish.yml"), "utf-8");
  assert.ok(ciWorkflowText.includes("node-version: 24"), "CI workflow must use Node 24 for unflagged node:sqlite");
  console.log("✅ PASSED");

  // Suite 23: Public Storefront Webpage Frontend (/store) & SQLite Cart/Checkout Backend
  process.stdout.write("[TEST] Suite 23: Storefront Frontend (/store) & Cart/Promo/Lookup Backend... ");
  const storeHtml = renderStorefrontHtml(3);
  assert.ok(storeHtml.includes("HearthQuest Store"), "Storefront HTML must include HearthQuest Store branding");
  assert.ok(storeHtml.includes("toggleCartDrawer("), "Storefront HTML must include Cart Drawer toggle");
  assert.ok(storeHtml.includes("handleOrderLookup("), "Storefront HTML must include Order Tracking Lookup form");
  assert.ok(storeHtml.includes("HEARTH10"), "Storefront HTML must display active promo code");

  const storeCatalog = getStoreCatalog(4);
  assert.strictEqual(storeCatalog.packages.length, 4, "Store must offer Print-at-Home DIY ($15), Shipped Boxes ($49/$69), and $4 One-Shot Pack");
  assert.strictEqual(storeCatalog.subscriptions.length, 3);
  assert.ok(
    storeCatalog.subscriptions.every((p) => p.priceMonthlyUsd > 0),
    "No $0 free self-hosted tier should remain — only affordable paid update/DIY/mailer tiers"
  );
  assert.ok(storeHtml.includes("playTrialChoice("), "Storefront HTML must include interactive Play Encounter 1 Free trial UI");
  assert.ok(storeHtml.includes("attemptContinueEncounter2("), "Storefront HTML must include Encounter 2 paywall checkpoint");

  // Play Encounter 1 for free -> paywall blocks Encounter 2 until paid
  const freeEnc1 = playFreeTrialEncounter({ choiceId: "biscuit", rollValue: 5 });
  assert.strictEqual(freeEnc1.encounter1Completed, true);
  assert.strictEqual(freeEnc1.outcomeType, "SUCCESS");
  const blockedEnc2 = attemptAdvanceTrialToEncounter2({ licenseKey: "" });
  assert.strictEqual(blockedEnc2.allowed, false);
  assert.strictEqual(blockedEnc2.paywallRequired, true, "Encounter 2 must require payment or valid paid license");
  const trialKeyBlocked = attemptAdvanceTrialToEncounter2({
    licenseKey: generateLicenseKey("hh_preview", "TRIAL_PREVIEW"),
  });
  assert.strictEqual(trialKeyBlocked.allowed, false, "TRIAL_PREVIEW key must NOT bypass Encounter 2 paywall");

  // Verify cheaper DIY Print-at-Home Starter Pack ($15) charges $0 shipping
  const diyQuote = quoteStoreItems([
    { itemType: "PHYSICAL_KIT", productId: "pkg-starter-diy", quantity: 1 },
  ]);
  assert.strictEqual(diyQuote.subtotalCents, 1500, "Print-at-Home DIY pack must cost $15 (cheaper than $49 shipped box)");
  assert.strictEqual(diyQuote.shippingCents, 0, "DIY Print-at-Home kit must charge $0 shipping");

  assert.ok(storeCatalog.oneShots.length >= 4, "Store catalog must expose Level-Scaled One-Shots");
  assert.strictEqual(storeCatalog.oneShots[0].scaledBossHp, 24, "Level 4 One-Shot catalog preview must scale Boss HP to 24");
  assert.strictEqual(storeCatalog.oneShots[0].scaledDc5e, 14, "Level 4 One-Shot catalog preview must scale DC to 14");

  const testSessionId = "store_test_sess_23";
  updateStoreCart({
    sessionId: testSessionId,
    action: "ADD",
    item: {
      itemType: "PHYSICAL_KIT",
      productId: "pkg-starter-box",
      campaignId: "camp-goblin-bakery",
      quantity: 1,
    },
  });
  updateStoreCart({
    sessionId: testSessionId,
    action: "ADD",
    item: {
      itemType: "ONE_SHOT_PACK",
      productId: "pkg-oneshot-pack",
      oneShotSlug: storeCatalog.oneShots[0].slug,
      partyLevel: 3,
      quantity: 1,
    },
  });
  const discountedCart = updateStoreCart({
    sessionId: testSessionId,
    action: "APPLY_PROMO",
    promoCode: "HEARTH10",
  });
  assert.strictEqual(discountedCart.quote.subtotalCents, 5300, "Starter Box ($49) + DIY One-Shot ($4) = $53.00");
  assert.strictEqual(discountedCart.quote.discountCents, 530, "HEARTH10 must apply 10% ($5.30) server-side discount");
  assert.strictEqual(discountedCart.quote.shippingCents, 0, "Orders >= $49 must qualify for free USPS shipping");
  assert.strictEqual(discountedCart.quote.totalCents, 4770, "Total due after HEARTH10 must equal $47.70");

  const invalidPromoQuote = quoteStoreItems(discountedCart.items, "FAKE99");
  assert.ok(invalidPromoQuote.promoError, "Invalid promo code must report promoError");
  assert.strictEqual(invalidPromoQuote.discountCents, 0);

  const checkoutRes = await checkoutStoreCart({
    sessionId: testSessionId,
    familyName: "The Oakshield Family",
    email: "oakshield@hearthquest.local",
    shippingAddress: "77 Evergreen Way, Portland, OR",
  });
  assert.strictEqual(checkoutRes.ok, true);
  assert.ok(checkoutRes.orders.length >= 1, "Store checkout must create PrintFulfillmentOrder(s)");
  assert.ok(checkoutRes.licenseKey?.startsWith("HQ-"), "Store checkout must issue Household License Key");
  assert.strictEqual(getStoreCart(testSessionId).items.length, 0, "SQLite cart must clear after checkout");

  // Issued license key after purchase must unlock Encounter 2+
  const unlockedEnc2 = attemptAdvanceTrialToEncounter2({
    licenseKey: checkoutRes.licenseKey,
  });
  assert.strictEqual(unlockedEnc2.allowed, true, "Paid checkout license key must unlock Encounter 2+");
  assert.strictEqual(unlockedEnc2.paywallRequired, false);

  const validLookup = lookupCustomerOrder({
    orderId: checkoutRes.orders[0].id,
    email: "oakshield@hearthquest.local",
  });
  assert.strictEqual(validLookup.found, true, "Customer order lookup must succeed with matching email + orderId");
  assert.strictEqual(validLookup.order?.shippingAddress, "77 Evergreen Way, Portland, OR");

  const wrongEmailLookup = lookupCustomerOrder({
    orderId: checkoutRes.orders[0].id,
    email: "intruder@otherfamily.com",
  });
  assert.strictEqual(wrongEmailLookup.found, false, "Order lookup must block mismatched email");
  assert.ok(vttHtml.includes("btn-open-storefront"), "VTT header must include direct link to Public Storefront");
  console.log("✅ PASSED");

  // Suite 24: VTT Account Registration, Scrypt Login, Session 1 Free Play -> Session 2+ Paywall Gate & Skill Sync
  process.stdout.write("[TEST] Suite 24: VTT Account Auth, Session 1 Free Demo Paywall & Skill Sync... ");
  assert.ok(vttHtml.includes("vtt-auth-modal"), "VTT HTML must render Demo Account Auth Modal");
  assert.ok(vttHtml.includes("vtt-paywall-modal"), "VTT HTML must render Session 2+ Paywall Modal");
  assert.ok(vttHtml.includes("submitVttRegister("), "VTT HTML must expose account registration handler");

  // 1. Register new demo family account -> starts on TRIAL_PREVIEW with assigned personal Demo Room
  const demoReg = registerVttAccount({
    familyName: "The Cedar Family",
    email: "cedar-demo@hearthquest.local",
    password: "super-secret-password",
  });
  assert.strictEqual(demoReg.account.subscriptionTier, "TRIAL_PREVIEW");
  assert.strictEqual(demoReg.room.roomCode, demoReg.account.trialRoomCode);
  assert.ok(demoReg.room.storyNodes.length >= 2);
  assert.ok(getVttAccountByToken(demoReg.token)?.email === "cedar-demo@hearthquest.local");

  // Duplicate email & bad password must be rejected cleanly
  assert.throws(
    () =>
      registerVttAccount({
        familyName: "Dup",
        email: "cedar-demo@hearthquest.local",
        password: "anotherpassword",
      }),
    /already exists/
  );
  assert.throws(
    () =>
      loginVttAccount({
        email: "cedar-demo@hearthquest.local",
        password: "wrong-password",
      }),
    /Invalid email or password/
  );
  const demoLogin = loginVttAccount({
    email: "cedar-demo@hearthquest.local",
    password: "super-secret-password",
  });
  assert.strictEqual(demoLogin.account.id, demoReg.account.id);

  // 2. Session 1 (Node 0) allowed free; Session 2 (Node 1) blocked until paid license activated
  const session1Gate = evaluateVttSessionProgressionGate({
    room: demoReg.room,
    targetNodeId: demoReg.room.storyNodes[0].id,
    account: demoReg.account,
  });
  assert.strictEqual(session1Gate.allowed, true, "Session 1 (Node 0) must be playable free on Demo Account");

  const session2Blocked = evaluateVttSessionProgressionGate({
    room: demoReg.room,
    targetNodeId: demoReg.room.storyNodes[1].id,
    account: demoReg.account,
  });
  assert.strictEqual(session2Blocked.allowed, false, "Session 2+ must require paid upgrade");
  assert.strictEqual(session2Blocked.paywallRequired, true);

  // 3. Activate paid HQ-UPD license key -> immediately unlocks Session 2+
  const paidUpdatesKey = generateLicenseKey(demoReg.account.id, "DIGITAL_UPDATES");
  const upgradedAcct = activateLicenseOnVttAccount({
    accountId: demoReg.account.id,
    licenseKey: paidUpdatesKey,
  });
  assert.strictEqual(upgradedAcct.subscriptionTier, "DIGITAL_UPDATES");

  const session2Unlocked = evaluateVttSessionProgressionGate({
    room: demoReg.room,
    targetNodeId: demoReg.room.storyNodes[1].id,
    account: upgradedAcct,
  });
  assert.strictEqual(session2Unlocked.allowed, true, "Activated HQ-UPD license must unlock Session 2+ in VTT");

  // 4. Verify all 9 workspace SKILL.md files exist cleanly
  const skillDirs = [
    path.join(rootDir, ".agents", "skills", "character-token-designer", "SKILL.md"),
    path.join(rootDir, ".agents", "skills", "dnd-5e-srd-expert", "SKILL.md"),
    path.join(rootDir, ".agents", "skills", "family-gm-copilot", "SKILL.md"),
    path.join(rootDir, ".agents", "skills", "hearthquest-platform-expert", "SKILL.md"),
    path.join(rootDir, ".agents", "skills", "subagent-release-workflow", "SKILL.md"),
    path.join(rootDir, ".agents", "skills", "tabletop-audio-director", "SKILL.md"),
    path.join(rootDir, ".agents", "skills", "tabletop-theme-specialist", "SKILL.md"),
    path.join(rootDir, ".agents", "skills", "vtt-canvas-architect", "SKILL.md"),
    path.join(rootDir, ".gemini", "skills", "lore-continuity-keeper", "SKILL.md"),
  ];
  for (const sp of skillDirs) {
    assert.ok(fs.existsSync(sp), `Skill missing: ${sp}`);
    const txt = fs.readFileSync(sp, "utf8");
    assert.ok(txt.includes("HEARTHQUEST_SKILL_BUILD_STAMP:START"), `Skill missing auto-stamp marker: ${sp}`);
  }
  console.log("✅ PASSED");

  // Suite 25: Visual Asset Overhaul (Enhanced 2x2 Tactical Tiles, Foundry Ashlar Walls/Hinged Doors, Trap SVG Sprites & Compositing)
  process.stdout.write("25. Testing Foundry Visual Assets (Tiles, Architectural Walls/Doors, Trap SVGs & Compositing)... ");
  const trapFiles = [
    path.join(rootDir, "assets", "traps", "trap-spike-plate.svg"),
    path.join(rootDir, "assets", "traps", "trap-flour-snare.svg"),
    path.join(rootDir, "assets", "traps", "trap-arcane-rune.svg"),
  ];
  for (const tf of trapFiles) {
    assert.ok(fs.existsSync(tf), `Trap SVG asset missing: ${tf}`);
    const svgContent = fs.readFileSync(tf, "utf8");
    assert.ok(svgContent.includes("<svg") && svgContent.includes("</svg>"), `Invalid trap SVG markup: ${tf}`);
  }

  assert.strictEqual(HEARTHQUEST_ASSETS.traps.spikePlate.path, "/assets/traps/trap-spike-plate.svg");
  assert.strictEqual(resolveTrapAsset("Sticky Flour-Poof Tripwire"), "/assets/traps/trap-flour-snare.svg");
  assert.strictEqual(resolveTrapAsset("Glowing Arcane Frost Rune"), "/assets/traps/trap-arcane-rune.svg");
  assert.strictEqual(resolveTrapAsset("Hidden Pressure Plate"), "/assets/traps/trap-spike-plate.svg");

  const visualVttHtml = renderVttAppHtml(demoReg.room);
  assert.ok(
    visualVttHtml.includes("Foundry Architectural Masonry Walls") &&
      visualVttHtml.includes("ctx.arc(x1, y1, leafLen, baseAngle, openAngle)"),
    "VTT must render Foundry masonry walls, corner pillars, and swinging door arcs"
  );
  assert.ok(
    visualVttHtml.includes("background-size: 20% 33.3333%;") &&
      visualVttHtml.includes("opacity-65 pointer-events-none") &&
      visualVttHtml.includes("/assets/traps/trap-flour-snare.svg") &&
      !visualVttHtml.includes('gridEl.style.opacity = "0.84"'),
    "VTT must align 2x2 floor tiles, blend scenic backdrops crisply, render Foundry trap SVGs, and keep token/grid opacity at 1.0"
  );

  const bakeryTileSvg = fs.readFileSync(path.join(rootDir, "assets", "tiles", "tile-bakery-floor.svg"), "utf8");
  const treehouseTileSvg = fs.readFileSync(path.join(rootDir, "assets", "tiles", "tile-treehouse-wood.svg"), "utf8");
  const starlightTileSvg = fs.readFileSync(path.join(rootDir, "assets", "tiles", "tile-starlight-deck.svg"), "utf8");
  assert.ok(
    bakeryTileSvg.includes("stop-opacity=") &&
      treehouseTileSvg.includes("stop-opacity=") &&
      starlightTileSvg.includes("stop-opacity="),
    "Floor tile SVGs must use translucent stone/wood/astral gradients for scenic backdrop depth"
  );
  console.log("✅ PASSED");

  // Suite 26: Door Locks, Unlocked Free Open & Lockpick Sleight-of-Hand Checks
  process.stdout.write("26. Testing Door Locks, Unlocked Doors & Sleight-of-Hand Lockpick Checks... ");
  const lockRoom = getOrCreateRoom("LOCK");
  const unlockedDoor = lockRoom.walls?.find((w) => w.id === "door-zone-2");
  const lockedVaultDoor = lockRoom.walls?.find((w) => w.id === "door-zone-3");
  assert.ok(unlockedDoor && unlockedDoor.isDoor, "door-zone-2 must exist");
  assert.strictEqual(Boolean(unlockedDoor?.isLocked), false, "door-zone-2 must start unlocked");
  assert.ok(lockedVaultDoor && lockedVaultDoor.isDoor, "door-zone-3 must exist");
  assert.strictEqual(lockedVaultDoor?.isLocked, true, "door-zone-3 must start locked by default");
  assert.strictEqual(lockedVaultDoor?.lockDc, 12, "Locked vault door must carry default DC 12");

  // 1. Clicking an unlocked door opens it freely without rolling dice
  const freeOpen = attemptInteractDoor({
    roomCode: "LOCK",
    doorId: "door-zone-2",
    characterId: lockRoom.heroes[0].id,
  });
  assert.strictEqual(freeOpen.lockedBlocked, false);
  assert.strictEqual(freeOpen.openedNow, true, "Unlocked door must swing open freely");
  assert.strictEqual(freeOpen.roll, undefined, "Opening unlocked door must not require a lockpick check");

  // 2. Clicking a locked door with a failing die roll keeps it closed & locked and logs the check
  const failLockpick = attemptInteractDoor({
    roomCode: "LOCK",
    doorId: "door-zone-3",
    characterId: lockRoom.heroes[0].id,
    rawRollOverride: 1,
  });
  assert.strictEqual(failLockpick.lockedBlocked, true, "Failed lockpick roll must keep door locked");
  assert.strictEqual(failLockpick.openedNow, false);
  assert.ok(failLockpick.roll && failLockpick.roll.actionTitle.includes("Lockpick"), "Failed attempt must log Lockpick skill check");
  assert.strictEqual(
    failLockpick.room.walls?.find((w) => w.id === "door-zone-3")?.isLocked,
    true,
    "Door must remain locked after failed check"
  );

  // 3. Passing the lockpick check unlocks & swings the door open cleanly
  const passLockpick = attemptInteractDoor({
    roomCode: "LOCK",
    doorId: "door-zone-3",
    characterId: lockRoom.heroes[0].id,
    rawRollOverride: 20,
  });
  assert.strictEqual(passLockpick.lockedBlocked, false);
  assert.strictEqual(passLockpick.unlockedNow, true, "Successful lockpick roll must unlock door");
  assert.strictEqual(passLockpick.openedNow, true, "Successful lockpick roll must open door");
  assert.strictEqual(
    passLockpick.room.walls?.find((w) => w.id === "door-zone-3")?.isLocked,
    false
  );
  assert.strictEqual(
    passLockpick.room.walls?.find((w) => w.id === "door-zone-3")?.blocksVision,
    false
  );

  // 4. GM lock toggle & UI HTML hooks verification
  const relockedRoom = updateRoomLighting({
    roomCode: "LOCK",
    toggleLockDoorId: "door-zone-3",
    lockDc: 14,
  });
  const relockedDoor = relockedRoom.walls?.find((w) => w.id === "door-zone-3");
  assert.strictEqual(relockedDoor?.isLocked, true, "GM toggleLockDoorId must lock door cleanly");
  assert.strictEqual(relockedDoor?.isOpen, false);
  assert.strictEqual(relockedDoor?.lockDc, 14);

  const lockVttHtml = renderVttAppHtml(relockedRoom);
  assert.ok(
    lockVttHtml.includes("vtt-door-hitboxes") &&
      lockVttHtml.includes("lockpick-modal") &&
      lockVttHtml.includes("interactMapDoor") &&
      lockVttHtml.includes("Detailed Iron & Gold Padlock Emblem"),
    "VTT UI & lighting canvas must include on-map door hitboxes, padlock emblem & lockpick roll modal"
  );
  console.log("✅ PASSED");

  // ------------------------------------------------------------------
  // Suite 27: Account Game Type + Age Group Tailored Generation & Spoken RP Modals
  // ------------------------------------------------------------------
  process.stdout.write("[Test 27/30] Account RulesTier + AgeGroup Tailored Session & Spoken Group RP Modals ... ");
  const cozyReg = registerVttAccount({
    email: "storykeeper@hearthquest.test",
    displayName: "Storykeeper Mom",
    password: "FamilyPassword123!",
    preferredRulesTier: "STORYBOOK_D6",
    preferredAgeGroup: "AGES_5_7",
    roomCode: "TAIL",
  });
  assert.strictEqual(cozyReg.account.preferredRulesTier, "STORYBOOK_D6");
  assert.strictEqual(cozyReg.account.preferredAgeGroup, "AGES_5_7");
  assert.ok(cozyReg.room, "Registration must immediately generate tailored Session 1 room");
  assert.strictEqual(cozyReg.room.rulesTier, "STORYBOOK_D6");
  assert.strictEqual(cozyReg.room.ageGroup, "AGES_5_7");
  assert.strictEqual(cozyReg.room.contentRating, "COZY_G");
  assert.ok(cozyReg.room.sessionOpeningHook && cozyReg.room.sessionOpeningHook.length > 40);
  assert.ok(
    !cozyReg.room.sessionOpeningHook.includes("Playing ") &&
      !/\b[1-3]\.\s/.test(cozyReg.room.sessionOpeningHook) &&
      !cozyReg.room.sessionOpeningHook.includes("HP)"),
    "DM opening hook must read like authentic tabletop narration without UI/system jargon or HP stats"
  );
  assert.ok(Array.isArray(cozyReg.room.mapProps) && cozyReg.room.mapProps.length >= 10, "Tailored room must populate Foundry mapProps");
  assert.ok(cozyReg.room.groundTileTheme, "Tailored room must include groundTileTheme");
  assert.strictEqual(cozyReg.room.activeRpPrompt?.trigger, "SESSION_START");
  assert.ok(
    cozyReg.room.tokens.some((t) => t.name.includes("Milo Hearthbaker")) &&
      cozyReg.room.tokens.some((t) => t.name.includes("Goblin Boss")),
    "Storybook Ages 5-7 account must generate Cozy G Oakhaven NPC & Base 5e Boss cast"
  );

  // Switch preferences to 5e Teens 13+ and verify full world + difficulty + cast regeneration
  const teenSwitch = updateVttAccountPreferences({
    accountId: cozyReg.account.id,
    preferredRulesTier: "STANDARD_5E",
    preferredAgeGroup: "TEENS_13_PLUS",
    roomCode: "TAIL",
    regenerateRoom: true,
  });
  assert.strictEqual(teenSwitch.account.preferredRulesTier, "STANDARD_5E");
  assert.strictEqual(teenSwitch.account.preferredAgeGroup, "TEENS_13_PLUS");
  assert.strictEqual(teenSwitch.room.rulesTier, "STANDARD_5E");
  assert.strictEqual(teenSwitch.room.ageGroup, "TEENS_13_PLUS");
  assert.strictEqual(teenSwitch.room.contentRating, "CLASSIC_PG13");
  assert.ok(
    teenSwitch.room.tokens.some((t) => t.name.includes("Specter")) &&
      teenSwitch.room.tokens.some((t) => t.name.includes("Captain Vespera Thorne")),
    "Teens 13+ 5e regeneration must spawn Specter boss & Captain Vespera Thorne"
  );
  const teenVaultDoor = teenSwitch.room.walls?.find((w) => w.isDoor && w.isLocked);
  assert.strictEqual(teenVaultDoor?.lockDc, 14, "STANDARD_5E tailored vault door must scale to DC 14");

  // Trigger NPC RP cue popup & record spoken group reply
  const npcPrompt = teenSwitch.room.storyNodes[0]?.rpPrompts?.find((p) => p.trigger === "NPC_DIALOG");
  assert.ok(npcPrompt, "Tailored Session 1 node must include NPC_DIALOG RP prompt");
  const cuedRoom = triggerRoomRpPrompt({ roomCode: "TAIL", promptId: npcPrompt.id });
  assert.strictEqual(cuedRoom.activeRpPrompt?.id, npcPrompt.id);
  const repliedRoom = triggerRoomRpPrompt({
    roomCode: "TAIL",
    dismiss: true,
    playerReply: "We stand with the Emberheart Forge!",
  });
  assert.strictEqual(repliedRoom.activeRpPrompt, null);
  assert.ok(
    repliedRoom.storyFlags.some((f) => f.includes("RP_REPLY:") && f.includes("Emberheart")),
    "Group RP reply must log into storyFlags and dismiss active modal"
  );

  // Verify VTT UI exposes Account Game Type/Age controls, Cross D-Pad, Collision & Spoken Group RP Modal
  const tailoredHtml = renderVttAppHtml(teenSwitch.room);
  assert.ok(
    tailoredHtml.includes("reg-rules-tier") &&
      tailoredHtml.includes("reg-age-group") &&
      tailoredHtml.includes("vtt-account-preferences-box") &&
      tailoredHtml.includes("rp-readout-modal") &&
      tailoredHtml.includes("speakRpPromptText") &&
      tailoredHtml.includes("saveVttAccountPreferences") &&
      tailoredHtml.includes("vtt-dpad-controller") &&
      tailoredHtml.includes("dpad-btn-up") &&
      tailoredHtml.includes("move-blocked-banner"),
    "VTT HTML must render Game System & Age Group selectors, Cross D-Pad, Wall Collision Banner & Spoken Group RP Modal"
  );

  // Verify Wall & Closed/Locked Door Movement Collision (`attemptMoveRoomToken`)
  const heroTokStart = teenSwitch.room.tokens.find((t) => t.type === "HERO");
  assert.ok(heroTokStart, "Tailored room must have a starter HERO token");
  // Place hero inside zone 1 near solid partition wall (3, 1) -> trying to step through wall-z1-top (4, 1) must FAIL
  moveRoomToken({
    roomCode: "TAIL",
    tokenId: heroTokStart.id,
    targetX: 3,
    targetY: 1,
    ignoreWalls: true,
  });
  const wallBump = attemptMoveRoomToken({
    roomCode: "TAIL",
    tokenId: heroTokStart.id,
    deltaX: 1,
    deltaY: 0,
  });
  assert.strictEqual(wallBump.moved, false, "Hero must NOT pass through solid partition wall");
  assert.strictEqual(
    wallBump.room.tokens.find((t) => t.id === heroTokStart.id)?.gridX,
    3,
    "Blocked hero X must stay at 3"
  );

  // Place hero in front of closed door-zone-2 at (3, 2) -> stepping east into (4, 2) while door is closed must FAIL
  moveRoomToken({
    roomCode: "TAIL",
    tokenId: heroTokStart.id,
    targetX: 3,
    targetY: 2,
    ignoreWalls: true,
  });
  const closedDoorBump = attemptMoveRoomToken({
    roomCode: "TAIL",
    tokenId: heroTokStart.id,
    deltaX: 1,
    deltaY: 0,
  });
  assert.strictEqual(closedDoorBump.moved, false, "Hero must NOT pass through closed door");
  assert.strictEqual(closedDoorBump.blockedByDoorId, "door-zone-2");
  assert.strictEqual(closedDoorBump.isLockedDoor, false);

  // Open unlocked door-zone-2, then stepping east through (4, 2) must SUCCEED
  attemptInteractDoor({ roomCode: "TAIL", doorId: "door-zone-2" });
  const openDoorPass = attemptMoveRoomToken({
    roomCode: "TAIL",
    tokenId: heroTokStart.id,
    deltaX: 1,
    deltaY: 0,
  });
  assert.strictEqual(openDoorPass.moved, true, "Hero must walk smoothly through opened door");
  assert.strictEqual(openDoorPass.room.tokens.find((t) => t.id === heroTokStart.id)?.gridX, 4);

  // Step up to locked vault door-zone-3 at (6, 2) -> stepping east into (7, 2) while locked must FAIL with isLockedDoor=true
  moveRoomToken({
    roomCode: "TAIL",
    tokenId: heroTokStart.id,
    targetX: 6,
    targetY: 2,
    ignoreWalls: true,
  });
  const lockedDoorBump = attemptMoveRoomToken({
    roomCode: "TAIL",
    tokenId: heroTokStart.id,
    deltaX: 1,
    deltaY: 0,
  });
  assert.strictEqual(lockedDoorBump.moved, false, "Hero must NOT pass through locked vault door");
  assert.strictEqual(lockedDoorBump.blockedByDoorId, "door-zone-3");
  assert.strictEqual(lockedDoorBump.isLockedDoor, true);
  console.log("✅ PASSED");

  // ------------------------------------------------------------------
  // Suite 28: Scannable ISO/IEC 18004 QR Code Matrix & Per-User Isolated Sessions
  // ------------------------------------------------------------------
  process.stdout.write("[Test 28/28] Scannable ISO/IEC 18004 QR Code Matrix & Per-User Private Sessions ... ");
  const fullUrl = "http://192.168.1.42:3000/?room=K7P2&mode=kid";
  const qr = encodeQrMatrix(fullUrl);
  assert.ok(qr.version >= 2 && qr.version <= 10, "Full LAN join URL must select valid QR Version 2..10");
  assert.strictEqual(qr.size, 17 + qr.version * 4, "QR matrix size must match ISO 17 + 4*version");
  // Verify exact 7x7 Top-Left, Top-Right, and Bottom-Left Finder Patterns + Dark Module + Timing
  for (let i = 0; i < 7; i++) {
    assert.strictEqual(qr.modules[0][i], true, "TL finder top border dark");
    assert.strictEqual(qr.modules[i][0], true, "TL finder left border dark");
    assert.strictEqual(qr.modules[0][qr.size - 7 + i], true, "TR finder top border dark");
    assert.strictEqual(qr.modules[qr.size - 7][i], true, "BL finder top border dark");
  }
  assert.strictEqual(qr.modules[qr.size - 8][8], true, "Standard ISO dark module must be set");
  assert.strictEqual(qr.modules[6][8], true, "Timing row col 8 dark");
  assert.strictEqual(qr.modules[6][9], false, "Timing row col 9 light");

  const realQrSvg = generateJoinQrSvg("K7P2", fullUrl);
  assert.ok(
    realQrSvg.includes('shape-rendering="crispEdges"') &&
      realQrSvg.includes("ROOM CODE: K7P2") &&
      !realQrSvg.includes('x="45" y="75" width="100" height="40"'),
    "QR SVG must draw crisp ISO modules with ZERO obscuring center box"
  );

  // Two distinct users registering must each get their own isolated roomCode and session
  const userA = registerVttAccount({
    email: "alice.family@hearthquest.test",
    familyName: "Alice Family",
    password: "PasswordAlice123!",
    preferredRulesTier: "STORYBOOK_D6",
    preferredAgeGroup: "AGES_5_7",
  });
  const userB = registerVttAccount({
    email: "bob.family@hearthquest.test",
    familyName: "Bob Family",
    password: "PasswordBob123!",
    preferredRulesTier: "STANDARD_5E",
    preferredAgeGroup: "TEENS_13_PLUS",
  });
  assert.notStrictEqual(
    userA.account.trialRoomCode,
    userB.account.trialRoomCode,
    "Each user account must receive a unique private room code"
  );
  assert.notStrictEqual(userA.account.trialRoomCode, "DRGN");
  assert.notStrictEqual(userB.account.trialRoomCode, "DRGN");

  // Signing back in resolves THAT user's own room session via ensureAccountSessionRoom / loginVttAccount
  const aliceLogin = loginVttAccount({
    email: "alice.family@hearthquest.test",
    password: "PasswordAlice123!",
  });
  assert.strictEqual(aliceLogin.room.roomCode, userA.account.trialRoomCode);
  assert.strictEqual(aliceLogin.room.rulesTier, "STORYBOOK_D6");
  const bobSession = ensureAccountSessionRoom(userB.account);
  assert.strictEqual(bobSession.roomCode, userB.account.trialRoomCode);
  assert.strictEqual(bobSession.rulesTier, "STANDARD_5E");

  // Unauthenticated "/" HTML & HTTP Isolation Verification against live VTT server handler
  const httpCall = (
    urlStr: string,
    opts?: { method?: string; headers?: Record<string, string>; body?: string }
  ): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> =>
    new Promise((resolve, reject) => {
      const u = new URL(urlStr);
      const req = http.request(
        {
          hostname: u.hostname,
          port: Number(u.port),
          path: `${u.pathname}${u.search}`,
          method: opts?.method || "GET",
          headers: { ...(opts?.headers || {}), Connection: "close" },
          agent: false,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          res.on("end", () =>
            resolve({
              status: res.statusCode || 0,
              headers: res.headers,
              body: Buffer.concat(chunks).toString("utf8"),
            })
          );
        }
      );
      req.on("error", reject);
      if (opts?.body) req.write(opts.body);
      req.end();
    });

  await new Promise<void>((resolve, reject) => {
    const runHttpChecks = async (port: number, startedHere: boolean) => {
      try {
        const base = `http://127.0.0.1:${port}`;

        // 1. Unauthenticated GET / must show standalone Login Gate with ZERO game board
        const rootRes = await httpCall(`${base}/`);
        assert.strictEqual(rootRes.status, 200);
        assert.ok(
          rootRes.body.includes("vtt-login-gate") && !rootRes.body.includes("vtt-grid-wrapper"),
          "Unauthenticated root GET / must require login before exposing any tabletop board"
        );

        // 2. Unauthenticated room API call must fail 401
        const unauthMove = await httpCall(`${base}/api/room/move-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode: userA.account.trialRoomCode, deltaX: 1, deltaY: 0 }),
        });
        assert.strictEqual(unauthMove.status, 401, "Unauthenticated room mutation must return 401");

        // 3. Authenticated User A can fetch valid QR SVG for User A's room and move hero in own room
        const qrRes = await httpCall(`${base}/api/room/qr?room=${userA.account.trialRoomCode}`, {
          headers: { Authorization: `Bearer ${userA.token}` },
        });
        assert.strictEqual(qrRes.status, 200);
        const qrSvgHttp = qrRes.body;
        assert.ok(
          qrSvgHttp.includes(`ROOM CODE: ${userA.account.trialRoomCode}`) &&
            qrSvgHttp.includes("mode=kid&amp;invite="),
          "Authenticated /api/room/qr must serve real QR SVG with full origin URL & invite signature"
        );

        // Extract invite signature cleanly and verify Kid Guest invite scoping
        const inviteMatch = qrSvgHttp.match(/invite=([a-f0-9]+)/i);
        assert.ok(inviteMatch && inviteMatch[1], "QR SVG must embed HMAC invite signature");
        const kidJoinRes = await httpCall(
          `${base}/?room=${userA.account.trialRoomCode}&mode=kid&invite=${inviteMatch[1]}`
        );
        assert.strictEqual(kidJoinRes.status, 200);
        const rawSetCookie = kidJoinRes.headers["set-cookie"];
        const setCookieHeader = Array.isArray(rawSetCookie)
          ? rawSetCookie.join("; ")
          : String(rawSetCookie || "");
        const guestMatch = setCookieHeader.match(/hq_vtt_guest=([^;]+)/);
        assert.ok(guestMatch && guestMatch[1], "Valid QR kid invite must mint scoped guest token");
        const guestTok = decodeURIComponent(guestMatch[1]);

        // Kid guest can move hero inside User A's room, but is BLOCKED 403 from GM-only endpoints and User B's room
        const heroA = userA.room.tokens.find((t) => t.type === "HERO");
        const kidMove = await httpCall(`${base}/api/room/move-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-HearthQuest-Guest": guestTok,
          },
          body: JSON.stringify({
            roomCode: userA.account.trialRoomCode,
            tokenId: heroA?.id,
            targetX: 2,
            targetY: 2,
          }),
        });
        assert.strictEqual(kidMove.status, 200);

        const kidGmForbidden = await httpCall(`${base}/api/room/lighting`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-HearthQuest-Guest": guestTok,
          },
          body: JSON.stringify({ roomCode: userA.account.trialRoomCode, ambientLightMode: "MIDNIGHT" }),
        });
        assert.strictEqual(kidGmForbidden.status, 403, "Kid guest must be blocked from GM controls");

        // 4. User B trying to access or mutate User A's room MUST be blocked 403!
        const crossUserBlocked = await httpCall(`${base}/api/room/move-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userB.token}`,
          },
          body: JSON.stringify({
            roomCode: userA.account.trialRoomCode,
            tokenId: heroA?.id,
            targetX: 2,
            targetY: 3,
          }),
        });
        assert.strictEqual(
          crossUserBlocked.status,
          403,
          "User B must NEVER access or mutate User A's isolated session instance"
        );

        // Authenticated GET / renders VTT directly for User A's room without login gate
        const authedRootRes = await httpCall(`${base}/`, {
          headers: { Authorization: `Bearer ${userA.token}` },
        });
        assert.ok(
          authedRootRes.body.includes("vtt-grid-wrapper") &&
            authedRootRes.body.includes(userA.account.trialRoomCode),
          "Authenticated GET / must load only the signed-in user's isolated session"
        );

        if (startedHere) {
          vttServer.closeAllConnections?.();
          vttServer.close(() => resolve());
        } else {
          vttServer.closeAllConnections?.();
          resolve();
        }
      } catch (err) {
        if (startedHere) {
          vttServer.closeAllConnections?.();
          vttServer.close(() => reject(err));
        } else {
          vttServer.closeAllConnections?.();
          reject(err);
        }
      }
    };

    if (vttServer.listening) {
      const addr = vttServer.address() as { port: number };
      runHttpChecks(addr.port, false);
    } else {
      vttServer.listen(0, "127.0.0.1", () => {
        const addr = vttServer.address() as { port: number };
        runHttpChecks(addr.port, true);
      });
    }
  });
  console.log("✅ PASSED");

  // ------------------------------------------------------------------
  // Suite 29: First-Login Admin Account, Admin Console ACL & Google OAuth 2.0 / OIDC
  // ------------------------------------------------------------------
  process.stdout.write("[Test 29/29] First-Login Admin Promotion, Admin Console & Google OAuth 2.0 ... ");

  // 1. Verify earlier first-created account (demoReg) was promoted to ADMIN automatically,
  // while subsequent accounts (userA/userB) defaulted to USER
  const adminListInitial = listVttAccountsForAdmin();
  assert.ok(adminListInitial.length >= 3, "Expected at least 3 accounts registered in VTT DB");
  assert.strictEqual(adminListInitial[0].email, "cedar-demo@hearthquest.local");
  assert.strictEqual(
    adminListInitial[0].role,
    "ADMIN",
    "Very first account registered on the server must automatically be promoted to ADMIN"
  );
  assert.strictEqual(
    adminListInitial[1].role,
    "USER",
    "Subsequent accounts must default to standard USER role"
  );

  // 2. Verify First-Run Login Gate renders Admin setup prompt + Google Sign-In CTA
  const firstSetupHtml = renderVttLoginGateHtml({
    isFirstAccountSetup: true,
    googleConfigured: true,
  });
  assert.ok(
    firstSetupHtml.includes("first-admin-setup-banner") &&
      firstSetupHtml.includes("Continue with Google (Claim Admin)") &&
      firstSetupHtml.includes("btn-google-signin") &&
      firstSetupHtml.includes("gate-reg-password-confirm") &&
      tailoredHtml.includes("reg-password-confirm") &&
      tailoredHtml.includes("session-walkthrough-modal") &&
      tailoredHtml.includes("btn-session-walkthrough") &&
      tailoredHtml.includes("walkthrough-step-0") &&
      tailoredHtml.includes("walkthrough-step-1") &&
      tailoredHtml.includes("walkthrough-step-2") &&
      tailoredHtml.includes("walkthrough-step-3") &&
      tailoredHtml.includes("walkthrough-read-hook") &&
      tailoredHtml.includes("walkthrough-read-scene") &&
      tailoredHtml.includes("speakWalkthroughReadout"),
    "First-run login gate and in-app VTT must display Admin/Google CTA, Re-enter Password fields, and the 4-step Session 1 Walkthrough Modal"
  );
  assert.throws(
    () =>
      registerVttAccount({
        familyName: "Mismatch Test",
        email: "mismatch-pw@hearthquest.local",
        password: "secret-password-1",
        confirmPassword: "secret-password-2",
      }),
    /Passwords do not match/
  );

  // 3. Test isolated fresh DB where the VERY FIRST sign-in comes through Google SSO -> must become ADMIN!
  const prevTestDb = process.env.HEARTHQUEST_TEST_DB_PATH;
  const googleFirstTempDir = fs.mkdtempSync(path.join(rootDir, "data", "google-first-test-"));
  try {
    process.env.HEARTHQUEST_TEST_DB_PATH = path.join(googleFirstTempDir, "google-first.db");
    assert.strictEqual(getVttAccountCount(), 0, "Fresh temp DB must start with 0 accounts");

    const firstGoogleLogin = loginOrRegisterGoogleAccount({
      googleSub: "google_sub_001",
      email: "founder@gmail.com",
      familyName: "Founder GM",
      preferredRulesTier: "STANDARD_5E",
      preferredAgeGroup: "TEENS_13_PLUS",
    });
    assert.strictEqual(firstGoogleLogin.isNewAccount, true);
    assert.strictEqual(firstGoogleLogin.account.role, "ADMIN", "First login via Google SSO must become ADMIN");
    assert.strictEqual(firstGoogleLogin.account.authProvider, "GOOGLE");
    assert.strictEqual(firstGoogleLogin.room.householdId, firstGoogleLogin.account.id);

    const secondGoogleLogin = loginOrRegisterGoogleAccount({
      googleSub: "google_sub_002",
      email: "player2@gmail.com",
      familyName: "Player Two",
    });
    assert.strictEqual(secondGoogleLogin.account.role, "USER", "Second Google account must be USER");
    assert.notStrictEqual(
      secondGoogleLogin.account.trialRoomCode,
      firstGoogleLogin.account.trialRoomCode,
      "Each Google user must get their own private isolated room"
    );
  } finally {
    if (prevTestDb) {
      process.env.HEARTHQUEST_TEST_DB_PATH = prevTestDb;
    } else {
      delete process.env.HEARTHQUEST_TEST_DB_PATH;
    }
    fs.rmSync(googleFirstTempDir, { recursive: true, force: true });
  }

  // 4. Real cryptographic RS256 JWK + PKCE + Google ID Token verification (fail closed on bad claims/sig)
  const { publicKey: gPub, privateKey: gPriv } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwkPub = gPub.export({ format: "jwk" }) as Record<string, any>;
  jwkPub.kid = "test-google-key-1";
  jwkPub.use = "sig";
  jwkPub.alg = "RS256";
  const signMockGoogleJwt = (claims: Record<string, any>): string => {
    const hdr = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "test-google-key-1" })).toString(
      "base64url"
    );
    const pld = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const sig = crypto.sign("RSA-SHA256", Buffer.from(`${hdr}.${pld}`), gPriv).toString("base64url");
    return `${hdr}.${pld}.${sig}`;
  };

  process.env.GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
  try {
    const oauthStart = createGoogleOAuthStartParams({
      requestOrigin: "http://localhost:3000",
      preferredRulesTier: "APPRENTICE_5E_LITE",
      preferredAgeGroup: "AGES_11_13",
    });
    assert.ok(oauthStart.authUrl.includes("accounts.google.com/o/oauth2/v2/auth"));
    assert.ok(oauthStart.authUrl.includes("code_challenge_method=S256"));
    const verifiedTx = verifyGoogleOAuthTransactionCookie(
      oauthStart.cookieToken,
      oauthStart.transaction.state
    );
    assert.strictEqual(verifiedTx.codeVerifier, oauthStart.transaction.codeVerifier);

    const validIdToken = signMockGoogleJwt({
      iss: "https://accounts.google.com",
      aud: process.env.GOOGLE_CLIENT_ID,
      sub: "g_oauth_sub_99",
      email: "oauth-parent@gmail.com",
      email_verified: true,
      name: "OAuth Parent",
      nonce: oauthStart.transaction.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const exchanged = await exchangeGoogleAuthorizationCode({
      code: "mock_auth_code_123",
      codeVerifier: verifiedTx.codeVerifier,
      redirectUri: verifiedTx.redirectUri,
      expectedNonce: verifiedTx.nonce,
      jwksOverride: { keys: [jwkPub] },
      tokenFetcher: async (form) => {
        assert.strictEqual(form.get("code"), "mock_auth_code_123");
        assert.strictEqual(form.get("code_verifier"), verifiedTx.codeVerifier);
        return { id_token: validIdToken };
      },
    });
    assert.strictEqual(exchanged.email, "oauth-parent@gmail.com");
    assert.strictEqual(exchanged.sub, "g_oauth_sub_99");

    // Reject bad audience & tampered JWT
    await assert.rejects(
      () =>
        verifyGoogleIdToken({
          idToken: signMockGoogleJwt({
            iss: "https://accounts.google.com",
            aud: "attacker-client-id",
            sub: "bad",
            email: "bad@gmail.com",
            email_verified: true,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
          jwksOverride: { keys: [jwkPub] },
        }),
      /audience mismatch/i
    );
    const tampered = validIdToken.slice(0, -4) + "AAAA";
    await assert.rejects(
      () => verifyGoogleIdToken({ idToken: tampered, jwksOverride: { keys: [jwkPub] } }),
      /signature/i
    );
  } finally {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  }

  // 5. HTTP checks for Google status, sandbox-login & Admin Console RBAC (/api/vtt-admin/accounts*)
  const adminAccount = listVttAccountsForAdmin()[0];
  const regularUserAccount = listVttAccountsForAdmin()[1];
  const adminLoginHttp = loginVttAccount({
    email: adminAccount.email,
    password: "super-secret-password",
  });
  // Ensure regular user has a known login/token via registration
  const regNormal = registerVttAccount({
    familyName: "NonAdmin Family",
    email: "nonadmin@hearthquest.local",
    password: "password-123",
  });

  await new Promise<void>((resolve, reject) => {
    const reqJson = (url: string, opts: http.RequestOptions & { body?: string } = {}) =>
      new Promise<{ status: number; body: any }>((resResolve, resReject) => {
        const u = new URL(url);
        const r = http.request(
          {
            hostname: u.hostname,
            port: Number(u.port),
            path: u.pathname + u.search,
            method: opts.method || "GET",
            headers: { Connection: "close", ...(opts.headers || {}) },
            agent: false,
          },
          (resp) => {
            let raw = "";
            resp.on("data", (c) => (raw += c));
            resp.on("end", () => {
              try {
                resResolve({ status: resp.statusCode || 0, body: JSON.parse(raw || "{}") });
              } catch {
                resResolve({ status: resp.statusCode || 0, body: raw });
              }
            });
          }
        );
        r.on("error", resReject);
        if (opts.body) r.write(opts.body);
        r.end();
      });

    const run = async (port: number, closeAfter: boolean) => {
      try {
        const base = `http://127.0.0.1:${port}`;
        const statusRes = await reqJson(`${base}/api/auth/google/status`);
        assert.strictEqual(statusRes.status, 200);
        assert.strictEqual(statusRes.body.ok, true);
        assert.ok(String(statusRes.body.redirectUri).endsWith("/api/auth/google/callback"));

        // Confirm password enforcement on POST /api/auth/register
        const regMismatch = await reqJson(`${base}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            familyName: "Confirm Fail",
            email: "confirm-fail@hearthquest.local",
            password: "password-one",
            confirmPassword: "password-two",
          }),
        });
        assert.strictEqual(regMismatch.status, 400, "Mismatched confirmPassword must fail with HTTP 400");
        assert.ok(String(regMismatch.body.error || "").includes("Passwords do not match"));

        const regMatch = await reqJson(`${base}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            familyName: "Confirm Ok",
            email: "confirm-ok@hearthquest.local",
            password: "password-one",
            confirmPassword: "password-one",
          }),
        });
        assert.strictEqual(regMatch.status, 200, "Matching confirmPassword must succeed");

        // Non-admin user blocked 403 from Admin Console API
        const userBlocked = await reqJson(`${base}/api/vtt-admin/accounts`, {
          headers: { Authorization: `Bearer ${regNormal.token}` },
        });
        assert.strictEqual(userBlocked.status, 403, "Non-admin user must be blocked from Admin Console");

        // Admin user succeeds 200 & can promote non-admin user cleanly
        const adminOk = await reqJson(`${base}/api/vtt-admin/accounts`, {
          headers: { Authorization: `Bearer ${adminLoginHttp.token}` },
        });
        assert.strictEqual(adminOk.status, 200);
        assert.ok(Array.isArray(adminOk.body.accounts) && adminOk.body.accounts.length >= 4);

        const promoteRes = await reqJson(`${base}/api/vtt-admin/accounts/role`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminLoginHttp.token}`,
          },
          body: JSON.stringify({ accountId: regularUserAccount.id, role: "ADMIN" }),
        });
        assert.strictEqual(promoteRes.status, 200);
        assert.strictEqual(promoteRes.body.account.role, "ADMIN");

        // Restore demotion cleanly
        const restoreRes = setVttAccountRoleByAdmin({
          targetAccountId: regularUserAccount.id,
          nextRole: "USER",
        });
        assert.strictEqual(restoreRes.role, "USER");

        // Regular USER must be blocked 403 from mutating/switching static maps, campaigns, or one-shots
        for (const restrictedRoute of [
          "/api/room/procedural-map",
          "/api/room/generate-oneshot",
          "/api/room/switch-campaign",
        ]) {
          const blockedMapRes = await reqJson(`${base}${restrictedRoute}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${regNormal.token}`,
            },
            body: JSON.stringify({
              roomCode: regNormal.account.trialRoomCode,
              campaignId: "camp-starlight-otter",
            }),
          });
          assert.strictEqual(
            blockedMapRes.status,
            403,
            `Non-admin user must be blocked 403 from ${restrictedRoute}`
          );
          assert.ok(String(blockedMapRes.body.error || "").includes("Creator/Admin"));
        }

        // Non-admin user blocked 403 from Admin Send Adventure API
        const blockedDispatch = await reqJson(`${base}/api/vtt-admin/send-adventure`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${regNormal.token}`,
          },
          body: JSON.stringify({
            targetRoomCode: regNormal.account.trialRoomCode,
            mode: "ONE_SHOT",
          }),
        });
        assert.strictEqual(blockedDispatch.status, 403, "Non-admin user must be blocked from sending adventures");

        // Admin CAN dispatch a Level-Scaled One-Shot & Campaign cleanly into a regular user's static room
        const adminSendOneShot = await reqJson(`${base}/api/vtt-admin/send-adventure`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminLoginHttp.token}`,
          },
          body: JSON.stringify({
            targetRoomCode: regNormal.account.trialRoomCode,
            mode: "ONE_SHOT",
          }),
        });
        assert.strictEqual(adminSendOneShot.status, 200);
        assert.strictEqual(adminSendOneShot.body.ok, true);
        assert.strictEqual(adminSendOneShot.body.room.roomCode, regNormal.account.trialRoomCode);
        assert.ok(adminSendOneShot.body.loreEntry && adminSendOneShot.body.loreEntry.title);

        const adminSendCampaign = await reqJson(`${base}/api/vtt-admin/send-adventure`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminLoginHttp.token}`,
          },
          body: JSON.stringify({
            targetRoomCode: regNormal.account.trialRoomCode,
            mode: "CAMPAIGN",
            campaignId: "camp-clockwork-treehouse",
          }),
        });
        assert.strictEqual(adminSendCampaign.status, 200);
        assert.strictEqual(adminSendCampaign.body.ok, true);
        assert.strictEqual(adminSendCampaign.body.room.campaignId, "camp-clockwork-treehouse");

        // Regular USER cannot forge or spawn Monster/NPC tokens, ONLY Hero Character tokens
        const blockedMonsterForge = await reqJson(`${base}/api/room/forge-actor`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${regNormal.token}`,
          },
          body: JSON.stringify({
            roomCode: regNormal.account.trialRoomCode,
            actorType: "MONSTER",
            name: "Rogue Dragon",
          }),
        });
        assert.strictEqual(blockedMonsterForge.status, 403, "Non-admin user must be blocked from forging Monsters");

        const blockedNpcSpawn = await reqJson(`${base}/api/room/spawn-custom-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${regNormal.token}`,
          },
          body: JSON.stringify({
            roomCode: regNormal.account.trialRoomCode,
            type: "NPC",
            name: "Unauthorized NPC",
          }),
        });
        assert.strictEqual(blockedNpcSpawn.status, 403, "Non-admin user must be blocked from spawning non-Hero custom tokens");

        // Regular USER CAN customize a character token for their existing hero + switch music track
        const targetHero = adminSendCampaign.body.room.heroes[0];
        const allowedHeroForge = await reqJson(`${base}/api/room/forge-actor`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${regNormal.token}`,
          },
          body: JSON.stringify({
            roomCode: regNormal.account.trialRoomCode,
            actorType: "HERO",
            targetHeroId: targetHero.id,
            name: targetHero.name,
            bezelStyle: "EMERALD_RUNE",
            emblem: "RANGER_HOOD",
          }),
        });
        assert.strictEqual(allowedHeroForge.status, 200);
        assert.ok(allowedHeroForge.body.tokenAssetUrl);

        const userMusicRes = await reqJson(`${base}/api/room/atmosphere`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${regNormal.token}`,
          },
          body: JSON.stringify({
            roomCode: regNormal.account.trialRoomCode,
            ambientSoundscape: "HEROIC_BATTLE",
          }),
        });
        assert.strictEqual(userMusicRes.status, 200);
        assert.strictEqual(userMusicRes.body.room.ambientSoundscape, "HEROIC_BATTLE");

        if (closeAfter) {
          vttServer.closeAllConnections?.();
          vttServer.close(() => resolve());
        } else {
          vttServer.closeAllConnections?.();
          resolve();
        }
      } catch (e) {
        if (closeAfter) {
          vttServer.closeAllConnections?.();
          vttServer.close(() => reject(e));
        } else {
          vttServer.closeAllConnections?.();
          reject(e);
        }
      }
    };

    if (vttServer.listening) {
      run((vttServer.address() as { port: number }).port, false);
    } else {
      vttServer.listen(0, "127.0.0.1", () =>
        run((vttServer.address() as { port: number }).port, true)
      );
    }
  });
  console.log("✅ PASSED");

  // ------------------------------------------------------------------
  // TEST 30: Light/Dark Contrast, Area Maps & Stage Art, 5e Base Monsters & Difficulty Math
  // ------------------------------------------------------------------
  process.stdout.write("[Test 30/30] Light/Dark Contrast, Area Maps & Stage Art, 5e Stat Blocks & Difficulty Math ... ");
  const fsSync = await import("node:fs");
  const pathMod = await import("node:path");
  for (const mapRel of [
    HEARTHQUEST_ASSETS.areaMaps.oakhavenVillage.path,
    HEARTHQUEST_ASSETS.areaMaps.silverleafCanopy.path,
    HEARTHQUEST_ASSETS.areaMaps.starwatchBastion.path,
  ]) {
    const absMap = pathMod.default.join(process.cwd(), mapRel.replace(/^\//, ""));
    assert.ok(fsSync.default.existsSync(absMap), `Missing area map SVG: ${absMap}`);
    const svgRaw = fsSync.default.readFileSync(absMap, "utf8");
    assert.ok(svgRaw.includes("<svg") && svgRaw.includes("</svg>"), `Invalid area map SVG: ${mapRel}`);
  }
  assert.strictEqual(resolveAreaMapAsset("camp-goblin-bakery"), HEARTHQUEST_ASSETS.areaMaps.oakhavenVillage.path);
  assert.strictEqual(resolveAreaMapAsset("camp-clockwork-treehouse"), HEARTHQUEST_ASSETS.areaMaps.silverleafCanopy.path);
  assert.strictEqual(resolveAreaMapAsset("camp-starlight-otter"), HEARTHQUEST_ASSETS.areaMaps.starwatchBastion.path);

  const stageReg = registerVttAccount({
    familyName: "Stage Test Party",
    email: "stagetest@hearthquest.local",
    password: "stagepassword",
    confirmPassword: "stagepassword",
    preferredRulesTier: "STANDARD_5E",
    preferredAgeGroup: "AGES_5_7",
  });
  // Verify upgraded fantasy hero & 5e monster names + full 5e stat block on bosses/minions
  assert.ok(stageReg.room.heroes.some((h) => h.name === "Sir Roland Oakenshield"));
  assert.ok(stageReg.room.heroes.some((h) => h.name === "Lyra Dawnstar"));
  assert.ok(stageReg.room.stageAreaMapUrl && stageReg.room.stageMoodArtUrl);
  const goblinBossTok = stageReg.room.tokens.find((t) => t.name.includes("Goblin Boss"));
  assert.ok(goblinBossTok?.statBlock5e, "5e Monster token must carry full SRD statBlock5e");
  assert.strictEqual(goblinBossTok?.statBlock5e?.creatureName, "Goblin Boss");
  assert.ok(Array.isArray(goblinBossTok?.statBlock5e?.actions) && goblinBossTok!.statBlock5e!.actions.length > 0);

  // Verify difficulty presets actually change enemy HP, AC, Door Lock DC, and player roll success math
  const balancedRoom = updateRoomSettings({ roomCode: stageReg.room.roomCode, difficulty: "BALANCED_NORMAL" });
  const balBoss = balancedRoom.tokens.find((t) => t.name.includes("Goblin Boss"))!;
  const balDoor = (balancedRoom.walls || []).find((w) => w.isDoor && w.isLocked)!;
  const balHero = balancedRoom.heroes[0];
  const balBossHp = balBoss.maxHp;
  const balBossAc = balBoss.statBlock5e?.armorClass ?? 0;
  const balDoorDc = balDoor.lockDc ?? 0;
  const balMaxHp = balHero.attributes5e.maxHp;

  const easyRoom = updateRoomSettings({ roomCode: stageReg.room.roomCode, difficulty: "STORY_EASY" });
  const easyBoss = easyRoom.tokens.find((t) => t.name.includes("Goblin Boss"))!;
  const easyDoor = (easyRoom.walls || []).find((w) => w.isDoor && w.isLocked)!;
  const easyHero = easyRoom.heroes[0];
  const easyBossHp = easyBoss.maxHp;
  const easyBossAc = easyBoss.statBlock5e?.armorClass ?? 99;
  const easyDoorDc = easyDoor.lockDc ?? 99;
  const easyMaxHp = easyHero.attributes5e.maxHp;
  assert.ok(easyBossHp < balBossHp, `STORY_EASY enemy HP (${easyBossHp}) must be lower than Balanced (${balBossHp})`);
  assert.ok(easyBossAc < balBossAc, `STORY_EASY monster AC (${easyBossAc}) must be reduced vs Balanced (${balBossAc})`);
  assert.ok(easyDoorDc < balDoorDc, `STORY_EASY door lock DC (${easyDoorDc}) must be reduced vs Balanced (${balDoorDc})`);
  assert.ok(easyMaxHp > balMaxHp, `STORY_EASY hero maxHp (${easyMaxHp}) must increase vs Balanced (${balMaxHp})`);

  const hardRoom = updateRoomSettings({ roomCode: stageReg.room.roomCode, difficulty: "HEROIC_HARD" });
  const hardBoss = hardRoom.tokens.find((t) => t.name.includes("Goblin Boss"))!;
  const hardBossHp = hardBoss.maxHp;
  assert.ok(hardBossHp > balBossHp, `HEROIC_HARD enemy HP (${hardBossHp}) must exceed Balanced (${balBossHp})`);

  // Verify fixed raw roll succeeds on STORY_EASY while failing on HEROIC_HARD
  updateRoomSettings({ roomCode: stageReg.room.roomCode, difficulty: "STORY_EASY" });
  const easyRoll = submitPlayerActionRoll({
    roomCode: stageReg.room.roomCode,
    characterId: balHero.id,
    cardId: balHero.actionCards[0].id,
    source: "PHYSICAL_DICE_TABLE",
    physicalRollValue: 5,
  });
  assert.strictEqual(easyRoll.roll?.succeeded, true, "Raw 5 on Standard 5e action card (+5 +2 easy vs DC 10) must pass on STORY_EASY");

  updateRoomSettings({ roomCode: stageReg.room.roomCode, difficulty: "HEROIC_HARD" });
  const hardRoll = submitPlayerActionRoll({
    roomCode: stageReg.room.roomCode,
    characterId: balHero.id,
    cardId: balHero.actionCards[0].id,
    source: "PHYSICAL_DICE_TABLE",
    physicalRollValue: 5,
  });
  assert.strictEqual(hardRoll.roll?.succeeded, false, "Same raw 5 (5 + 5 = 10 vs DC 15) must fail on HEROIC_HARD");

  // Verify HTML UI outputs contain Light/Dark CSS overrides, pre-combat stage pictures, 5e stat block UI, and difficulty control
  const vttUi = renderVttAppHtml(easyRoom);
  const gateUi = renderVttLoginGateHtml({ isFirstAccountSetup: false, googleConfigured: false });
  const adminUi = renderAdminHtml({ online: false, host: "localhost", latencyMs: 1, model: "llama3" });
  const storeUi = renderStorefrontHtml();
  assert.ok(
    vttUi.includes('body[data-theme="light"] .text-amber-300') &&
      vttUi.includes("stage-art-showcase") &&
      vttUi.includes("rp-modal-art-strip") &&
      vttUi.includes("walkthrough-art-strip") &&
      vttUi.includes("stage-art-lightbox") &&
      vttUi.includes("select-difficulty") &&
      vttUi.includes("monster-statblock-card") &&
      vttUi.includes("start-here-guide-bar") &&
      vttUi.includes("quickStartStep1ReadIntro") &&
      vttUi.includes("gm-advanced-tools-drawer") &&
      vttUi.includes('id="creator-map-authoring-box" class="hidden') &&
      vttUi.includes("admin-send-target-room") &&
      vttUi.includes("sendAdventureFromAdminModal"),
    "VTT HTML must render Light/Dark contrast CSS, stage art, difficulty selector, 5e statblock card & Start Here guide bar"
  );
  assert.ok(gateUi.includes('body[data-theme="light"]'), "Login gate must include Light mode styling");
  assert.ok(adminUi.includes('body[data-theme="light"] .text-amber-300'), "Admin HTML must include Light contrast CSS");
  assert.ok(storeUi.includes('body[data-theme="dark"] .store-card .text-stone-900'), "Storefront HTML must include Dark contrast CSS");
  console.log("✅ PASSED");

  // ------------------------------------------------------------------
  // TEST 31: Turn Order, DM Lock Switch, Speed Limits, Music Toggle, Zoom & Tile Clarity
  // ------------------------------------------------------------------
  process.stdout.write("[Test 31/31] Turn Order & Speed Limits, DM Switch, Character Tokens, Music & Map Zoom ... ");
  const turnReg = registerVttAccount({
    familyName: "Turn Speed Family",
    email: "turnspeed@hearthquest.local",
    password: "turnpassword",
    confirmPassword: "turnpassword",
    preferredRulesTier: "STANDARD_5E",
    preferredAgeGroup: "AGES_11_13",
  });
  const trCode = turnReg.room.roomCode;
  // Move hero token back to (1,1) cleanly for open movement test
  const tHeroes = turnReg.room.tokens.filter((t) => t.type === "HERO");
  assert.ok(tHeroes.length >= 2, "Starter room needs 2 heroes to test turn switching");
  moveRoomToken({ roomCode: trCode, tokenId: tHeroes[0].id, targetX: 1, targetY: 1, ignoreWalls: true });
  moveRoomToken({ roomCode: trCode, tokenId: tHeroes[1].id, targetX: 1, targetY: 3, ignoreWalls: true });

  // Outside combat, jumping > hero speed (e.g., +8 squares = 40ft > 35ft max) must be blocked cleanly
  const jumpTooFar = attemptMoveRoomToken({
    roomCode: trCode,
    tokenId: tHeroes[0].id,
    targetX: 9,
    targetY: 4,
  });
  assert.strictEqual(jumpTooFar.moved, false, "Move exceeding character speed must be rejected");
  assert.ok(String(jumpTooFar.blockedMessage || "").includes("speed"));

  // Roll Initiative -> verify Turn Lock ON, movementRemainingFt initialized, and inactive token blocked
  const combatStart = updateRoomCombat({ roomCode: trCode, action: "ROLL_INITIATIVE" });
  assert.strictEqual(combatStart.combat?.isActive, true);
  assert.strictEqual(combatStart.combat?.enforceTurnMovement, true);
  const activeEntry = combatStart.combat!.entries[0];
  const inactiveEntry = combatStart.combat!.entries.find((e) => e.tokenId !== activeEntry.tokenId)!;
  assert.ok((activeEntry.speedFt || 0) >= 25 && activeEntry.movementRemainingFt === activeEntry.speedFt);

  // Set deterministic position cleanly in Zone 1 for active token
  moveRoomToken({ roomCode: trCode, tokenId: activeEntry.tokenId, targetX: 1, targetY: 2, ignoreWalls: true });
  const wrongTurnMove = attemptMoveRoomToken({
    roomCode: trCode,
    tokenId: inactiveEntry.tokenId,
    deltaX: 0,
    deltaY: 1,
  });
  assert.strictEqual(wrongTurnMove.moved, false, "Moving out of turn when DM Turn Lock is ON must fail");

  // Advance turn until a HERO is active in Zone 1 (0..3, 0..5) and verify movement consumption + exhaustion
  for (let hop = 0; hop < combatStart.combat!.entries.length; hop++) {
    const cur = getOrCreateRoom(trCode).combat!;
    if (cur.entries[cur.activeTurnIndex].type === "HERO") break;
    updateRoomCombat({ roomCode: trCode, action: "NEXT_TURN" });
  }
  const activeHeroCombat = getOrCreateRoom(trCode).combat!;
  const curHeroEntry = activeHeroCombat.entries[activeHeroCombat.activeTurnIndex];
  moveRoomToken({ roomCode: trCode, tokenId: curHeroEntry.tokenId, targetX: 1, targetY: 2, ignoreWalls: true });
  const stepOne = attemptMoveRoomToken({
    roomCode: trCode,
    tokenId: curHeroEntry.tokenId,
    targetX: 2,
    targetY: 2,
  });
  assert.strictEqual(stepOne.moved, true);
  const remAfterOne = stepOne.room.combat!.entries[stepOne.room.combat!.activeTurnIndex].movementRemainingFt!;
  assert.strictEqual(remAfterOne, (curHeroEntry.speedFt || 30) - 5, "Step of 1 square must deduct 5 ft of movement");

  // Spend remaining movement in 1-square steps, then assert next step fails due to speed cap
  let safety = 12;
  let lastMoveOk = true;
  while (safety-- > 0) {
    const cNow = getOrCreateRoom(trCode);
    const tokNow = cNow.tokens.find((t) => t.id === curHeroEntry.tokenId)!;
    const ny = tokNow.gridY === 2 ? 3 : 2;
    const stepRes = attemptMoveRoomToken({ roomCode: trCode, tokenId: curHeroEntry.tokenId, targetX: tokNow.gridX, targetY: ny });
    if (!stepRes.moved) {
      lastMoveOk = false;
      assert.ok(String(stepRes.blockedMessage || "").includes("Out of movement"));
      break;
    }
  }
  assert.strictEqual(lastMoveOk, false, "Hero must hit turn speed budget ceiling cleanly");

  // DM Turn Lock OFF unlocks movement across turns
  const unlocked = updateRoomCombat({ roomCode: trCode, action: "TOGGLE_TURN_MOVEMENT", enforceTurnMovement: false });
  assert.strictEqual(unlocked.combat?.enforceTurnMovement, false);
  const freeMoveRes = attemptMoveRoomToken({
    roomCode: trCode,
    tokenId: inactiveEntry.tokenId,
    targetX: 2,
    targetY: 3,
  });
  // As long as it isn't bumping a wall/door, free move allows moving out of turn!
  assert.ok(freeMoveRes.moved || freeMoveRes.blockedByWallId, "With DM Free Move ON, turn order must not block movement");

  // Re-lock turn movement cleanly & verify VTT UI renders Zoom, Tile Borders, Music & Combat Controls
  updateRoomCombat({ roomCode: trCode, action: "TOGGLE_TURN_MOVEMENT", enforceTurnMovement: true });
  const finalUi = renderVttAppHtml(getOrCreateRoom(trCode));
  assert.ok(
    finalUi.includes("vtt-board-viewport") &&
      finalUi.includes("vtt-map-zoom-controls") &&
      finalUi.includes("zoomMapBy") &&
      finalUi.includes("vtt-cell-reachable") &&
      finalUi.includes("btn-toggle-turn-lock") &&
      finalUi.includes("btn-music-toggle") &&
      finalUi.includes("header-music-select") &&
      finalUi.includes("forge-target-hero"),
    "VTT HTML must expose map zoom, reachable tile borders, DM turn lock switch, music player, and hero-only token customization"
  );
  console.log("✅ PASSED");

  // ------------------------------------------------------------------
  // TEST 32: Foundry Ground Textures, Map Props (Trees/Furniture/Lights/Camp/Bones), Walls & RBAC
  // ------------------------------------------------------------------
  process.stdout.write("[Test 32/32] Foundry Map Assets (Ground Tiles, Trees, Furniture, Lights, Camp, Bones) ... ");
  // 1. Validate every tile & mapProp SVG asset exists and contains valid XML <svg>...</svg>
  for (const tileAsset of Object.values(HEARTHQUEST_ASSETS.tiles)) {
    const absTile = pathMod.default.join(process.cwd(), tileAsset.path.replace(/^\//, ""));
    assert.ok(fsSync.default.existsSync(absTile), `Missing ground tile SVG: ${absTile}`);
    const svgRaw = fsSync.default.readFileSync(absTile, "utf8");
    assert.ok(svgRaw.includes("<svg") && svgRaw.includes("</svg>"), `Invalid ground tile SVG: ${tileAsset.path}`);
  }
  assert.strictEqual(Object.keys(HEARTHQUEST_ASSETS.tiles).length >= 6, true, "Must include at least 6 ground tile textures");
  assert.strictEqual(Object.keys(HEARTHQUEST_ASSETS.mapProps).length >= 20, true, "Must include comprehensive Foundry prop catalog");

  for (const propAsset of Object.values(HEARTHQUEST_ASSETS.mapProps)) {
    const absProp = pathMod.default.join(process.cwd(), propAsset.path.replace(/^\//, ""));
    assert.ok(fsSync.default.existsSync(absProp), `Missing map prop SVG: ${absProp}`);
    const svgRaw = fsSync.default.readFileSync(absProp, "utf8");
    assert.ok(svgRaw.includes("<svg") && svgRaw.includes("</svg>"), `Invalid map prop SVG: ${propAsset.path}`);
  }
  assert.strictEqual(resolveGroundTileAsset("FOREST_GRASS"), HEARTHQUEST_ASSETS.tiles.forestGrass.path);
  assert.strictEqual(resolveGroundTileAsset("DUNGEON_STONE"), HEARTHQUEST_ASSETS.tiles.dungeonStone.path);
  assert.strictEqual(resolveGroundTileAsset("CAVERN_DIRT"), HEARTHQUEST_ASSETS.tiles.cavernDirt.path);

  // 2. Verify all 3 core campaigns populate rich furnished mapProps across categories
  for (const campId of ["camp-goblin-bakery", "camp-clockwork-treehouse", "camp-starlight-otter"]) {
    const campRoom = switchRoomCampaign({ roomCode: trCode, campaignId: campId });
    assert.ok(Array.isArray(campRoom.mapProps) && campRoom.mapProps.length >= 10, `${campId} must ship furnished mapProps`);
    const cats = new Set(campRoom.mapProps!.map((p) => p.category));
    assert.ok(cats.has("FURNITURE"), `${campId} must include FURNITURE props`);
    assert.ok(cats.has("LIGHT_FIXTURE"), `${campId} must include LIGHT_FIXTURE props`);
    assert.ok(cats.has("BONES"), `${campId} must include BONES / skeleton props`);
    assert.ok(
      campRoom.mapProps!.some((p) => (p.lightRadius || 0) > 0),
      `${campId} must include glowing light fixture props feeding Lighting2DEngine`
    );
  }

  // 3. Verify procedural map & One-Shot generators populate themed mapProps + ground tiles
  const procForest = regenerateRoomProceduralMap({ roomCode: trCode, theme: "FOREST_TREEHOUSE" });
  assert.ok((procForest.mapProps || []).some((p) => p.category === "TREE"), "Forest procedural map must include TREE canopies");
  assert.ok((procForest.mapProps || []).some((p) => p.category === "CAMP"), "Forest procedural map must include CAMP items");
  assert.ok((procForest.mapProps || []).some((p) => p.category === "BRANCH"), "Forest procedural map must include BRANCH logs/boulders");

  // 4. Verify updateRoomMapProps CRUD (stamp/remove/ground-tile) + lighting/UI/static serving + non-admin HTTP 403
  const stamped = updateRoomMapProps({
    roomCode: trCode,
    action: "STAMP",
    propKey: "campCampfireStones",
    gridX: 4,
    gridY: 3,
  });
  assert.ok(stamped.addedProp?.id, "Stamped campfire must return created placement");
  assert.ok(stamped.room.mapProps!.some((p) => p.id === stamped.addedProp!.id));
  const groundUpdated = updateRoomMapProps({
    roomCode: trCode,
    action: "SET_GROUND_TILE",
    groundTileTheme: "DUNGEON_STONE",
  });
  assert.strictEqual(groundUpdated.room.groundTileTheme, "DUNGEON_STONE");

  const propUi = renderVttAppHtml(groundUpdated.room);
  assert.ok(
    propUi.includes("vtt-map-props-layer") &&
      propUi.includes("vtt-map-canopy-layer") &&
      propUi.includes("creator-map-props-studio") &&
      propUi.includes("bg-dungeon-stone") &&
      propUi.includes("propLightSources") &&
      propUi.includes("feature-tour-modal") &&
      propUi.includes("pointToUiSection") &&
      propUi.includes("buildFallbackOpeningPrompt"),
    "VTT UI & Lighting2DEngine must include layered map props, canopy layer, creator stamp studio, prop point lights, and Where-to-Start Feature Tour modal"
  );
  // Regression guard: ensure EVERY inline <script> block in VTT App & Login Gate parses cleanly with 0 JS syntax errors!
  for (const [label, html] of [
    ["VTT App", propUi],
    ["Login Gate", renderVttLoginGateHtml()],
  ] as const) {
    const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
    assert.ok(scriptMatches.length > 0, `${label} must emit inline script blocks`);
    scriptMatches.forEach((m, idx) => {
      if (m[1].trim()) {
        new Function(m[1]);
      }
      assert.ok(idx >= 0);
    });
  }

  await new Promise<void>((resolve, reject) => {
    const httpGetText = (urlStr: string): Promise<{ status: number; contentType: string; text: string }> =>
      new Promise((resP, rejP) => {
        const req = http.request(urlStr, { method: "GET" }, (resp) => {
          let buf = "";
          resp.on("data", (c) => (buf += c));
          resp.on("end", () =>
            resP({
              status: resp.statusCode || 0,
              contentType: String(resp.headers["content-type"] || ""),
              text: buf,
            })
          );
        });
        req.on("error", rejP);
        req.end();
      });
    const httpPostStatus = (urlStr: string, headers: Record<string, string>, payload: unknown): Promise<number> =>
      new Promise((resP, rejP) => {
        const raw = JSON.stringify(payload);
        const req = http.request(
          urlStr,
          { method: "POST", headers: { ...headers, "Content-Length": Buffer.byteLength(raw) } },
          (resp) => {
            resp.resume();
            resp.on("end", () => resP(resp.statusCode || 0));
          }
        );
        req.on("error", rejP);
        req.write(raw);
        req.end();
      });

    const runPropHttp = async (port: number, shouldClose: boolean) => {
      try {
        const assetRes = await httpGetText(`http://127.0.0.1:${port}/assets/map-props/camp-tent.svg`);
        assert.strictEqual(assetRes.status, 200, "Nested /assets/map-props/*.svg must serve with 200 OK");
        assert.ok(assetRes.contentType.includes("image/svg+xml"));

        const nonAdminStatus = await httpPostStatus(
          `http://127.0.0.1:${port}/api/room/map-props`,
          {
            "Content-Type": "application/json",
            Authorization: `Bearer ${turnReg.token}`,
          },
          { roomCode: trCode, action: "STAMP", propKey: "treeOakCanopy", gridX: 2, gridY: 2 }
        );
        assert.strictEqual(nonAdminStatus, 403, "Non-admin player must get 403 on POST /api/room/map-props");
        if (shouldClose) {
          vttServer.closeAllConnections?.();
          vttServer.close(() => resolve());
        } else {
          resolve();
        }
      } catch (e) {
        reject(e);
      }
    };
    if (vttServer.listening) {
      runPropHttp((vttServer.address() as { port: number }).port, false);
    } else {
      vttServer.listen(0, "127.0.0.1", () => runPropHttp((vttServer.address() as { port: number }).port, true));
    }
  });
  console.log("✅ PASSED");

  // ------------------------------------------------------------------
  // TEST 33: Multi-Tier Voice TTS Cascade (Local GPU -> Cloud AI -> Browser Fallback), Cache & RBAC
  // ------------------------------------------------------------------
  process.stdout.write("[Test 33/33] Multi-Tier Voice TTS Cascade (Local GPU -> Cloud AI -> Browser + Cache + RBAC) ... ");
  resetTtsStateForTesting();

  // Case A: Default offline / unconfigured cleanly signals Browser Natural fallback + distinct role profiles
  const defRes = await synthesizeSpeechWithFallback({ text: "Shadows creep across Oakhaven.", speakerRole: "BOSS" });
  assert.strictEqual(defRes.fallbackToBrowser, true);
  assert.strictEqual(defRes.provider, "browser-natural");
  assert.ok(defRes.voiceProfile.browserPitch < 0.9, "BOSS profile must lower pitch cleanly");

  // Case B: Local GPU Neural online -> returns MP3 bytes AND second call hits Disk/Memory Cache
  saveTtsSettings({ preferredMode: "AUTO", localTtsUrl: "http://mock-gpu:8880", cloudProvider: "NONE" });
  let localCallCount = 0;
  const fakeMp3 = Buffer.from("ID3\x03\x00\x00\x00\x00\x00\x21SYNTHETIC_LOCAL_GPU_MP3_PAYLOAD_DATA_OK");
  const mockLocalOkFetch = async (url: string) => {
    localCallCount++;
    assert.ok(url.startsWith("http://mock-gpu:8880/v1/audio/speech"));
    return {
      ok: true,
      status: 200,
      headers: { get: () => "audio/mpeg" },
      arrayBuffer: async () => fakeMp3.buffer.slice(fakeMp3.byteOffset, fakeMp3.byteOffset + fakeMp3.byteLength),
    };
  };
  const gpuRes1 = await synthesizeSpeechWithFallback({
    text: "Dusk settles over the Silverleaf Canopy bridge.",
    speakerRole: "NARRATOR",
    fetchImpl: mockLocalOkFetch,
  });
  assert.strictEqual(gpuRes1.provider, "local-neural");
  assert.strictEqual(gpuRes1.fallbackToBrowser, false);
  assert.strictEqual(gpuRes1.cacheHit, false);
  assert.strictEqual(localCallCount, 1);

  const gpuRes2 = await synthesizeSpeechWithFallback({
    text: "Dusk settles over the Silverleaf Canopy bridge.",
    speakerRole: "NARRATOR",
    fetchImpl: mockLocalOkFetch,
  });
  assert.strictEqual(gpuRes2.provider, "disk-cache");
  assert.strictEqual(gpuRes2.cacheHit, true);
  assert.strictEqual(localCallCount, 1, "Repeat narration must serve straight from cache without hitting server again");

  // Case C: Local GPU DOWN -> automatically falls back to OpenAI Cloud TTS without throwing
  clearTtsAudioCache();
  saveTtsSettings({
    preferredMode: "AUTO",
    localTtsUrl: "http://dead-gpu:8880",
    cloudProvider: "OPENAI",
    cloudApiKey: "sk-test-secret-key-9876",
    cloudModel: "gpt-4o-mini-tts",
  });
  const pubCfg = getPublicTtsConfig();
  assert.strictEqual(pubCfg.cloudConfigured, true);
  assert.strictEqual(pubCfg.cloudKeyMasked, "sk-t...9876", "Cloud API key must be masked in public config");
  assert.ok(!(JSON.stringify(pubCfg)).includes("sk-test-secret-key-9876"), "Raw API key must NEVER leak in public config");

  const cloudMp3 = Buffer.from("ID3\x03\x00\x00\x00\x00\x00\x21SYNTHETIC_CLOUD_OPENAI_MP3_PAYLOAD_DATA");
  const mockLocalDownCloudUp = async (url: string) => {
    if (url.includes("dead-gpu")) throw new Error("connect ECONNREFUSED");
    assert.ok(url.includes("api.openai.com/v1/audio/speech"));
    return {
      ok: true,
      status: 200,
      headers: { get: () => "audio/mpeg" },
      arrayBuffer: async () => cloudMp3.buffer.slice(cloudMp3.byteOffset, cloudMp3.byteOffset + cloudMp3.byteLength),
    };
  };
  const fallbackCloudRes = await synthesizeSpeechWithFallback({
    text: "Who goes there beneath the elder boughs?",
    speakerRole: "NPC",
    fetchImpl: mockLocalDownCloudUp,
  });
  assert.strictEqual(fallbackCloudRes.provider, "cloud-openai");
  assert.deepStrictEqual(fallbackCloudRes.attemptedProviders, ["local-neural", "cloud-openai"]);
  assert.strictEqual(fallbackCloudRes.fallbackToBrowser, false);

  // Case D: BOTH Local GPU DOWN & Cloud DOWN (ElevenLabs 503) -> smoothly falls back to Browser Natural!
  saveTtsSettings({
    preferredMode: "AUTO",
    localTtsUrl: "http://dead-gpu:8880",
    cloudProvider: "ELEVENLABS",
    cloudApiKey: "xi-test-key-4321",
  });
  const mockAllDown = async () => ({
    ok: false,
    status: 503,
    headers: { get: () => "application/json" },
    arrayBuffer: async () => new ArrayBuffer(0),
  });
  const allDownRes = await synthesizeSpeechWithFallback({
    text: "Brace yourselves, heroes—the eclipse is upon us!",
    speakerRole: "BOSS",
    fetchImpl: mockAllDown,
  });
  assert.strictEqual(allDownRes.provider, "browser-natural");
  assert.strictEqual(allDownRes.fallbackToBrowser, true);
  assert.deepStrictEqual(allDownRes.attemptedProviders, ["local-neural", "cloud-elevenlabs", "browser-natural"]);

  const deadHealth = await probeLocalTtsHealth("http://dead-gpu:8880", async () => {
    throw new Error("timeout");
  });
  assert.strictEqual(deadHealth.online, false);

  // UI & HTTP RBAC check for /api/tts/status, /api/tts/speak, and /api/vtt-admin/tts-settings
  resetTtsStateForTesting();
  const ttsUi = renderVttAppHtml(getOrCreateRoom(trCode));
  assert.ok(
    ttsUi.includes("select-tts-mode") &&
      ttsUi.includes("select-browser-tts-voice") &&
      ttsUi.includes("speakBrowserSentenceChunked") &&
      ttsUi.includes("admin-tts-settings-box"),
    "VTT UI must render multi-tier TTS controls, browser voice selector, and admin TTS settings panel"
  );
  // Syntax-verify upgraded VTT client script after TTS engine changes
  const ttsScripts = [...ttsUi.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
  ttsScripts.forEach((m) => {
    if (m[1].trim()) new Function(m[1]);
  });

  await new Promise<void>((resolve, reject) => {
    const httpReq = (urlStr: string, method: string, headers: Record<string, string>, payload?: unknown) =>
      new Promise<{ status: number; bodyText: string; headers: http.IncomingHttpHeaders }>((resP, rejP) => {
        const raw = payload ? JSON.stringify(payload) : undefined;
        const req = http.request(
          urlStr,
          {
            method,
            headers: {
              ...headers,
              ...(raw ? { "Content-Length": String(Buffer.byteLength(raw)) } : {}),
            },
          },
          (resp) => {
            let txt = "";
            resp.on("data", (c) => (txt += c));
            resp.on("end", () => resP({ status: resp.statusCode || 0, bodyText: txt, headers: resp.headers }));
          }
        );
        req.on("error", rejP);
        if (raw) req.write(raw);
        req.end();
      });

    const runTtsHttp = async (port: number, shouldClose: boolean) => {
      try {
        const st = await httpReq(`http://127.0.0.1:${port}/api/tts/status`, "GET", {});
        assert.strictEqual(st.status, 200);
        const stJson = JSON.parse(st.bodyText);
        assert.strictEqual(stJson.ok, true);
        assert.ok(Array.isArray(stJson.config.fallbackChain));

        const unauthSpeak = await httpReq(
          `http://127.0.0.1:${port}/api/tts/speak`,
          "POST",
          { "Content-Type": "application/json" },
          { text: "Hello world" }
        );
        assert.strictEqual(unauthSpeak.status, 401);

        const userSpeak = await httpReq(
          `http://127.0.0.1:${port}/api/tts/speak`,
          "POST",
          { "Content-Type": "application/json", Authorization: `Bearer ${turnReg.token}` },
          { text: "A warm lantern flickers by the oak bar.", speakerRole: "NARRATOR" }
        );
        assert.strictEqual(userSpeak.status, 200);
        const userSpeakJson = JSON.parse(userSpeak.bodyText);
        assert.strictEqual(userSpeakJson.fallbackToBrowser, true);
        assert.strictEqual(userSpeakJson.provider, "browser-natural");

        const nonAdminGet = await httpReq(`http://127.0.0.1:${port}/api/vtt-admin/tts-settings`, "GET", {
          Authorization: `Bearer ${turnReg.token}`,
        });
        assert.strictEqual(nonAdminGet.status, 403, "Non-admin user must receive 403 on GET /api/vtt-admin/tts-settings");

        setVttAccountRoleByAdmin({ targetAccountId: turnReg.account.id, nextRole: "ADMIN" });
        const adminPost = await httpReq(
          `http://127.0.0.1:${port}/api/vtt-admin/tts-settings`,
          "POST",
          { "Content-Type": "application/json", Authorization: `Bearer ${turnReg.token}` },
          { preferredMode: "AUTO", narratorSpeed: 1.05 }
        );
        setVttAccountRoleByAdmin({ targetAccountId: turnReg.account.id, nextRole: "USER" });
        assert.strictEqual(adminPost.status, 200, "Admin must save TTS settings cleanly");
        assert.strictEqual(JSON.parse(adminPost.bodyText).config.narratorSpeed, 1.05);

        if (shouldClose) {
          vttServer.closeAllConnections?.();
          vttServer.close(() => resolve());
        } else {
          resolve();
        }
      } catch (e) {
        reject(e);
      }
    };
    if (vttServer.listening) {
      runTtsHttp((vttServer.address() as { port: number }).port, false);
    } else {
      vttServer.listen(0, "127.0.0.1", () => runTtsHttp((vttServer.address() as { port: number }).port, true));
    }
  });
  resetTtsStateForTesting();
  console.log("✅ PASSED");

  console.log("\n==========================================================");
  console.log("   VERIFICATION SUMMARY: 33/33 SUITES PASSED (100% CLEAN) ");
  console.log("==========================================================");
  if (vttServer.listening) {
    vttServer.closeAllConnections?.();
    await new Promise<void>((r) => vttServer.close(() => r()));
  }
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("❌ VERIFICATION FAILED:", err);
  process.exit(1);
});
