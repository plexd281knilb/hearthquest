/**
 * HearthQuest Foundry-Grade Asset Catalog
 * Centralized registry of vector SVG token standees, tactical terrain tiles, and props.
 */

export interface HearthQuestAsset {
  id: string;
  name: string;
  category: "hero" | "monster" | "prop" | "tile" | "background" | "trap" | "icon";
  path: string;
  tags: string[];
}

export const HEARTHQUEST_ASSETS = {
  icons: {
    appSvg: "/assets/hearthquest-icon.svg",
    appPng: "/assets/hearthquest-icon.png",
  },
  heroes: {
    shieldKnight: {
      id: "hero-knight-shield",
      name: "Shield Knight",
      path: "/assets/tokens/heroes/knight-shield.svg",
      archetypeMatch: ["shield knight", "knight", "paladin", "fighter", "terrier"],
    },
    starlightWizard: {
      id: "hero-wizard-starlight",
      name: "Starlight Wizard",
      path: "/assets/tokens/heroes/wizard-starlight.svg",
      archetypeMatch: ["starlight wizard", "wizard", "mage", "sorcerer", "owl"],
    },
    forestRanger: {
      id: "hero-ranger-forest",
      name: "Forest Ranger",
      path: "/assets/tokens/heroes/ranger-forest.svg",
      archetypeMatch: ["forest ranger", "ranger", "archer", "scout", "chipmunk"],
    },
    ninjaRogue: {
      id: "hero-rogue-ninja",
      name: "Sneaky Rogue",
      path: "/assets/tokens/heroes/rogue-ninja.svg",
      archetypeMatch: ["sneaky rogue", "ninja", "rogue", "thief", "fox"],
    },
    melodyBard: {
      id: "hero-bard-melody",
      name: "Melody Bard",
      path: "/assets/tokens/heroes/bard-melody.svg",
      archetypeMatch: ["melody bard", "bard", "musician", "singer", "rabbit"],
    },
    wildDruid: {
      id: "hero-druid-bear",
      name: "Wild Druid",
      path: "/assets/tokens/heroes/druid-bear.svg",
      archetypeMatch: ["wild druid", "druid", "shifter", "nature", "bear"],
    },
  },
  monsters: {
    goblinSprinkles: {
      id: "mon-goblin-sprinkles",
      name: "Sprinkles the Goblin Guard",
      path: "/assets/tokens/monsters/goblin-sprinkles.svg",
    },
    chefSnickerdoodle: {
      id: "mon-chef-snickerdoodle",
      name: "Chef Snickerdoodle",
      path: "/assets/tokens/monsters/chef-snickerdoodle.svg",
    },
    brassSquirrel: {
      id: "mon-brass-squirrel",
      name: "Cogsworth Clockwork Squirrel",
      path: "/assets/tokens/monsters/brass-squirrel.svg",
    },
    dragonPuppy: {
      id: "mon-dragon-puppy",
      name: "Marshmallow the Baby Dragon Puppy",
      path: "/assets/tokens/monsters/dragon-puppy.svg",
    },
    nebulaJelly: {
      id: "mon-nebula-jelly",
      name: "Queen Lumina Starlight Jelly",
      path: "/assets/tokens/monsters/nebula-jelly.svg",
    },
  },
  props: {
    chestClosed: {
      id: "prop-chest-closed",
      name: "Treasure Chest (Locked)",
      path: "/assets/tokens/props/chest-closed.svg",
    },
    chestOpen: {
      id: "prop-chest-open",
      name: "Treasure Chest (Open)",
      path: "/assets/tokens/props/chest-open.svg",
    },
    torchWall: {
      id: "prop-torch-wall",
      name: "Flickering Wall Torch",
      path: "/assets/tokens/props/torch-wall.svg",
    },
    campfireHearth: {
      id: "prop-campfire-hearth",
      name: "Cozy Hearth Campfire",
      path: "/assets/tokens/props/campfire-hearth.svg",
    },
  },
  tiles: {
    bakeryFloor: {
      id: "tile-bakery-floor",
      name: "Goblin Bakery Cobblestone",
      path: "/assets/tiles/tile-bakery-floor.svg",
    },
    treehouseWood: {
      id: "tile-treehouse-wood",
      name: "Clockwork Treehouse Planks",
      path: "/assets/tiles/tile-treehouse-wood.svg",
    },
    starlightDeck: {
      id: "tile-starlight-deck",
      name: "Starlight Otter Celestial Deck",
      path: "/assets/tiles/tile-starlight-deck.svg",
    },
    forestGrass: {
      id: "tile-forest-grass",
      name: "Emerald Forest Glade Turf",
      path: "/assets/tiles/tile-forest-grass.svg",
    },
    dungeonStone: {
      id: "tile-dungeon-stone",
      name: "Weathered Crypt Ashlar Flagstone",
      path: "/assets/tiles/tile-dungeon-stone.svg",
    },
    cavernDirt: {
      id: "tile-cavern-dirt",
      name: "Packed Cavern Earth & Gravel",
      path: "/assets/tiles/tile-cavern-dirt.svg",
    },
  },
  mapProps: {
    treeOakCanopy: {
      id: "prop-tree-oak-canopy",
      name: "Ancient Oak Canopy",
      category: "TREE" as const,
      zLayer: "CANOPY" as const,
      defaultWidthSq: 2,
      defaultHeightSq: 2,
      path: "/assets/map-props/tree-oak-canopy.svg",
    },
    treePineCluster: {
      id: "prop-tree-pine-cluster",
      name: "Evergreen Pine Tree",
      category: "TREE" as const,
      zLayer: "CANOPY" as const,
      defaultWidthSq: 2,
      defaultHeightSq: 2,
      path: "/assets/map-props/tree-pine-cluster.svg",
    },
    treeStumpMossy: {
      id: "prop-tree-stump-mossy",
      name: "Mossy Tree Stump",
      category: "TREE" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 1,
      defaultHeightSq: 1,
      path: "/assets/map-props/tree-stump-mossy.svg",
    },
    branchFallenLog: {
      id: "prop-branch-fallen-log",
      name: "Fallen Mossy Log & Branches",
      category: "BRANCH" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 1.5,
      defaultHeightSq: 1,
      path: "/assets/map-props/branch-fallen-log.svg",
    },
    boulderMossy: {
      id: "prop-boulder-mossy",
      name: "Craggy Mossy Boulder",
      category: "BRANCH" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 1.2,
      defaultHeightSq: 1.2,
      path: "/assets/map-props/boulder-mossy.svg",
    },
    bushBerryThicket: {
      id: "prop-bush-berry-thicket",
      name: "Wild Berry Bush Thicket",
      category: "TREE" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 1.2,
      defaultHeightSq: 1.2,
      path: "/assets/map-props/bush-berry-thicket.svg",
    },
    furnitureOakTable: {
      id: "prop-furniture-oak-table",
      name: "Long Oak Banquet Table",
      category: "FURNITURE" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 1.6,
      defaultHeightSq: 1.1,
      path: "/assets/map-props/furniture-oak-table.svg",
    },
    furnitureChair: {
      id: "prop-furniture-chair",
      name: "Oak Tavern Chair",
      category: "FURNITURE" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 0.8,
      defaultHeightSq: 0.8,
      path: "/assets/map-props/furniture-chair.svg",
    },
    furnitureBookshelf: {
      id: "prop-furniture-bookshelf",
      name: "Scholarly Oak Bookshelf",
      category: "FURNITURE" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 1.4,
      defaultHeightSq: 0.9,
      path: "/assets/map-props/furniture-bookshelf.svg",
    },
    furnitureBedrollCot: {
      id: "prop-furniture-bedroll-cot",
      name: "Cozy Travel Cot & Quilt",
      category: "FURNITURE" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 1.4,
      defaultHeightSq: 0.9,
      path: "/assets/map-props/furniture-bedroll-cot.svg",
    },
    furnitureBarrelCrates: {
      id: "prop-furniture-barrel-crates",
      name: "Barrels & Supply Crates",
      category: "FURNITURE" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 1.1,
      defaultHeightSq: 1.1,
      path: "/assets/map-props/furniture-barrel-crates.svg",
    },
    furnitureBakerOven: {
      id: "prop-furniture-baker-oven",
      name: "Brick Hearth Bakery Oven",
      category: "FURNITURE" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 1.5,
      defaultHeightSq: 1.3,
      lightRadius: 3.0,
      lightColor: "#fb923c",
      path: "/assets/map-props/furniture-baker-oven.svg",
    },
    lightStandingBrazier: {
      id: "prop-light-standing-brazier",
      name: "Glowing Iron Fire Brazier",
      category: "LIGHT_FIXTURE" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 0.95,
      defaultHeightSq: 0.95,
      lightRadius: 3.4,
      lightColor: "#f59e0b",
      path: "/assets/map-props/light-standing-brazier.svg",
    },
    lightWallSconce: {
      id: "prop-light-wall-sconce",
      name: "Flickering Wall Torch Sconce",
      category: "LIGHT_FIXTURE" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 0.85,
      defaultHeightSq: 0.85,
      lightRadius: 2.9,
      lightColor: "#fbbf24",
      path: "/assets/map-props/light-wall-sconce.svg",
    },
    lightChandelier: {
      id: "prop-light-chandelier",
      name: "Iron Wheel Chandelier",
      category: "LIGHT_FIXTURE" as const,
      zLayer: "CANOPY" as const,
      defaultWidthSq: 1.4,
      defaultHeightSq: 1.4,
      lightRadius: 4.0,
      lightColor: "#fde68a",
      path: "/assets/map-props/light-chandelier.svg",
    },
    lightLanternPost: {
      id: "prop-light-lantern-post",
      name: "Brass Amber Street Lantern",
      category: "LIGHT_FIXTURE" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 0.85,
      defaultHeightSq: 0.85,
      lightRadius: 2.8,
      lightColor: "#fcd34d",
      path: "/assets/map-props/light-lantern-post.svg",
    },
    campTent: {
      id: "prop-camp-tent",
      name: "Pitched Explorer Canvas Tent",
      category: "CAMP" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 1.7,
      defaultHeightSq: 1.5,
      path: "/assets/map-props/camp-tent.svg",
    },
    campCampfireStones: {
      id: "prop-camp-campfire-stones",
      name: "Stone Ring Campfire",
      category: "CAMP" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 1.1,
      defaultHeightSq: 1.1,
      lightRadius: 3.5,
      lightColor: "#fb923c",
      path: "/assets/map-props/camp-campfire-stones.svg",
    },
    campCauldronPot: {
      id: "prop-camp-cauldron-pot",
      name: "Simmering Campfire Cauldron",
      category: "CAMP" as const,
      zLayer: "OBJECT" as const,
      defaultWidthSq: 1.0,
      defaultHeightSq: 1.0,
      lightRadius: 2.4,
      lightColor: "#fdba74",
      path: "/assets/map-props/camp-cauldron-pot.svg",
    },
    campBackpackSupplies: {
      id: "prop-camp-backpack-supplies",
      name: "Adventurer Pack, Rope & Map",
      category: "CAMP" as const,
      zLayer: "FLOOR" as const,
      defaultWidthSq: 0.9,
      defaultHeightSq: 0.9,
      path: "/assets/map-props/camp-backpack-supplies.svg",
    },
    bonesPileSkulls: {
      id: "prop-bones-pile-skulls",
      name: "Old Dungeon Bones & Skull",
      category: "BONES" as const,
      zLayer: "FLOOR" as const,
      defaultWidthSq: 1.0,
      defaultHeightSq: 1.0,
      path: "/assets/map-props/bones-pile-skulls.svg",
    },
    bonesSkeletonRemains: {
      id: "prop-bones-skeleton-remains",
      name: "Forgotten Adventurer Skeleton",
      category: "BONES" as const,
      zLayer: "FLOOR" as const,
      defaultWidthSq: 1.25,
      defaultHeightSq: 1.0,
      path: "/assets/map-props/bones-skeleton-remains.svg",
    },
  },
  backgrounds: {
    hearthTavern: {
      id: "bg-hearth-tavern",
      name: "Hearth & Bakery Warmth",
      path: "/assets/backgrounds/backdrop-hearth-tavern.svg",
    },
    enchantedWoods: {
      id: "bg-enchanted-woods",
      name: "Enchanted Canopy & Fireflies",
      path: "/assets/backgrounds/backdrop-enchanted-woods.svg",
    },
    starlightObservatory: {
      id: "bg-starlight-observatory",
      name: "Starlight Celestial Observatory",
      path: "/assets/backgrounds/backdrop-starlight-observatory.svg",
    },
  },
  traps: {
    spikePlate: {
      id: "trap-spike-plate",
      name: "Foundry Pressure Spike Plate",
      path: "/assets/traps/trap-spike-plate.svg",
    },
    flourSnare: {
      id: "trap-flour-snare",
      name: "Goblin Flour-Poof & Rope Snare",
      path: "/assets/traps/trap-flour-snare.svg",
    },
    arcaneRune: {
      id: "trap-arcane-rune",
      name: "Astral Glowing Rune Trap",
      path: "/assets/traps/trap-arcane-rune.svg",
    },
  },
  areaMaps: {
    oakhavenVillage: {
      id: "map-oakhaven-bakery-quarter",
      name: "Map of Oakhaven Village & Hearth Quarter",
      path: "/assets/maps/map-oakhaven-bakery-quarter.svg",
    },
    silverleafCanopy: {
      id: "map-silverleaf-canopy",
      name: "Chart of Silverleaf Canopy",
      path: "/assets/maps/map-silverleaf-canopy.svg",
    },
    starwatchBastion: {
      id: "map-starwatch-bastion",
      name: "Astral Chart of Starwatch Citadel",
      path: "/assets/maps/map-starwatch-bastion.svg",
    },
  },
} as const;

/**
 * Resolves an SVG asset path for a hero archetype name.
 */
export function resolveArchetypeAsset(archetype: string): string {
  const norm = archetype.toLowerCase();
  for (const hero of Object.values(HEARTHQUEST_ASSETS.heroes)) {
    if (hero.archetypeMatch.some((match) => norm.includes(match))) {
      return hero.path;
    }
  }
  return HEARTHQUEST_ASSETS.heroes.shieldKnight.path;
}

/**
 * Resolves an SVG asset path for any map token based on its name, type, and chest state.
 */
export function resolveTokenAsset(token: {
  name?: string;
  type?: string;
  assetPath?: string;
  isLootChest?: boolean;
  isChestOpened?: boolean;
}): string {
  if (token.assetPath) {
    return token.assetPath;
  }
  if (token.isLootChest) {
    return token.isChestOpened
      ? HEARTHQUEST_ASSETS.props.chestOpen.path
      : HEARTHQUEST_ASSETS.props.chestClosed.path;
  }
  const name = (token.name || "").toLowerCase();
  if (name.includes("snickerdoodle") || name.includes("chef") || name.includes("goblin boss") || name.includes("bugbear"))
    return HEARTHQUEST_ASSETS.monsters.chefSnickerdoodle.path;
  if (name.includes("sprinkles") || name.includes("goblin") || name.includes("bandit"))
    return HEARTHQUEST_ASSETS.monsters.goblinSprinkles.path;
  if (name.includes("squirrel") || name.includes("cogsworth") || name.includes("brass") || name.includes("animated armor") || name.includes("skeleton") || name.includes("construct"))
    return HEARTHQUEST_ASSETS.monsters.brassSquirrel.path;
  if (name.includes("dragon") || name.includes("marshmallow") || name.includes("puppy") || name.includes("wolf"))
    return HEARTHQUEST_ASSETS.monsters.dragonPuppy.path;
  if (name.includes("jelly") || name.includes("lumina") || name.includes("nebula") || name.includes("gelatinous") || name.includes("specter") || name.includes("ooze"))
    return HEARTHQUEST_ASSETS.monsters.nebulaJelly.path;
  if (name.includes("torch")) return HEARTHQUEST_ASSETS.props.torchWall.path;
  if (name.includes("campfire") || name.includes("hearth"))
    return HEARTHQUEST_ASSETS.props.campfireHearth.path;

  // Check hero archetypes
  for (const hero of Object.values(HEARTHQUEST_ASSETS.heroes)) {
    if (hero.archetypeMatch.some((match) => name.includes(match))) {
      return hero.path;
    }
  }

  return "";
}

/**
 * Resolves the tactical floor tile asset for a campaign or procedural layout.
 */
export function resolveCampaignTileAsset(campaignIdOrTheme: string): string {
  const norm = campaignIdOrTheme.toLowerCase();
  if (norm.includes("treehouse") || norm.includes("forest")) {
    return HEARTHQUEST_ASSETS.tiles.treehouseWood.path;
  }
  if (norm.includes("starlight") || norm.includes("ship") || norm.includes("otter")) {
    return HEARTHQUEST_ASSETS.tiles.starlightDeck.path;
  }
  return HEARTHQUEST_ASSETS.tiles.bakeryFloor.path;
}

/**
 * Resolves a scenic tabletop SVG backdrop asset for a scene backdrop key or campaign theme.
 */
export function resolveSceneBackdropAsset(backdropOrTheme: string): string {
  const norm = backdropOrTheme.toLowerCase();
  if (norm.includes("wood") || norm.includes("forest") || norm.includes("treehouse") || norm.includes("silverleaf")) {
    return HEARTHQUEST_ASSETS.backgrounds.enchantedWoods.path;
  }
  if (norm.includes("starlight") || norm.includes("observatory") || norm.includes("ship") || norm.includes("starwatch")) {
    return HEARTHQUEST_ASSETS.backgrounds.starlightObservatory.path;
  }
  if (norm.includes("hearth") || norm.includes("tavern") || norm.includes("bakery") || norm.includes("oakhaven")) {
    return HEARTHQUEST_ASSETS.backgrounds.hearthTavern.path;
  }
  return "";
}

/**
 * Resolves an illustrated static overhead town or regional area map SVG for stage setting before combat.
 */
export function resolveAreaMapAsset(campaignOrTheme: string): string {
  const norm = (campaignOrTheme || "").toLowerCase();
  if (norm.includes("treehouse") || norm.includes("forest") || norm.includes("wood") || norm.includes("silverleaf") || norm.includes("clockwork")) {
    return HEARTHQUEST_ASSETS.areaMaps.silverleafCanopy.path;
  }
  if (norm.includes("starlight") || norm.includes("observatory") || norm.includes("ship") || norm.includes("starwatch") || norm.includes("otter")) {
    return HEARTHQUEST_ASSETS.areaMaps.starwatchBastion.path;
  }
  return HEARTHQUEST_ASSETS.areaMaps.oakhavenVillage.path;
}

/**
 * Resolves an illustrated Foundry trap SVG sprite based on the zone's trap description.
 */
export function resolveTrapAsset(trapDescription?: string): string {
  const norm = (trapDescription || "").toLowerCase();
  if (norm.includes("rune") || norm.includes("star") || norm.includes("magic") || norm.includes("glow") || norm.includes("arcane") || norm.includes("glyph") || norm.includes("frost")) {
    return HEARTHQUEST_ASSETS.traps.arcaneRune.path;
  }
  if (norm.includes("flour") || norm.includes("snare") || norm.includes("rope") || norm.includes("honey") || norm.includes("dough") || norm.includes("trip") || norm.includes("bell") || norm.includes("pie")) {
    return HEARTHQUEST_ASSETS.traps.flourSnare.path;
  }
  return HEARTHQUEST_ASSETS.traps.spikePlate.path;
}

/**
 * Resolves a ground texture tile SVG path from a GroundTileTheme key or biome keyword.
 */
export function resolveGroundTileAsset(themeOrCampaign?: string): string {
  const norm = (themeOrCampaign || "").toUpperCase();
  if (norm === "FOREST_GRASS" || norm.includes("GRASS") || norm.includes("GLADE")) {
    return HEARTHQUEST_ASSETS.tiles.forestGrass.path;
  }
  if (norm === "DUNGEON_STONE" || norm.includes("CRYPT") || norm.includes("VAULT") || norm.includes("DUNGEON")) {
    return HEARTHQUEST_ASSETS.tiles.dungeonStone.path;
  }
  if (norm === "CAVERN_DIRT" || norm.includes("DIRT") || norm.includes("CAVERN")) {
    return HEARTHQUEST_ASSETS.tiles.cavernDirt.path;
  }
  if (norm === "TREEHOUSE_WOOD" || norm.includes("TREEHOUSE") || norm.includes("FOREST")) {
    return HEARTHQUEST_ASSETS.tiles.treehouseWood.path;
  }
  if (norm === "STARLIGHT_DECK" || norm.includes("STARLIGHT") || norm.includes("OBSERVATORY") || norm.includes("SHIP")) {
    return HEARTHQUEST_ASSETS.tiles.starlightDeck.path;
  }
  return HEARTHQUEST_ASSETS.tiles.bakeryFloor.path;
}
