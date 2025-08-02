import { Entity } from './Entity.js';

export class Kid extends Entity {
  constructor(game, x, y, aggressionLevel = 1) {
    super(x, y, 24, 36);
    
    this.aggressionLevel = aggressionLevel;
    this.state = 'wandering';
    this.target = null;
    this.carriedBook = null;
    this.stunned = false;
    this.stunEndTime = 0;
    this.lastLaughTime = 0;
    this.laughInterval = 5000 + Math.random() * 10000; // 5-15 seconds
    this.speedMultiplier = 1.0;
    
    // Choose sprite type based on aggression level
    this.spriteType = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
    
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[KID SPAWN] Created kid with sprite type: ${this.spriteType}`);
    }
  }
  
  update(deltaTime) {
    // Update timers
    this.lastLaughTime += deltaTime;
    
    // Check if stunned
    if (this.stunned) {
      if (Date.now() > this.stunEndTime) {
        this.stunned = false;
      } else {
        return; // Can't move while stunned
      }
    }
    
    // Update state based on current situation
    this.updateState();
    
    // Update behavior based on state
    switch (this.state) {
      case 'wandering':
        this.updateWandering(deltaTime);
        break;
      case 'fleeing':
        this.updateFleeing(deltaTime);
        break;
      case 'stealing':
        this.updateStealing(deltaTime);
        break;
    }
    
    // Apply movement
    this.applyMovement(deltaTime);
    
    // Update animation
    this.updateAnimation(deltaTime);
  }
  
  updateSkillEffects(deltaTime) {
    // Update stun effect
    if (this.stunned) {
      this.stunTimer -= deltaTime;
      if (this.stunTimer <= 0) {
        this.stunned = false;
        this.stunTimer = 0;
      }
    }
    
    // Update silence effect
    if (this.silenced) {
      this.silenceTimer -= deltaTime;
      if (this.silenceTimer <= 0) {
        this.silenced = false;
        this.silenceTimer = 0;
      }
    }
    
    // Update slow effect
    if (this.slowed) {
      this.slowTimer -= deltaTime;
      if (this.slowTimer <= 0) {
        this.slowed = false;
        this.slowTimer = 0;
        this.slowFactor = 1.0;
      }
    }
  }
  
  updateWandering(deltaTime) {
    const state = this.game.stateManager.currentState;
    if (!state) return;
    
    const player = state.player;
    const shelves = state.shelves || [];
    
    // Enhanced player proximity check with better avoidance
    if (player) {
      const distToPlayer = this.getDistanceTo(player);
      if (distToPlayer < this.playerDetectionRange) {
        // Track kid being repelled
        if (this.state !== 'fleeing') {
          this.game.gameData.kidsRepelled++;
        }
        this.state = 'fleeing';
        this.playLaughingSound();
        return;
      }
      
      // Proactive avoidance - start moving away before getting too close
      if (distToPlayer < this.playerDetectionRange * 1.5) {
        const dx = this.getCenterX() - player.getCenterX();
        const dy = this.getCenterY() - player.getCenterY();
        this.direction = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5;
        this.vx = Math.cos(this.direction) * this.speed;
        this.vy = Math.sin(this.direction) * this.speed;
        this.applyMovement(deltaTime);
        return;
      }
    }
    
    // Enhanced shelf seeking - check ALL shelves for books
    if (!this.carriedBook && this.bookStealCooldown <= 0) {
      let bestShelf = null;
      let bestDistance = Infinity;
      
      for (const shelf of shelves) {
        if (shelf.books.some(b => b !== null)) {
          const distToShelf = this.getDistanceTo(shelf);
          if (distToShelf < bestDistance) {
            bestDistance = distToShelf;
            bestShelf = shelf;
          }
        }
      }
      
      if (bestShelf) {
        this.target = bestShelf;
        this.state = 'stealing';
        return;
      }
    }
    
    // If not carrying a book and cooldown is up, actively seek nearest shelf
    if (!this.carriedBook && this.bookStealCooldown <= 0 && shelves.length > 0) {
      // Find nearest shelf with books
      let nearestShelf = null;
      let nearestDist = Infinity;
      
      for (const shelf of shelves) {
        if (shelf.books.some(b => b !== null)) {
          const dist = this.getDistanceTo(shelf);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestShelf = shelf;
          }
        }
      }
      
      if (nearestShelf) {
        // Move towards nearest shelf with more direct pathing
        const dx = nearestShelf.getCenterX() - this.getCenterX();
        const dy = nearestShelf.getCenterY() - this.getCenterY();
        this.direction = Math.atan2(dy, dx);
        
        // Add some randomness to avoid getting stuck in patterns
        this.direction += (Math.random() - 0.5) * 0.2;
      } else {
        // No shelves with books, explore more intelligently
        this.directionChangeTimer -= deltaTime;
        if (this.directionChangeTimer <= 0) {
          // Enhanced exploration with better area coverage
          const exploreTargets = [
            { x: state.worldWidth * 0.25, y: state.worldHeight * 0.25 },
            { x: state.worldWidth * 0.75, y: state.worldHeight * 0.25 },
            { x: state.worldWidth * 0.25, y: state.worldHeight * 0.75 },
            { x: state.worldWidth * 0.75, y: state.worldHeight * 0.75 },
            { x: state.worldWidth * 0.5, y: state.worldHeight * 0.5 },
            // Add more exploration points for better coverage
            { x: state.worldWidth * 0.1, y: state.worldHeight * 0.5 },
            { x: state.worldWidth * 0.9, y: state.worldHeight * 0.5 },
            { x: state.worldWidth * 0.5, y: state.worldHeight * 0.1 },
            { x: state.worldWidth * 0.5, y: state.worldHeight * 0.9 }
          ];
          
          const target = exploreTargets[Math.floor(Math.random() * exploreTargets.length)];
          const dx = target.x - this.getCenterX();
          const dy = target.y - this.getCenterY();
          this.direction = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5;
          this.directionChangeTimer = 2.0 + Math.random() * 2.0; // More varied timing
        }
      }
    } else {
      // Carrying book - move around to spread chaos more effectively
      this.directionChangeTimer -= deltaTime;
      if (this.directionChangeTimer <= 0) {
        // Move away from where we picked up the book, but also explore
        if (this.target) {
          const dx = this.getCenterX() - this.target.getCenterX();
          const dy = this.getCenterY() - this.target.getCenterY();
          this.direction = Math.atan2(dy, dx) + (Math.random() - 0.5) * Math.PI;
        } else {
          // Random exploration when no target
          this.direction = Math.random() * Math.PI * 2;
        }
        this.directionChangeTimer = 1.0 + Math.random() * 1.0;
      }
    }
    
    // Move in current direction
    this.vx = Math.cos(this.direction) * this.speed;
    this.vy = Math.sin(this.direction) * this.speed;
    
    // Enhanced edge handling - don't force toward center, try to find paths
    if (state.worldWidth && state.worldHeight) {
      const margin = 30; // Increased margin for better edge detection
      if (this.x <= margin || this.x >= state.worldWidth - this.width - margin ||
          this.y <= margin || this.y >= state.worldHeight - this.height - margin) {
        
        // Try to find a clear direction away from the edge
        const directions = [0, Math.PI/2, Math.PI, -Math.PI/2]; // Right, Down, Left, Up
        let bestDirection = null;
        
        for (const dir of directions) {
          const testX = this.x + Math.cos(dir) * this.speed * 0.1;
          const testY = this.y + Math.sin(dir) * this.speed * 0.1;
          
          // Check if this direction is clear
          let isClear = true;
          for (const shelf of shelves) {
            if (this.checkCollision(testX, testY, shelf)) {
              isClear = false;
              break;
            }
          }
          
          if (isClear) {
            bestDirection = dir;
            break;
          }
        }
        
        if (bestDirection !== null) {
          this.direction = bestDirection;
        } else {
          // If no clear direction, try toward center as fallback
          const centerX = state.worldWidth / 2;
          const centerY = state.worldHeight / 2;
          const dx = centerX - this.getCenterX();
          const dy = centerY - this.getCenterY();
          this.direction = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5;
        }
      }
    }
    
    // Apply movement with collision detection
    this.applyMovement(deltaTime);
    
    // Debug: Log kid behavior occasionally
    if (Math.random() < 0.001) { // 0.1% chance per frame
      console.log(`Kid ${this.aggressionLevel}: ${this.state}, pos: (${Math.round(this.x)}, ${Math.round(this.y)}), target: ${this.target ? 'yes' : 'no'}, carrying: ${this.carriedBook ? 'yes' : 'no'}`);
    }
  }
  
  updateFleeing(deltaTime) {
    const state = this.game.stateManager.currentState;
    if (!state) return;
    
    const player = state.player;
    
    // If no player or player is far, just run in a random direction briefly
    if (!player) {
      // Run away from where we were for a bit
      this.vx = Math.cos(this.direction) * this.fleeSpeed;
      this.vy = Math.sin(this.direction) * this.fleeSpeed;
      this.applyMovement(deltaTime);
      
      // Stop fleeing after 1 second
      if (!this.fleeTimer) this.fleeTimer = 1;
      this.fleeTimer -= deltaTime;
      if (this.fleeTimer <= 0) {
        this.fleeTimer = null;
        this.state = 'wandering';
        this.hasPlayedLaughSound = false; // Reset for next flee
      }
      return;
    }
    
    const distToPlayer = this.getDistanceTo(player);
    
    // Stop fleeing if far enough away
    if (distToPlayer > this.playerDetectionRange * 1.5) {
      this.state = 'wandering';
      this.hasPlayedLaughSound = false; // Reset for next flee
      return;
    }
    
    // Run away from player
    const dx = this.getCenterX() - player.getCenterX();
    const dy = this.getCenterY() - player.getCenterY();
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      this.vx = (dx / dist) * this.fleeSpeed;
      this.vy = (dy / dist) * this.fleeSpeed;
    }
    
    // Apply movement with collision detection
    this.applyMovement(deltaTime);
    
    // Drop book if carrying one (scared)
    if (this.carriedBook && Math.random() < 2.0 * deltaTime) { // 200% chance per second (almost immediately)
      this.dropBook();
    }
  }
  
  updateStealing(deltaTime) {
    if (!this.target || this.carriedBook) {
      this.state = 'wandering';
      return;
    }
    
    const state = this.game.stateManager.currentState;
    const player = state ? state.player : null;
    
    // Enhanced player proximity check with better avoidance
    if (player) {
      const distToPlayer = this.getDistanceTo(player);
      if (distToPlayer < this.playerDetectionRange) {
        // Track kid being repelled
        if (this.state !== 'fleeing') {
          this.game.gameData.kidsRepelled++;
        }
        this.state = 'fleeing';
        this.playLaughingSound();
        return;
      }
      
      // Proactive avoidance while stealing
      if (distToPlayer < this.playerDetectionRange * 1.3) {
        const dx = this.getCenterX() - player.getCenterX();
        const dy = this.getCenterY() - player.getCenterY();
        this.direction = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.3;
        this.vx = Math.cos(this.direction) * this.speed;
        this.vy = Math.sin(this.direction) * this.speed;
        this.applyMovement(deltaTime);
        return;
      }
    }
    
    // Check if target shelf still has books
    if (!this.target.books.some(b => b !== null)) {
      this.state = 'wandering';
      this.target = null;
      return;
    }
    
    // Enhanced movement towards target shelf with better pathfinding
    const dx = this.target.getCenterX() - this.getCenterX();
    const dy = this.target.getCenterY() - this.getCenterY();
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Use larger proximity check for better shelf interaction
    if (!this.isNearShelf(this.target, 20)) { // Increased from 15 to 20 pixels
      // Move towards shelf with more direct pathing and obstacle avoidance
      this.direction = Math.atan2(dy, dx);
      
      // Add slight randomness to avoid getting stuck in straight lines
      this.direction += (Math.random() - 0.5) * 0.1;
      
      this.vx = Math.cos(this.direction) * this.speed;
      this.vy = Math.sin(this.direction) * this.speed;
      
      // Apply movement with enhanced collision detection
      this.applyMovement(deltaTime);
    } else {
      // Near shelf, stop moving and prepare to steal
      this.vx = 0;
      this.vy = 0;
      
      // Wait a moment then steal a book
      if (this.grabDelay <= 0) {
        this.grabDelay = this.grabDelayTime; // Grab delay based on aggression
      }
      
      this.grabDelay -= deltaTime;
      
      if (this.grabDelay <= 0) {
        const book = this.target.removeRandomBook();
        if (book) {
          // Book has already been removed from shelf and unshelved
          // More aggressive kids are more likely to carry books
          const carryChance = this.aggressionLevel === 1 ? 0.4 : 
                             this.aggressionLevel === 2 ? 0.6 : 0.8; // Increased carry chances
          
          if (Math.random() < carryChance) {
            // Pick it up and carry it
            this.carriedBook = book;
            book.isHeld = true;
            book.holder = this;
            book.visible = true;
          } else {
            // Just knock it to the floor
            const dropDirection = Math.random() < 0.5 ? -1 : 1;
            book.x = dropDirection < 0 ? 
              this.target.x - book.width - 10 : 
              this.target.x + this.target.width + 10;
            book.y = this.target.y + this.target.height / 2;
            book.vx = dropDirection * (50 + Math.random() * 50);
            book.vy = Math.random() * 50 + 50;
            book.visible = true;
          }
          
          this.bookStealCooldown = this.bookStealCooldownTime;
          
          // More aggressive kids flee longer, less aggressive ones go back to wandering
          if (this.aggressionLevel >= 2) {
            this.state = 'fleeing';
          } else {
            this.state = 'wandering';
          }
        } else {
          // No books to steal, go back to wandering
          this.state = 'wandering';
          this.bookStealCooldown = 0.5; // Shorter cooldown for more aggressive behavior
        }
        this.target = null;
        this.grabDelay = 0;
      }
    }
  }
  
  render(ctx, interpolation) {
    // Get appropriate sprite based on sprite type and animation state
    let sprite;
    const spritePrefix = `kid${this.spriteType}`;
    
    if (this.isMoving) {
      // Use walking sprite when moving
      sprite = this.animationFrame === 0 
        ? this.game.assetLoader.getImage(`${spritePrefix}Stand`)
        : this.game.assetLoader.getImage(`${spritePrefix}Walk`);
    } else {
      // Use standing sprite when stationary
      sprite = this.game.assetLoader.getImage(`${spritePrefix}Stand`);
    }
    
    // Fallback to placeholder
    if (!sprite) {
      sprite = this.game.assetLoader.getImage('kid');
    }
    
    if (sprite) {
      // Calculate proper dimensions to maintain aspect ratio
      const targetHeight = this.height; // Keep height consistent
      const aspectRatio = sprite.width / sprite.height;
      const targetWidth = targetHeight * aspectRatio;
      
      // Center the sprite horizontally within the entity bounds
      const xOffset = (this.width - targetWidth) / 2;
      
      // Draw sprite with direction flipping and proper aspect ratio
      this.game.renderer.drawSprite(
        sprite,
        this.x + xOffset,
        this.y,
        targetWidth,
        targetHeight,
        {
          flipX: this.facing === 'right' // Flip when facing right
        }
      );
      
      // Draw skill effect overlays
      this.renderSkillEffects(ctx);
    } else {
      // Fallback rendering with aggression-based colors
      ctx.save();
      
      // Different colors based on aggression level
      if (this.aggressionLevel === 1) {
        ctx.fillStyle = '#ffa5a5'; // Light pink for easy kids
      } else if (this.aggressionLevel === 2) {
        ctx.fillStyle = '#ff6b6b'; // Normal red for normal kids
      } else {
        ctx.fillStyle = '#cc0000'; // Dark red for aggressive kids
      }
      
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      // Draw simple face
      ctx.fillStyle = '#000';
      ctx.fillRect(this.x + 6, this.y + 8, 4, 4); // Left eye
      ctx.fillRect(this.x + 14, this.y + 8, 4, 4); // Right eye
      
      // Mischievous smile (bigger for more aggressive)
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const smileRadius = 3 + this.aggressionLevel;
      ctx.arc(this.getCenterX(), this.y + 20, smileRadius, 0, Math.PI);
      ctx.stroke();
      
      // Add aggression indicators
      if (this.aggressionLevel >= 2) {
        // Angry eyebrows for normal/aggressive kids
        ctx.beginPath();
        ctx.moveTo(this.x + 4, this.y + 6);
        ctx.lineTo(this.x + 10, this.y + 8);
        ctx.moveTo(this.x + 20, this.y + 6);
        ctx.lineTo(this.x + 14, this.y + 8);
        ctx.stroke();
      }
      
      if (this.aggressionLevel === 3) {
        // Speed lines for aggressive kids
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x - 5, this.y + 10);
        ctx.lineTo(this.x - 2, this.y + 10);
        ctx.moveTo(this.x - 5, this.y + 16);
        ctx.lineTo(this.x - 2, this.y + 16);
        ctx.moveTo(this.x - 5, this.y + 22);
        ctx.lineTo(this.x - 2, this.y + 22);
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    // Draw carried book above head
    if (this.carriedBook) {
      // Center book above the kid's actual sprite (accounting for aspect ratio)
      this.carriedBook.x = this.getCenterX() - this.carriedBook.width / 2;
      this.carriedBook.y = this.y - this.carriedBook.height - 4;
      this.carriedBook.render(ctx, interpolation);
    }
  }
  
  dropBook() {
    if (this.carriedBook) {
      const book = this.carriedBook;
      book.isHeld = false;
      book.holder = null;
      book.isShelved = false; // CRITICAL: Ensure book is marked as not shelved
      book.visible = true; // Ensure book remains visible
      
      // Check if we're near any shelf and adjust drop position
      const state = this.game.stateManager.currentState;
      let dropX = this.x + (this.width - book.width) / 2;
      let dropY = this.y + this.height;
      
      if (state && state.shelves) {
        // Check against ALL shelves, not just the first collision
        const safetyMargin = 30; // Increased margin for safety
        
        for (const shelf of state.shelves) {
          // Check if the book's bounding box would overlap with shelf (with margin)
          const bookLeft = dropX;
          const bookRight = dropX + book.width;
          const bookTop = dropY;
          const bookBottom = dropY + book.height;
          
          const shelfLeft = shelf.x - safetyMargin;
          const shelfRight = shelf.x + shelf.width + safetyMargin;
          const shelfTop = shelf.y - safetyMargin;
          const shelfBottom = shelf.y + shelf.height + safetyMargin;
          
          // Check for overlap
          if (!(bookLeft > shelfRight || bookRight < shelfLeft || 
                bookTop > shelfBottom || bookBottom < shelfTop)) {
            // Book would overlap with shelf, find safe position
            
            // Calculate distances to each side of the shelf
            const leftDist = Math.abs(this.getCenterX() - shelf.x);
            const rightDist = Math.abs(this.getCenterX() - (shelf.x + shelf.width));
            const topDist = Math.abs(this.getCenterY() - shelf.y);
            const bottomDist = Math.abs(this.getCenterY() - (shelf.y + shelf.height));
            
            // Find the closest edge and drop book there
            const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
            
            if (minDist === leftDist) {
              dropX = shelf.x - book.width - safetyMargin;
            } else if (minDist === rightDist) {
              dropX = shelf.x + shelf.width + safetyMargin;
            } else if (minDist === topDist) {
              dropY = shelf.y - book.height - safetyMargin;
            } else {
              dropY = shelf.y + shelf.height + safetyMargin;
            }
          }
        }
      }
      
      // Ensure book is dropped within playable bounds
      if (state && state.worldWidth && state.worldHeight) {
        // Keep book at least 50 pixels from edges
        const margin = 50;
        dropX = Math.max(margin, Math.min(state.worldWidth - book.width - margin, dropX));
        dropY = Math.max(margin, Math.min(state.worldHeight - book.height - margin, dropY));
      }
      
      book.x = dropX;
      book.y = dropY;
      
      // Give book a little random velocity, but away from shelves
      // Start with small random velocity
      book.vx = (Math.random() - 0.5) * 50; // Reduced from 100
      book.vy = Math.random() * 25 + 25; // Reduced from 50+50
      
      // If we adjusted position due to a shelf, add velocity away from it
      if (state && state.shelves) {
        for (const shelf of state.shelves) {
          const distToShelf = Math.sqrt(
            Math.pow(dropX + book.width/2 - (shelf.x + shelf.width/2), 2) +
            Math.pow(dropY + book.height/2 - (shelf.y + shelf.height/2), 2)
          );
          
          if (distToShelf < 100) { // If close to a shelf
            // Add velocity away from shelf center
            const awayX = (dropX + book.width/2) - (shelf.x + shelf.width/2);
            const awayY = (dropY + book.height/2) - (shelf.y + shelf.height/2);
            const awayDist = Math.sqrt(awayX * awayX + awayY * awayY);
            
            if (awayDist > 0) {
              book.vx += (awayX / awayDist) * 30;
              book.vy += (awayY / awayDist) * 30;
            }
          }
        }
      }
      
      this.carriedBook = null;
    }
  }
  
  renderSkillEffects(ctx) {
    const centerX = this.getCenterX();
    const centerY = this.getCenterY();
    
    // Stun effect - spinning stars
    if (this.stunned) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#ffff00';
      
      // Draw spinning stars around the kid
      const starCount = 4;
      const radius = 25;
      const time = Date.now() * 0.005;
      
      for (let i = 0; i < starCount; i++) {
        const angle = (i / starCount) * Math.PI * 2 + time;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        // Draw star
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
    
    // Silence effect - crossed out mouth
    if (this.silenced) {
      ctx.save();
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      
      // Draw X over the kid's mouth area
      const mouthX = centerX;
      const mouthY = centerY + 10;
      
      ctx.beginPath();
      ctx.moveTo(mouthX - 8, mouthY - 8);
      ctx.lineTo(mouthX + 8, mouthY + 8);
      ctx.moveTo(mouthX + 8, mouthY - 8);
      ctx.lineTo(mouthX - 8, mouthY + 8);
      ctx.stroke();
      
      ctx.restore();
    }
    
    // Slow effect - blue aura
    if (this.slowed) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#0088ff';
      ctx.lineWidth = 2;
      
      // Draw pulsing circle
      const pulseScale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
      const radius = 20 * pulseScale;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.restore();
    }
  }
  
  getDistanceTo(entity) {
    const dx = this.getCenterX() - entity.getCenterX();
    const dy = this.getCenterY() - entity.getCenterY();
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  applyMovement(deltaTime) {
    const state = this.game.stateManager.currentState;
    if (!state || !state.shelves) {
      // No collision detection available, just move
      this.x += this.vx * deltaTime;
      this.y += this.vy * deltaTime;
      return;
    }
    
    // Calculate movement speed based on state and effects
    let currentSpeed = this.speed;
    if (this.state === 'fleeing') {
      currentSpeed = this.fleeSpeed;
    }
    
    // Apply chaos-based speed multiplier
    currentSpeed *= this.speedMultiplier;
    
    // Apply slow effect
    if (this.slowed) {
      currentSpeed *= this.slowFactor;
    }
    
    // Recalculate velocity with current speed
    this.vx = Math.cos(this.direction) * currentSpeed;
    this.vy = Math.sin(this.direction) * currentSpeed;
    
    // Calculate new position
    const newX = this.x + this.vx * deltaTime;
    const newY = this.y + this.vy * deltaTime;
    
    // Enhanced collision detection with larger radius
    let canMoveX = true;
    let canMoveY = true;
    let blockedShelves = [];
    const checkRadius = 200; // Increased radius for better detection
    
    for (const shelf of state.shelves) {
      // Quick bounds check
      if (Math.abs(shelf.x - this.x) > checkRadius || 
          Math.abs(shelf.y - this.y) > checkRadius) {
        continue;
      }
      
      // Check X movement with more precise collision
      if (canMoveX && this.checkCollision(newX, this.y, shelf)) {
        canMoveX = false;
        blockedShelves.push(shelf);
      }
      // Check Y movement with more precise collision
      if (canMoveY && this.checkCollision(this.x, newY, shelf)) {
        canMoveY = false;
        blockedShelves.push(shelf);
      }
    }
    
    // Apply movement if no collision
    if (canMoveX) {
      this.x = newX;
    }
    
    if (canMoveY) {
      this.y = newY;
    }
    
    // Enhanced pathfinding when blocked
    if (!canMoveX && !canMoveY) {
      this.findPathAroundObstacles(blockedShelves, deltaTime);
    } else if (!canMoveX || !canMoveY) {
      // Only one direction blocked, try to slide along the obstacle
      this.slideAlongObstacle(canMoveX, canMoveY, deltaTime);
    }
    
    // Check if stuck and unstuck if necessary
    this.checkIfStuck();
  }
  
  findPathAroundObstacles(blockedShelves, deltaTime) {
    if (blockedShelves.length === 0) return;
    
    // Find the closest edge of the nearest obstacle with better pathfinding
    let bestDirection = null;
    let bestDistance = Infinity;
    const state = this.game.stateManager.currentState;
    
    for (const shelf of blockedShelves) {
      // Check all four sides of the shelf with more precision
      const sides = [
        { x: shelf.x - this.width - 5, y: this.y, name: 'left' },
        { x: shelf.x + shelf.width + 5, y: this.y, name: 'right' },
        { x: this.x, y: shelf.y - this.height - 5, name: 'top' },
        { x: this.x, y: shelf.y + shelf.height + 5, name: 'bottom' }
      ];
      
      for (const side of sides) {
        // Check if this path is clear of ALL shelves
        let isClear = true;
        for (const otherShelf of state.shelves) {
          if (this.checkCollision(side.x, side.y, otherShelf)) {
            isClear = false;
            break;
          }
        }
        
        if (isClear) {
          const distance = Math.sqrt(
            Math.pow(side.x - this.x, 2) + Math.pow(side.y - this.y, 2)
          );
          
          if (distance < bestDistance) {
            bestDistance = distance;
            bestDirection = Math.atan2(side.y - this.y, side.x - this.x);
          }
        }
      }
    }
    
    if (bestDirection !== null) {
      // Move toward the best path
      this.direction = bestDirection;
      const speed = this.state === 'fleeing' ? this.fleeSpeed : this.speed;
      this.vx = Math.cos(this.direction) * speed;
      this.vy = Math.sin(this.direction) * speed;
      
      // Apply movement
      this.x += this.vx * deltaTime;
      this.y += this.vy * deltaTime;
    } else {
      // No clear path found, try random direction with more attempts
      for (let attempt = 0; attempt < 8; attempt++) {
        const testDirection = Math.random() * Math.PI * 2;
        const testX = this.x + Math.cos(testDirection) * this.speed * deltaTime;
        const testY = this.y + Math.sin(testDirection) * this.speed * deltaTime;
        
        let isClear = true;
        for (const shelf of state.shelves) {
          if (this.checkCollision(testX, testY, shelf)) {
            isClear = false;
            break;
          }
        }
        
        if (isClear) {
          this.direction = testDirection;
          this.vx = Math.cos(this.direction) * this.speed;
          this.vy = Math.sin(this.direction) * this.speed;
          this.x = testX;
          this.y = testY;
          break;
        }
      }
    }
  }
  
  slideAlongObstacle(canMoveX, canMoveY, deltaTime) {
    // If we can move in one direction, try to slide along the obstacle
    if (canMoveX) {
      // Can move horizontally, try to slide up or down
      const upY = this.y - this.speed * deltaTime;
      const downY = this.y + this.speed * deltaTime;
      
      // Check if we can move up or down
      const state = this.game.stateManager.currentState;
      let canMoveUp = true;
      let canMoveDown = true;
      
      for (const shelf of state.shelves) {
        if (this.checkCollision(this.x, upY, shelf)) canMoveUp = false;
        if (this.checkCollision(this.x, downY, shelf)) canMoveDown = false;
      }
      
      if (canMoveUp) {
        this.y = upY;
        this.direction = -Math.PI / 2; // Up
      } else if (canMoveDown) {
        this.y = downY;
        this.direction = Math.PI / 2; // Down
      }
    } else if (canMoveY) {
      // Can move vertically, try to slide left or right
      const leftX = this.x - this.speed * deltaTime;
      const rightX = this.x + this.speed * deltaTime;
      
      // Check if we can move left or right
      const state = this.game.stateManager.currentState;
      let canMoveLeft = true;
      let canMoveRight = true;
      
      for (const shelf of state.shelves) {
        if (this.checkCollision(leftX, this.y, shelf)) canMoveLeft = false;
        if (this.checkCollision(rightX, this.y, shelf)) canMoveRight = false;
      }
      
      if (canMoveLeft) {
        this.x = leftX;
        this.direction = Math.PI; // Left
      } else if (canMoveRight) {
        this.x = rightX;
        this.direction = 0; // Right
      }
    }
  }
  
  checkIfStuck() {
    // Check if kid has been in roughly the same position for too long
    if (!this.lastPosition) {
      this.lastPosition = { x: this.x, y: this.y };
      this.stuckTimer = 0;
      return;
    }
    
    const distance = Math.sqrt(
      Math.pow(this.x - this.lastPosition.x, 2) + 
      Math.pow(this.y - this.lastPosition.y, 2)
    );
    
    if (distance < 5) { // Stuck if moved less than 5 pixels
      this.stuckTimer += 0.016; // Assuming 60fps
      
      if (this.stuckTimer > 2.0) { // Stuck for 2 seconds
        this.getUnstuck();
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
    }
    
    this.lastPosition = { x: this.x, y: this.y };
  }
  
  isNearShelf(shelf, distance) {
    // Check if kid is within distance of any edge of the shelf
    const kidLeft = this.x;
    const kidRight = this.x + this.width;
    const kidTop = this.y;
    const kidBottom = this.y + this.height;
    
    const shelfLeft = shelf.x;
    const shelfRight = shelf.x + shelf.width;
    const shelfTop = shelf.y;
    const shelfBottom = shelf.y + shelf.height;
    
    // Expand shelf bounds by distance
    const expandedLeft = shelfLeft - distance;
    const expandedRight = shelfRight + distance;
    const expandedTop = shelfTop - distance;
    const expandedBottom = shelfBottom + distance;
    
    // Check if kid overlaps with expanded bounds
    return !(kidLeft >= expandedRight || 
             kidRight <= expandedLeft || 
             kidTop >= expandedBottom || 
             kidBottom <= expandedTop);
  }
  
  checkCollision(x, y, entity) {
    // Check if entity has a collision box
    if (!entity.collisionBox) {
      return false;
    }
    
    // Calculate kid's bounds at new position
    const kidLeft = x;
    const kidRight = x + this.width;
    const kidTop = y;
    const kidBottom = y + this.height;
    
    // Calculate entity's collision bounds
    const entityLeft = entity.x + entity.collisionBox.offsetX;
    const entityRight = entityLeft + entity.collisionBox.width;
    const entityTop = entity.y + entity.collisionBox.offsetY;
    const entityBottom = entityTop + entity.collisionBox.height;
    
    // Check for overlap
    return !(kidLeft >= entityRight || 
             kidRight <= entityLeft || 
             kidTop >= entityBottom || 
             kidBottom <= entityTop);
  }
  
  getUnstuck() {
    const state = this.game.stateManager.currentState;
    if (!state) return;
    
    // If near edges, move towards center
    if (state.worldWidth && state.worldHeight) {
      const centerX = state.worldWidth / 2;
      const centerY = state.worldHeight / 2;
      
      // Calculate direction towards center
      const dx = centerX - this.x;
      const dy = centerY - this.y;
      this.direction = Math.atan2(dy, dx);
      
      // Add some randomness
      this.direction += (Math.random() - 0.5) * Math.PI / 4;
      
      // Force movement
      this.vx = Math.cos(this.direction) * this.speed;
      this.vy = Math.sin(this.direction) * this.speed;
      
      // Try to teleport slightly if really stuck
      if (this.x < 50 || this.x > state.worldWidth - 50 - this.width ||
          this.y < 50 || this.y > state.worldHeight - 50 - this.height) {
        this.x = Math.max(100, Math.min(state.worldWidth - 100 - this.width, this.x));
        this.y = Math.max(100, Math.min(state.worldHeight - 100 - this.height, this.y));
      }
    }
    
    // Reset state to wandering
    this.state = 'wandering';
    this.target = null;
  }
  
  playLaughingSound() {
    if (!this.hasPlayedLaughSound) {
      const laughSounds = ['kid_laughing_1', 'kid_laughing_2', 'kid_laughing_3'];
      const randomSound = laughSounds[Math.floor(Math.random() * laughSounds.length)];
      const audio = new Audio(`/${randomSound}.mp3`);
      audio.volume = 0.4;
      audio.play().catch(e => console.log('Laugh sound play failed:', e));
      this.hasPlayedLaughSound = true;
    }
  }
  
  switchToStealing() {
    if (this.state !== 'stealing' && !this.stunned) {
      this.state = 'stealing';
      this.target = null; // Will be set in updateStealing
      
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`[KID BEHAVIOR] Kid switched to stealing state (aggression: ${this.aggressionLevel})`);
      }
    }
  }
}