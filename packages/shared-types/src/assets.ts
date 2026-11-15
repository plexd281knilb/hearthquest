/**
 * HearthQuest Foundry-Grade Asset Catalog
 * Centralized registry of vector SVG token standees, tactical terrain tiles, and props.
 */

export interface HearthQuestAsset {
  id: string;
  name: string;
  category: "hero" | "monster" | "prop" | "tile" | "background" | "icon";
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
  if (name.includes("sprinkles")) return HEARTHQUEST_ASSETS.monsters.goblinSprinkles.path;
  if (name.includes("snickerdoodle") || name.includes("chef"))
    return HEARTHQUEST_ASSETS.monsters.chefSnickerdoodle.path;
  if (name.includes("squirrel") || name.includes("cogsworth") || name.includes("brass"))
    return HEARTHQUEST_ASSETS.monsters.brassSquirrel.path;
  if (name.includes("dragon") || name.includes("marshmallow") || name.includes("puppy"))
    return HEARTHQUEST_ASSETS.monsters.dragonPuppy.path;
  if (name.includes("jelly") || name.includes("lumina") || name.includes("nebula"))
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
  if (norm.includes("wood") || norm.includes("forest") || norm.includes("treehouse")) {
    return HEARTHQUEST_ASSETS.backgrounds.enchantedWoods.path;
  }
  if (norm.includes("starlight") || norm.includes("observatory") || norm.includes("ship")) {
    return HEARTHQUEST_ASSETS.backgrounds.starlightObservatory.path;
  }
  if (norm.includes("hearth") || norm.includes("tavern") || norm.includes("bakery")) {
    return HEARTHQUEST_ASSETS.backgrounds.hearthTavern.path;
  }
  return "";
}
