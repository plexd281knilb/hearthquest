process.env.NODE_ENV = "test";

import assert from "node:assert";
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
  updateRoomAtmosphere,
  updateRoomCombat,
  updateRoomLighting,
  updateRoomToolsAndWeather,
} from "../apps/quest-vtt/src/room-store";
import { renderVttAppHtml } from "../apps/quest-vtt/src/ui-template";
import {
  APP_VERSION,
  BUILD_NUMBER,
  getBuildMetadata,
  HEARTHQUEST_ASSETS,
  resolveArchetypeAsset,
  resolveCampaignTileAsset,
  resolveSceneBackdropAsset,
  resolveTokenAsset,
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

  assert.strictEqual(HEARTHQUEST_SKILLS.length, 10, "Expected 10 core skills in HEARTHQUEST_SKILLS");
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
  assert.strictEqual(skillsForHero.length, 10);
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

  console.log("\n==========================================================");
  console.log("   VERIFICATION SUMMARY: 23/23 SUITES PASSED (100% CLEAN) ");
  console.log("==========================================================");
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("❌ VERIFICATION FAILED:", err);
  process.exit(1);
});
