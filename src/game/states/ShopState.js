import { State } from './State.js';

export class ShopState extends State {
  constructor(game) {
    super(game);
    this.name = 'shop';
    this.upgrades = [];
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.maxVisibleItems = 6;
    this.selectSound = null;
  }
  
  enter() {
    console.log('Entering shop state');
    
    // Get available upgrades
    this.upgrades = this.game.metaProgression.getAvailableUpgrades();
    
    // Filter out already purchased upgrades
    this.upgrades = this.upgrades.filter(upgrade => 
      !this.game.metaProgression.hasUpgrade(upgrade.id)
    );
    
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    
    // Initialize select sound if not already created
    if (!this.selectSound) {
      this.selectSound = new Audio('/menu_select.mp3');
      this.selectSound.volume = 0.7;
    }
  }
  
  exit() {
    // Return to menu
  }
  
  update(deltaTime) {
    const input = this.game.inputManager;
    
    // Navigation
    if (input.isKeyPressed('ArrowUp') || input.isKeyPressed('w')) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.playSelectSound();
      this.updateScroll();
    }
    
    if (input.isKeyPressed('ArrowDown') || input.isKeyPressed('s')) {
      this.selectedIndex = Math.min(this.upgrades.length - 1, this.selectedIndex + 1);
      this.playSelectSound();
      this.updateScroll();
    }
    
    if (input.isKeyPressed('Enter') || input.isKeyPressed(' ')) {
      this.purchaseUpgrade();
    }
    
    if (input.isKeyPressed('Escape')) {
      this.game.stateManager.changeState('menu');
    }
    
    // Mouse support
    const mousePos = input.getMousePosition();
    if (mousePos) {
      const itemHeight = 80;
      const startY = 200;
      const itemY = startY + this.scrollOffset * itemHeight;
      
      for (let i = 0; i < this.upgrades.length; i++) {
        const y = itemY + i * itemHeight;
        if (mousePos.y >= y && mousePos.y < y + itemHeight && 
            mousePos.x >= 100 && mousePos.x < 1180) {
          if (this.selectedIndex !== i) {
            this.selectedIndex = i;
            this.playSelectSound();
            this.updateScroll();
          }
          
          if (input.isMouseButtonPressed(0)) {
            this.purchaseUpgrade();
          }
        }
      }
    }
  }
  
  updateScroll() {
    // Keep selected item visible
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + this.maxVisibleItems) {
      this.scrollOffset = this.selectedIndex - this.maxVisibleItems + 1;
    }
  }
  
  purchaseUpgrade() {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.upgrades.length) return;
    
    const upgrade = this.upgrades[this.selectedIndex];
    const currency = this.game.metaProgression.getCurrency();
    
    if (currency >= upgrade.cost) {
      if (this.game.metaProgression.purchaseUpgrade(upgrade.id, upgrade.cost)) {
        // Remove purchased upgrade from list
        this.upgrades.splice(this.selectedIndex, 1);
        
        // Adjust selection if needed
        if (this.selectedIndex >= this.upgrades.length) {
          this.selectedIndex = Math.max(0, this.upgrades.length - 1);
        }
        
        // Play purchase sound
        const yaySound = new Audio('/yay.mp3');
        yaySound.volume = 0.5;
        yaySound.play().catch(e => console.log('Purchase sound play failed:', e));
        
        console.log(`Purchased: ${upgrade.name}`);
      }
    } else {
      // Play error sound
      const uhOhSound = new Audio('/uh_oh.mp3');
      uhOhSound.volume = 0.4;
      uhOhSound.play().catch(e => console.log('Error sound play failed:', e));
    }
  }
  
  render(renderer, interpolation) {
    const ctx = renderer.ctx;
    const { width, height } = this.game;
    
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);
    
    // Title
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('UPGRADE SHOP', width / 2, 80);
    
    // Currency display
    const currency = this.game.metaProgression.getCurrency();
    ctx.font = '24px Arial';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`💰 ${this.game.metaProgression.formatCurrency(currency)}`, width / 2, 120);
    
    // Instructions
    ctx.font = '16px Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Use ↑↓ to navigate, Enter to purchase, Escape to return', width / 2, 160);
    
    // Render upgrade items
    const itemHeight = 80;
    const startY = 200;
    const itemY = startY + this.scrollOffset * itemHeight;
    
    for (let i = 0; i < this.upgrades.length; i++) {
      const upgrade = this.upgrades[i];
      const y = itemY + i * itemHeight;
      const isSelected = i === this.selectedIndex;
      
      // Skip if not visible
      if (y < startY - itemHeight || y > startY + this.maxVisibleItems * itemHeight) {
        continue;
      }
      
      // Item background
      ctx.fillStyle = isSelected ? 'rgba(100, 200, 100, 0.3)' : 'rgba(50, 50, 50, 0.3)';
      ctx.fillRect(100, y, 1080, itemHeight - 10);
      
      // Item border
      ctx.strokeStyle = isSelected ? '#00ff00' : '#666';
      ctx.lineWidth = 2;
      ctx.strokeRect(100, y, 1080, itemHeight - 10);
      
      // Upgrade icon
      ctx.font = '32px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.fillText(upgrade.icon, 120, y + 25);
      
      // Upgrade name
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#fff';
      ctx.fillText(upgrade.name, 170, y + 25);
      
      // Upgrade description
      ctx.font = '16px Arial';
      ctx.fillStyle = '#ccc';
      ctx.fillText(upgrade.description, 170, y + 50);
      
      // Price
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'right';
      const canAfford = currency >= upgrade.cost;
      ctx.fillStyle = canAfford ? '#ffd700' : '#ff6666';
      ctx.fillText(`💰 ${this.game.metaProgression.formatCurrency(upgrade.cost)}`, 1160, y + 35);
      
      // Affordability indicator
      if (!canAfford) {
        ctx.font = '14px Arial';
        ctx.fillStyle = '#ff6666';
        ctx.fillText('Not enough currency!', 1160, y + 55);
      }
    }
    
    // Scroll indicators
    if (this.scrollOffset > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(width / 2 - 20, startY - 30, 40, 20);
      ctx.fillStyle = '#000';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('↑', width / 2, startY - 15);
    }
    
    if (this.scrollOffset + this.maxVisibleItems < this.upgrades.length) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(width / 2 - 20, startY + this.maxVisibleItems * itemHeight + 10, 40, 20);
      ctx.fillStyle = '#000';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('↓', width / 2, startY + this.maxVisibleItems * itemHeight + 25);
    }
    
    ctx.restore();
  }
  
  playSelectSound() {
    if (this.selectSound) {
      this.selectSound.currentTime = 0;
      this.selectSound.play().catch(e => console.log('Select sound play failed:', e));
    }
  }
} 