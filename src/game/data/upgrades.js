export const UPGRADES = {
  // Passive upgrades based on the design doc
  speed: {
    id: 'speed',
    name: 'Comfy Shoes',
    description: 'Increases movement speed by 10%',
    icon: '��',
    maxLevel: 5,
    effect: (player, level) => {
      const baseSpeed = 3;
      player.upgrade('moveSpeed', 0.1 * baseSpeed);
    },
    getDescription: (level) => `+${10 * level}% Movement Speed`
  },
  
  pickupRadius: {
    id: 'pickupRadius',
    name: 'Long Arms',
    description: 'Increases book pickup radius by 0.1m',
    icon: '🤲',
    maxLevel: 10,
    effect: (player, level) => {
      player.upgrade('pickupRadius', 0.1);
      player.upgrade('returnRadius', 0.1);
    },
    getDescription: (level) => `+${(0.1 * level).toFixed(1)}m Pickup/Return Radius`
  },
  
  carrySlots: {
    id: 'carrySlots',
    name: 'Book Belt',
    description: 'Carry 1 additional book',
    icon: '📚',
    maxLevel: 7,
    effect: (player, level) => {
      player.upgrade('carrySlots', 1);
    },
    getDescription: (level) => `+${level} Book Slots`
  },
  
  stamina: {
    id: 'stamina',
    name: 'Fitness Training',
    description: 'Increases maximum stamina by 10',
    icon: '💪',
    maxLevel: 10,
    effect: (player, level) => {
      player.upgrade('stamina', 10);
    },
    getDescription: (level) => `+${10 * level} Max Stamina`
  },
  
  chaosDampening: {
    id: 'chaosDampening',
    name: 'Zen Focus',
    description: 'Reduces chaos gain by 2%',
    icon: '🧘',
    maxLevel: 10,
    effect: (player, level) => {
      player.upgrade('chaosDampening', 2);
    },
    getDescription: (level) => `-${2 * level}% Chaos Gain`
  },
  
  xpGain: {
    id: 'xpGain',
    name: 'Reading Glasses',
    description: 'Increases XP gain by 8%',
    icon: '👓',
    maxLevel: 5,
    effect: (player, level) => {
      player.upgrade('xpMultiplier', 0.08);
    },
    getDescription: (level) => `+${8 * level}% XP Gain`
  },
  
  // Weapon Skills
  shushWave: {
    id: 'shushWave',
    name: 'Shush Wave',
    description: 'Creates a cone of silence that stuns kids and knocks them back',
    icon: '🤫',
    maxLevel: 5,
    isWeapon: true,
    effect: (player, level) => {
      // Skill is handled by SkillSystem
      if (!player.upgradeLevels) player.upgradeLevels = {};
      player.upgradeLevels.shushWave = level;
    },
    getDescription: (level) => `Level ${level} Shush Wave - Stuns kids for ${2 + level * 0.5}s`
  },
  
  bookmarkBoomerang: {
    id: 'bookmarkBoomerang',
    name: 'Bookmark Boomerang',
    description: 'Throws a boomerang that silences kids and returns to you',
    icon: '📖',
    maxLevel: 5,
    isWeapon: true,
    effect: (player, level) => {
      if (!player.upgradeLevels) player.upgradeLevels = {};
      player.upgradeLevels.bookmarkBoomerang = level;
    },
    getDescription: (level) => `Level ${level} Boomerang - Silences kids for ${3 + level * 0.5}s`
  },
  
  dustCloud: {
    id: 'dustCloud',
    name: 'Dust Cloud',
    description: 'Creates a cloud that slows kids and reduces their effectiveness',
    icon: '💨',
    maxLevel: 5,
    isWeapon: true,
    effect: (player, level) => {
      if (!player.upgradeLevels) player.upgradeLevels = {};
      player.upgradeLevels.dustCloud = level;
    },
    getDescription: (level) => `Level ${level} Dust Cloud - Slows kids by ${50 + level * 10}%`
  },
  
  // Special upgrades
  airConditioning: {
    id: 'airConditioning',
    name: 'Air Conditioning',
    description: 'Reduces all kids movement speed globally',
    icon: '❄️',
    maxLevel: 3,
    effect: (player, level) => {
      // Global effect handled in PlayingState
      if (!player.upgradeLevels) player.upgradeLevels = {};
      player.upgradeLevels.airConditioning = level;
    },
    getDescription: (level) => `Global kid speed -${15 * level}%`
  },
  
  libraryFunding: {
    id: 'libraryFunding',
    name: 'Library Funding',
    description: 'Increases pickup radius and grants bonus XP',
    icon: '💰',
    maxLevel: 3,
    effect: (player, level) => {
      player.upgrade('pickupRadius', 0.2);
      player.upgrade('returnRadius', 0.2);
      player.upgrade('xpMultiplier', 0.05);
    },
    getDescription: (level) => `+${0.2 * level}m radius, +${5 * level}% XP`
  }
};

// Helper function to get random upgrades
export function getRandomUpgrades(count = 3, playerUpgrades = {}) {
  const availableUpgrades = Object.values(UPGRADES).filter(upgrade => {
    // Check if upgrade is maxed out
    const currentLevel = playerUpgrades[upgrade.id] || 0;
    return currentLevel < upgrade.maxLevel;
  });
  
  // Prioritize weapon skills if player has none
  const hasWeaponSkills = Object.keys(playerUpgrades).some(id => 
    UPGRADES[id]?.isWeapon && playerUpgrades[id] > 0
  );
  
  let filteredUpgrades = availableUpgrades;
  
  // If no weapon skills, increase chance of getting them
  if (!hasWeaponSkills) {
    const weaponSkills = availableUpgrades.filter(u => u.isWeapon);
    const passiveUpgrades = availableUpgrades.filter(u => !u.isWeapon);
    
    // 50% chance to get a weapon skill if available
    if (weaponSkills.length > 0 && Math.random() < 0.5) {
      const weaponSkill = weaponSkills[Math.floor(Math.random() * weaponSkills.length)];
      const remainingPassive = passiveUpgrades.slice(0, count - 1);
      filteredUpgrades = [weaponSkill, ...remainingPassive];
    }
  }
  
  // Shuffle and pick
  const shuffled = [...filteredUpgrades].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Get upgrade by ID
export function getUpgrade(id) {
  return UPGRADES[id];
}

// Get all weapon skills
export function getWeaponSkills() {
  return Object.values(UPGRADES).filter(upgrade => upgrade.isWeapon);
}

// Get all passive upgrades
export function getPassiveUpgrades() {
  return Object.values(UPGRADES).filter(upgrade => !upgrade.isWeapon);
}