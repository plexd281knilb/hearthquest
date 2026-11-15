/**
 * @hearthquest/shared-types
 * Core data models for Multi-Tenant Households, Jackbox-Style Room Sessions,
 * 3-Screen Display Ecosystem, Tiered Rulesets, Hybrid Physical/Digital Dice,
 * Sibling Spotlight Fairness, Bedtime Snapshots, and Print-on-Demand Kits.
 */

export * from "./version";
export * from "./assets";

export type RulesTier = "STORYBOOK_D6" | "APPRENTICE_5E_LITE" | "STANDARD_5E";

export type ContentRating = "COZY_G" | "ADVENTURE_PG" | "CLASSIC_PG13";

export type DisplayMode = "GM_COMMAND" | "TABLE_TV_DISPLAY" | "PLAYER_CONTROLLER";

export type ThemeMode = "DARK_MIDNIGHT" | "LIGHT_PARCHMENT";

export type AmbientLightingMode = "BRIGHT_DAYLIGHT" | "COZY_TWILIGHT" | "TORCHLIT_DUNGEON";

export type AmbientWeatherType = "NONE" | "HEARTH_EMBERS" | "FOREST_FIREFLIES" | "STARLIGHT_DUST";

export interface SpellTemplate {
  id: string;
  shape: "CIRCLE" | "CONE" | "LINE";
  label: string;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  radiusSquares: number;
  color: string;
  casterName?: string;
}

export interface WallSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isDoor?: boolean;
  isOpen?: boolean;
  blocksVision: boolean;
  zoneId?: string;
}

export type DiceInputMode = "HYBRID_PHYSICAL_PROMPT" | "DIGITAL_3D";

export type DieType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20";

export interface FamilyHousehold {
  id: string;
  familyName: string;
  subscriptionTier: "FREE_SELF_HOSTED" | "DIGITAL_PLUS" | "GAME_IN_A_BOX_PRO";
  defaultRulesTier: RulesTier;
  defaultContentRating: ContentRating;
  createdAt: string;
}

export interface ActionCard {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  colorTheme: "amber" | "emerald" | "sky" | "purple" | "rose";
  dieToRoll: DieType;
  bonusByTier: {
    STORYBOOK_D6: number;
    APPRENTICE_5E_LITE: number;
    STANDARD_5E: number;
  };
  targetDifficultyByTier: {
    STORYBOOK_D6: number;
    APPRENTICE_5E_LITE: number;
    STANDARD_5E: number;
  };
  description: string;
  cozySuccessFlavor: string;
  cozyFailForwardFlavor: string;
}

export interface CharacterSheet {
  id: string;
  name: string;
  playerName: string;
  playerAge: number;
  archetype: string;
  companionPet: string;
  avatarEmoji: string;
  tokenColor: string;
  rulesTier: RulesTier;
  // Storybook stats (Ages 5-8)
  storybookStats: {
    brawn: number;
    brains: number;
    charm: number;
    hearts: number;
    maxHearts: number;
  };
  // 5e / Apprentice stats (Ages 8+)
  attributes5e: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
    hp: number;
    maxHp: number;
    armorClass: number;
  };
  actionCards: ActionCard[];
  inventory: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
  }>;
  levelStars?: number;
  bioStory?: string;
  petTrait?: string;
  assetPath?: string;
}

export interface MapToken {
  id: string;
  characterId?: string;
  name: string;
  type: "HERO" | "NPC" | "MONSTER" | "PROP";
  avatarEmoji: string;
  assetPath?: string;
  color: string;
  gridX: number;
  gridY: number;
  hp: number;
  maxHp: number;
  isHiddenFromPlayers: boolean;
  statusCondition?: string;
  statusBadge?: "INSPIRATION_STAR" | "BONKED_DIZZY" | "SHIELD_GUARD" | "HEROIC_RALLY" | "NONE";
  isLootChest?: boolean;
  isChestOpened?: boolean;
  lootRewardName?: string;
  lightRadius?: number;
  lightColor?: string;
}

export interface MapRoomZone {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  width: number;
  height: number;
  isRevealed: boolean;
  hasSecretTrap?: boolean;
  trapDescription?: string;
  ambientSoundscape: "COZY_TAVERN" | "WHISPERING_WOODS" | "GOBLIN_KITCHEN" | "CRYSTAL_CAVERN";
}

export interface StoryBranchChoice {
  id: string;
  label: string;
  targetNodeId: string;
  requiredCheck?: string;
  consequenceTag: string;
}

export interface StoryBranchNode {
  id: string;
  title: string;
  sceneZoneId: string;
  readAloudByTone: {
    COZY_SILLY: string;
    ACTION_HEROIC: string;
    MYSTERY_ATMOSPHERIC: string;
  };
  readAloudByRating?: {
    COZY_G: string;
    ADVENTURE_PG: string;
    CLASSIC_PG13: string;
  };
  gmWhisperTips: string[];
  choices: StoryBranchChoice[];
}

export interface FamilyCampaignTemplate {
  id: string;
  title: string;
  theme: "BAKERY" | "FOREST_TREEHOUSE" | "STARLIGHT_SHIP";
  description: string;
  defaultRulesTier: RulesTier;
  defaultContentRating: ContentRating;
  initialActiveNodeId: string;
  zones: MapRoomZone[];
  tokens: MapToken[];
  storyNodes: StoryBranchNode[];
  ambientLightMode?: AmbientLightingMode;
  walls?: WallSegment[];
}

export interface PlayerSpotlightRecord {
  characterId: string;
  playerName: string;
  characterName: string;
  turnsTaken: number;
  lastActionAt: string;
  needsSpotlightNudge: boolean;
  suggestedSpotlightHook?: string;
}

export interface BedtimeFreezeSnapshot {
  frozenAt: string;
  roomCode: string;
  campaignTitle: string;
  activeNodeId: string;
  tokens: MapToken[];
  revealedZoneIds: string[];
  storyFlags: string[];
  previouslyOnRecap: string;
}

export interface DiceRollResult {
  id: string;
  characterId: string;
  playerName: string;
  characterName: string;
  actionTitle: string;
  dieType: DieType;
  source: "PHYSICAL_DICE_TABLE" | "DIGITAL_3D_ROLLER";
  rawRoll: number;
  modifier: number;
  total: number;
  targetDC: number;
  succeeded: boolean;
  isCriticalSuccess: boolean;
  narrativeOutcome: string;
  timestamp: string;
}

export interface AiCoPilotWhisper {
  id: string;
  sourceEngine: "RTX_3080_LOCAL_OLLAMA" | "GEMINI_CLOUD_FAILOVER" | "DETERMINISTIC_HEURISTIC";
  latencyMs: number;
  contentRating: ContentRating;
  readAloudOptions: {
    cozySilly: string;
    actionHeroic: string;
    mysteryAtmospheric: string;
  };
  ruleGuidance: string;
  failForwardIdea: string;
  spotlightSuggestion?: string;
}

export interface PrintFulfillmentPackage {
  id: string;
  campaignId: string;
  title: string;
  includedMapsCount: number;
  includedStandeesCount: number;
  includedActionCardsCount: number;
  includesDryEraseGrid: boolean;
  includesPhysicalDiceSet: boolean;
  includesHardcoverKeepsake: boolean;
  priceUsd: number;
  unpluggedCampingFlowchartIncluded: boolean;
}

export interface RoomSessionState {
  roomCode: string;
  householdId: string;
  campaignId: string;
  campaignTitle: string;
  rulesTier: RulesTier;
  contentRating: ContentRating;
  diceInputMode: DiceInputMode;
  isPausedForBedtime: boolean;
  bedtimeSnapshot?: BedtimeFreezeSnapshot;
  activeNodeId: string;
  gridCols: number;
  gridRows: number;
  zones: MapRoomZone[];
  tokens: MapToken[];
  heroes: CharacterSheet[];
  storyNodes: StoryBranchNode[];
  storyFlags: string[];
  rollHistory: DiceRollResult[];
  spotlightRecords: PlayerSpotlightRecord[];
  ambientLightMode?: AmbientLightingMode;
  walls?: WallSegment[];
  ambientWeather?: AmbientWeatherType;
  spellTemplates?: SpellTemplate[];
}
