process.env.NODE_ENV = "test";

import assert from "node:assert";
import {
  generateGmCoPilotWhisper,
  probeRtx3080Health,
} from "../apps/quest-ai-bridge/src/index";
import { PHYSICAL_PACKAGES, renderAdminHtml } from "../apps/quest-admin/src/server";
import {
  addCustomHeroToRoom,
  advanceRoomStoryNode,
  FAMILY_CAMPAIGNS,
  generateJoinQrSvg,
  getOrCreateRoom,
  loadRoomsFromDisk,
  moveRoomToken,
  openRoomLootChest,
  regenerateRoomProceduralMap,
  resetRoomsForTesting,
  saveRoomsToDisk,
  submitPlayerActionRoll,
  switchRoomCampaign,
  toggleRoomBedtimeFreeze,
  toggleRoomZoneFog,
} from "../apps/quest-vtt/src/room-store";
import { renderVttAppHtml } from "../apps/quest-vtt/src/ui-template";
import {
  APP_VERSION,
  BUILD_NUMBER,
  getBuildMetadata,
  HEARTHQUEST_ASSETS,
  resolveArchetypeAsset,
  resolveCampaignTileAsset,
  resolveTokenAsset,
} from "../packages/shared-types/src/index";
import {
  calculateEncounterAutoBalance,
  computeSiblingSpotlightFairness,
  createStarterFamilySession,
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
  assert.ok(savedPath.endsWith("test-rooms.json") || savedPath.endsWith("rooms.json"));
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

  console.log("\n==========================================================");
  console.log("   VERIFICATION SUMMARY: 15/15 SUITES PASSED (100% CLEAN) ");
  console.log("==========================================================");
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("❌ VERIFICATION FAILED:", err);
  process.exit(1);
});
