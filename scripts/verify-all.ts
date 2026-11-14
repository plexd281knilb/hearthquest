import assert from "node:assert";
import {
  generateGmCoPilotWhisper,
  probeRtx3080Health,
} from "../apps/quest-ai-bridge/src/index";
import { PHYSICAL_PACKAGES } from "../apps/quest-admin/src/server";
import {
  addCustomHeroToRoom,
  advanceRoomStoryNode,
  getOrCreateRoom,
  moveRoomToken,
  submitPlayerActionRoll,
  toggleRoomBedtimeFreeze,
  toggleRoomZoneFog,
} from "../apps/quest-vtt/src/room-store";
import {
  calculateEncounterAutoBalance,
  computeSiblingSpotlightFairness,
  createStarterFamilySession,
  enforceAgeTieredGuardrails,
  evaluateActionCardRoll,
  SRD_51_CC_BY_40_ATTRIBUTION,
} from "../packages/srd-rules/src/index";

async function runVerification() {
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

  console.log("\n==========================================================");
  console.log("   VERIFICATION SUMMARY: 8/8 SUITES PASSED (100% CLEAN)   ");
  console.log("==========================================================");
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("❌ VERIFICATION FAILED:", err);
  process.exit(1);
});
