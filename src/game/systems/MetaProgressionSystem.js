import { SecurityUtils } from '../../security.js';

export class MetaProgressionSystem {
  constructor(game) {
    this.game = game;
    
    // Initialize with defaults
    this.currency = 0;
    this.permanentUpgrades = {};
    this.unlockedLibrarians = ['default'];
    this.currentLibrarian = 'default';
    this.highScores = [];
    
    // Load saved data
    this.loadData();
  }
  
  // Currency management
  addCurrency(amount) {
    this.currency += amount;
    this.saveData();
  }
  
  spendCurrency(amount) {
    if (this.currency >= amount) {
      this.currency -= amount;
      this.saveData();
      return true;
    }
    return false;
  }
  
  getCurrency() {
    return this.currency;
  }
  
  // Permanent upgrades
  purchaseUpgrade(upgradeId, cost) {
    if (this.spendCurrency(cost)) {
      this.permanentUpgrades[upgradeId] = true;
      this.saveData();
      return true;
    }
    return false;
  }
  
  hasUpgrade(upgradeId) {
    return this.permanentUpgrades[upgradeId] || false;
  }
  
  // High score management
  addHighScore(score) {
    this.highScores.push({
      score: score,
      date: new Date().toISOString(),
      time: this.game.gameData.elapsedTime,
      booksShelved: this.game.gameData.booksShelved,
      kidsRepelled: this.game.gameData.kidsRepelled
    });
    
    // Sort by score (highest first) and keep top 10
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, 10);
    
    this.saveData();
  }
  
  getHighScores() {
    return this.highScores;
  }
  
  // Calculate score from game data
  calculateScore(gameData) {
    const baseScore = Math.floor(gameData.elapsedTime / 60) * 100; // 100 points per minute
    const bookBonus = gameData.booksShelved * 50; // 50 points per book shelved
    const repelBonus = gameData.kidsRepelled * 25; // 25 points per kid repelled
    const chaosPenalty = Math.floor(gameData.chaosLevel) * 2; // 2 point penalty per chaos
    
    return Math.max(0, baseScore + bookBonus + repelBonus - chaosPenalty);
  }
  
  // Save/Load data
  saveData() {
    const data = {
      currency: this.currency,
      permanentUpgrades: this.permanentUpgrades,
      unlockedLibrarians: this.unlockedLibrarians,
      currentLibrarian: this.currentLibrarian,
      highScores: this.highScores
    };
    
    try {
      // Validate data before saving
      if (this.validateSaveData(data)) {
        localStorage.setItem('librarySurvivorsData', JSON.stringify(data));
      } else {
        console.error('Invalid data structure detected, not saving');
      }
    } catch (e) {
      console.error('Failed to save game data:', e);
    }
  }
  
  loadData() {
    try {
      const savedData = localStorage.getItem('librarySurvivorsData');
      if (savedData) {
        const data = JSON.parse(savedData);
        
        // Use SecurityUtils for validation
        if (SecurityUtils.validateLocalStorageData(data)) {
          this.currency = SecurityUtils.sanitizeNumber(data.currency, 0, 999999);
          this.permanentUpgrades = SecurityUtils.sanitizeObject(data.permanentUpgrades) || {};
          this.unlockedLibrarians = SecurityUtils.sanitizeArray(data.unlockedLibrarians) || ['default'];
          this.currentLibrarian = SecurityUtils.sanitizeString(data.currentLibrarian) || 'default';
          this.highScores = SecurityUtils.sanitizeHighScores(data.highScores) || [];
        } else {
          console.error('Invalid saved data structure, using defaults');
          this.resetData();
        }
      }
    } catch (e) {
      console.error('Failed to load game data:', e);
      this.resetData();
    }
  }
  
  // Validate save data structure
  validateSaveData(data) {
    return SecurityUtils.validateLocalStorageData(data);
  }
  
  // Sanitize input values
  sanitizeNumber(value) {
    return SecurityUtils.sanitizeNumber(value, 0, 999999);
  }
  
  sanitizeString(value) {
    return SecurityUtils.sanitizeText(value, 50);
  }
  
  sanitizeObject(value) {
    return typeof value === 'object' && value !== null ? value : {};
  }
  
  sanitizeArray(value) {
    return Array.isArray(value) ? value : [];
  }
  
  sanitizeHighScores(scores) {
    if (!Array.isArray(scores)) return [];
    
    return scores
      .filter(score => score && typeof score === 'object')
      .map(score => ({
        score: SecurityUtils.sanitizeNumber(score.score, 0, 999999999),
        time: SecurityUtils.sanitizeNumber(score.time, 0, 999999),
        date: SecurityUtils.sanitizeText(score.date, 50),
        booksCollected: SecurityUtils.sanitizeNumber(score.booksCollected, 0, 999999)
      }))
      .slice(0, 10); // Limit to top 10 scores
  }
  
  // Reset all data
  resetData() {
    this.currency = 0;
    this.permanentUpgrades = {};
    this.unlockedLibrarians = ['default'];
    this.currentLibrarian = 'default';
    this.highScores = [];
    this.saveData();
  }
  
  // Apply permanent upgrades to player
  applyPermanentUpgrades(player) {
    if (this.hasUpgrade('startingSpeed')) {
      player.stats.moveSpeed += 0.5;
      player.baseSpeed = player.stats.moveSpeed * 32;
    }
    
    if (this.hasUpgrade('startingPickupRadius')) {
      player.stats.pickupRadius += 0.2;
      player.stats.returnRadius += 0.2;
    }
    
    if (this.hasUpgrade('startingCarrySlots')) {
      player.stats.carrySlots += 1;
    }
    
    if (this.hasUpgrade('startingStamina')) {
      player.stats.maxStamina += 20;
      player.stats.stamina += 20;
    }
    
    if (this.hasUpgrade('startingChaosDampening')) {
      player.stats.chaosDampening += 5;
    }
    
    if (this.hasUpgrade('startingXPMultiplier')) {
      player.stats.xpMultiplier += 0.1;
    }
  }
  
  // Get available permanent upgrades
  getAvailableUpgrades() {
    return [
      {
        id: 'startingSpeed',
        name: 'Morning Coffee',
        description: 'Start with +0.5 movement speed',
        cost: 100,
        icon: '☕'
      },
      {
        id: 'startingPickupRadius',
        name: 'Long Arms Training',
        description: 'Start with +0.2 pickup radius',
        cost: 150,
        icon: '🤲'
      },
      {
        id: 'startingCarrySlots',
        name: 'Book Bag',
        description: 'Start with +1 carry slot',
        cost: 200,
        icon: '📚'
      },
      {
        id: 'startingStamina',
        name: 'Morning Exercise',
        description: 'Start with +20 max stamina',
        cost: 120,
        icon: '💪'
      },
      {
        id: 'startingChaosDampening',
        name: 'Zen Training',
        description: 'Start with +5% chaos dampening',
        cost: 180,
        icon: '🧘'
      },
      {
        id: 'startingXPMultiplier',
        name: 'Study Habits',
        description: 'Start with +10% XP gain',
        cost: 250,
        icon: '👓'
      },
      {
        id: 'extraWeaponSlot',
        name: 'Skill Belt',
        description: 'Unlock an additional weapon skill slot',
        cost: 500,
        icon: '⚔️'
      },
      {
        id: 'startingRelic',
        name: 'Lucky Charm',
        description: 'Start with a random relic',
        cost: 800,
        icon: '🍀'
      }
    ];
  }
  
  // Get upgrade by ID
  getUpgradeById(upgradeId) {
    return this.getAvailableUpgrades().find(upgrade => upgrade.id === upgradeId);
  }
  
  // Format currency display
  formatCurrency(amount) {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    } else {
      return amount.toString();
    }
  }
  
  // Format time display
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  // Format date for high scores
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
} 