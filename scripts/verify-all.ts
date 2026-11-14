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

  console.log("\n==========================================================");
  console.log("   VERIFICATION SUMMARY: 11/11 SUITES PASSED (100% CLEAN) ");
  console.log("==========================================================");
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("❌ VERIFICATION FAILED:", err);
  process.exit(1);
});
