export class SkillSystem {
  constructor(game) {
    this.game = game;
    this.skills = new Map();
    this.activeEffects = [];
    this.projectiles = [];
    this.particles = [];
    
    // Skill definitions
    this.skillDefinitions = {
      shushWave: {
        name: 'Shush Wave',
        cooldown: 8,
        range: 120,
        angle: Math.PI / 3, // 60 degrees
        damage: 0, // No damage, just knockback
        stunDuration: 2,
        knockbackForce: 200,
        icon: '🤫'
      },
      bookmarkBoomerang: {
        name: 'Bookmark Boomerang',
        cooldown: 12,
        range: 200,
        speed: 150,
        returnSpeed: 200,
        damage: 0,
        silenceDuration: 3,
        icon: '📖'
      },
      dustCloud: {
        name: 'Dust Cloud',
        cooldown: 15,
        range: 80,
        duration: 5,
        slowFactor: 0.5,
        icon: '💨'
      }
    };
  }
  
  initializeSkills(player) {
    // Initialize all skills with cooldowns
    Object.keys(this.skillDefinitions).forEach(skillId => {
      this.skills.set(skillId, {
        ...this.skillDefinitions[skillId],
        currentCooldown: 0,
        level: player.upgradeLevels?.[skillId] || 0
      });
    });
  }
  
  update(deltaTime) {
    // Update skill cooldowns
    for (const skill of this.skills.values()) {
      if (skill.currentCooldown > 0) {
        skill.currentCooldown -= deltaTime;
      }
    }
    
    // Update active effects
    this.activeEffects = this.activeEffects.filter(effect => {
      effect.duration -= deltaTime;
      return effect.duration > 0;
    });
    
    // Update projectiles
    this.projectiles = this.projectiles.filter(projectile => {
      projectile.update(deltaTime);
      return projectile.isActive;
    });
    
    // Update particles
    this.particles = this.particles.filter(particle => {
      particle.age += deltaTime;
      return particle.age < particle.lifetime;
    });
  }
  
  canUseSkill(skillId) {
    const skill = this.skills.get(skillId);
    return skill && skill.currentCooldown <= 0 && skill.level > 0;
  }
  
  useSkill(skillId, player, targetX, targetY) {
    if (!this.canUseSkill(skillId)) return false;
    
    const skill = this.skills.get(skillId);
    if (!skill) return false;
    
    // Get chaos-based bonuses
    const chaosRatio = this.game.gameData.chaosLevel / this.game.gameData.maxChaos;
    const chaosBonus = this.calculateChaosBonus(chaosRatio);
    
    // Set cooldown (reduced by chaos bonus)
    skill.currentCooldown = skill.cooldown * (1 - chaosBonus.cooldownReduction);
    
    // Execute skill with chaos bonuses
    switch (skillId) {
      case 'shushWave':
        this.executeShushWave(player, targetX, targetY, skill, chaosBonus);
        break;
      case 'bookmarkBoomerang':
        this.executeBookmarkBoomerang(player, targetX, targetY, skill, chaosBonus);
        break;
      case 'dustCloud':
        this.executeDustCloud(player, targetX, targetY, skill, chaosBonus);
        break;
    }
    
    // Award XP for skill usage
    this.awardSkillXP(skillId, chaosBonus);
    
    return true;
  }
  
  calculateChaosBonus(chaosRatio) {
    // High chaos makes skills more powerful
    let bonus = {
      range: 1.0,
      duration: 1.0,
      effectiveness: 1.0,
      cooldownReduction: 0.0
    };
    
    if (chaosRatio > 0.8) {
      // High chaos: significant bonuses
      bonus.range = 1.3;
      bonus.duration = 1.4;
      bonus.effectiveness = 1.5;
      bonus.cooldownReduction = 0.2;
    } else if (chaosRatio > 0.6) {
      // Medium chaos: moderate bonuses
      bonus.range = 1.15;
      bonus.duration = 1.2;
      bonus.effectiveness = 1.25;
      bonus.cooldownReduction = 0.1;
    } else if (chaosRatio > 0.4) {
      // Low chaos: small bonuses
      bonus.range = 1.05;
      bonus.duration = 1.1;
      bonus.effectiveness = 1.1;
      bonus.cooldownReduction = 0.05;
    }
    
    return bonus;
  }
  
  awardSkillXP(skillId, chaosBonus) {
    // Award XP for using skills, more when chaos is high
    const baseXP = 5;
    const chaosMultiplier = 1 + (chaosBonus.effectiveness - 1) * 0.5;
    const xpGained = Math.round(baseXP * chaosMultiplier);
    
    // Award XP to the game
    if (this.game.stateManager.currentState && this.game.stateManager.currentState.awardXP) {
      this.game.stateManager.currentState.awardXP(xpGained);
    }
  }
  
  executeShushWave(player, targetX, targetY, skill, chaosBonus) {
    const playerCenterX = player.getCenterX();
    const playerCenterY = player.getCenterY();
    
    // Apply chaos bonuses
    const enhancedRange = skill.range * chaosBonus.range;
    const enhancedAngle = skill.angle * chaosBonus.range; // Wider cone
    const enhancedKnockback = skill.knockbackForce * chaosBonus.effectiveness;
    const enhancedStunDuration = skill.stunDuration * chaosBonus.duration;
    
    // Calculate direction to target
    const dx = targetX - playerCenterX;
    const dy = targetY - playerCenterY;
    const angle = Math.atan2(dy, dx);
    
    // Create cone effect with enhanced particles
    const coneParticles = [];
    const particleCount = Math.floor(20 * chaosBonus.effectiveness);
    
    for (let i = 0; i < particleCount; i++) {
      const particleAngle = angle + (Math.random() - 0.5) * enhancedAngle;
      const distance = Math.random() * enhancedRange;
      const speed = 100 + Math.random() * 100;
      
      coneParticles.push({
        x: playerCenterX,
        y: playerCenterY,
        vx: Math.cos(particleAngle) * speed,
        vy: Math.sin(particleAngle) * speed,
        lifetime: 0.8 * chaosBonus.duration,
        age: 0,
        size: 3 + Math.random() * 3
      });
    }
    
    this.particles.push(...coneParticles);
    
    // Affect kids in cone
    const playingState = this.game.stateManager.getState('playing');
    if (playingState) {
      for (const kid of playingState.kids) {
        const kidCenterX = kid.getCenterX();
        const kidCenterY = kid.getCenterY();
        
        // Check distance with enhanced range
        const distance = Math.sqrt(
          Math.pow(kidCenterX - playerCenterX, 2) +
          Math.pow(kidCenterY - playerCenterY, 2)
        );
        
        if (distance <= enhancedRange) {
          // Check if kid is in cone with enhanced angle
          const kidAngle = Math.atan2(kidCenterY - playerCenterY, kidCenterX - playerCenterX);
          const angleDiff = Math.abs(kidAngle - angle);
          const normalizedAngleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
          
          if (normalizedAngleDiff <= enhancedAngle / 2) {
            // Apply enhanced knockback
            const knockbackAngle = Math.atan2(kidCenterY - playerCenterY, kidCenterX - playerCenterX);
            kid.vx = Math.cos(knockbackAngle) * enhancedKnockback;
            kid.vy = Math.sin(knockbackAngle) * enhancedKnockback;
            
            // Apply enhanced stun
            kid.stunned = true;
            kid.stunTimer = enhancedStunDuration;
            
            // Drop carried book if any
            if (kid.carriedBook) {
              kid.dropBook();
            }
            
            // Award extra XP for hitting kids
            this.awardSkillXP('shushWave', chaosBonus);
          }
        }
      }
    }
    
    // Play sound effect
    this.playSkillSound('shush');
  }
  
  executeBookmarkBoomerang(player, targetX, targetY, skill, chaosBonus) {
    const playerCenterX = player.getCenterX();
    const playerCenterY = player.getCenterY();
    
    // Apply chaos bonuses to skill
    const enhancedSkill = {
      ...skill,
      range: skill.range * chaosBonus.range,
      speed: skill.speed * chaosBonus.effectiveness,
      returnSpeed: skill.returnSpeed * chaosBonus.effectiveness,
      silenceDuration: skill.silenceDuration * chaosBonus.duration
    };
    
    // Create boomerang projectile with enhanced stats
    const projectile = new BookmarkBoomerang(
      this.game,
      playerCenterX,
      playerCenterY,
      targetX,
      targetY,
      enhancedSkill,
      player
    );
    
    this.projectiles.push(projectile);
    
    // Play sound effect
    this.playSkillSound('bookmark');
  }
  
  executeDustCloud(player, targetX, targetY, skill, chaosBonus) {
    const playerCenterX = player.getCenterX();
    const playerCenterY = player.getCenterY();
    
    // Apply chaos bonuses
    const enhancedRange = skill.range * chaosBonus.range;
    const enhancedDuration = skill.duration * chaosBonus.duration;
    const enhancedSlowFactor = Math.max(0.1, skill.slowFactor / chaosBonus.effectiveness); // Better slow
    
    // Create dust cloud effect
    const cloudParticles = [];
    const particleCount = Math.floor(30 * chaosBonus.effectiveness);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * enhancedRange;
      const speed = 20 + Math.random() * 30;
      
      cloudParticles.push({
        x: playerCenterX + Math.cos(angle) * distance,
        y: playerCenterY + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        lifetime: enhancedDuration,
        age: 0,
        size: 2 + Math.random() * 4
      });
    }
    
    this.particles.push(...cloudParticles);
    
    // Create slow effect area
    this.activeEffects.push({
      type: 'dustCloud',
      x: playerCenterX,
      y: playerCenterY,
      range: enhancedRange,
      duration: enhancedDuration,
      slowFactor: enhancedSlowFactor
    });
    
    // Affect kids in range
    const playingState = this.game.stateManager.getState('playing');
    if (playingState) {
      for (const kid of playingState.kids) {
        const kidCenterX = kid.getCenterX();
        const kidCenterY = kid.getCenterY();
        
        const distance = Math.sqrt(
          Math.pow(kidCenterX - playerCenterX, 2) +
          Math.pow(kidCenterY - playerCenterY, 2)
        );
        
        if (distance <= enhancedRange) {
          // Apply slow effect
          kid.slowed = true;
          kid.slowTimer = enhancedDuration;
          kid.slowFactor = enhancedSlowFactor;
          
          // Award XP for affecting kids
          this.awardSkillXP('dustCloud', chaosBonus);
        }
      }
    }
    
    // Play sound effect
    this.playSkillSound('dust');
  }
  
  playSkillSound(skillType) {
    // Create skill sound effects
    const sounds = {
      shush: '/uh_oh.mp3',
      bookmark: '/pickup_book.mp3',
      dust: '/out_of_breath.mp3'
    };
    
    const soundFile = sounds[skillType];
    if (soundFile) {
      const audio = new Audio(soundFile);
      audio.volume = 0.4;
      audio.play().catch(e => console.log('Skill sound play failed:', e));
    }
  }
  
  render(ctx) {
    // Render active effects
    for (const effect of this.activeEffects) {
      if (effect.type === 'slowZone') {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#8888ff';
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    
    // Render projectiles
    for (const projectile of this.projectiles) {
      projectile.render(ctx);
    }
    
    // Render particles
    for (const particle of this.particles) {
      ctx.save();
      
      const alpha = 1 - (particle.age / particle.lifetime);
      ctx.globalAlpha = alpha;
      
      if (particle.type === 'dust') {
        ctx.fillStyle = '#cccccc';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
  }
  
  getSkillCooldown(skillId) {
    const skill = this.skills.get(skillId);
    return skill ? skill.currentCooldown : 0;
  }
  
  getSkillLevel(skillId) {
    const skill = this.skills.get(skillId);
    return skill ? skill.level : 0;
  }
}

// Bookmark Boomerang Projectile Class
class BookmarkBoomerang {
  constructor(game, startX, startY, targetX, targetY, skill, owner) {
    this.game = game;
    this.x = startX;
    this.y = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.skill = skill;
    this.owner = owner;
    this.isActive = true;
    
    // Calculate initial velocity
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    this.vx = Math.cos(angle) * skill.speed;
    this.vy = Math.sin(angle) * skill.speed;
    
    // Boomerang properties
    this.maxDistance = distance;
    this.distanceTraveled = 0;
    this.returning = false;
    this.rotation = 0;
    this.rotationSpeed = 720; // degrees per second
    
    // Hit detection
    this.hitKids = new Set();
  }
  
  update(deltaTime) {
    if (!this.isActive) return;
    
    // Update rotation
    this.rotation += this.rotationSpeed * deltaTime;
    
    // Calculate distance from start
    const dx = this.x - this.owner.getCenterX();
    const dy = this.y - this.owner.getCenterY();
    this.distanceTraveled = Math.sqrt(dx * dx + dy * dy);
    
    // Check if should return
    if (!this.returning && this.distanceTraveled >= this.maxDistance) {
      this.returning = true;
    }
    
    // Update velocity based on state
    if (this.returning) {
      // Return to owner
      const ownerX = this.owner.getCenterX();
      const ownerY = this.owner.getCenterY();
      const returnDx = ownerX - this.x;
      const returnDy = ownerY - this.y;
      const returnDistance = Math.sqrt(returnDx * returnDx + returnDy * returnDy);
      
      if (returnDistance < 20) {
        // Reached owner, deactivate
        this.isActive = false;
        return;
      }
      
      const returnAngle = Math.atan2(returnDy, returnDx);
      this.vx = Math.cos(returnAngle) * this.skill.returnSpeed;
      this.vy = Math.sin(returnAngle) * this.skill.returnSpeed;
    }
    
    // Update position
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    
    // Check for hits
    this.checkHits();
  }
  
  checkHits() {
    const playingState = this.game.stateManager.getState('playing');
    if (!playingState) return;
    
    for (const kid of playingState.kids) {
      // Skip if already hit
      if (this.hitKids.has(kid)) continue;
      
      // Check collision
      const dx = this.x - kid.getCenterX();
      const dy = this.y - kid.getCenterY();
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 20) {
        // Hit the kid
        this.hitKids.add(kid);
        
        // Apply silence effect
        kid.silenced = true;
        kid.silenceTimer = this.skill.silenceDuration;
        
        // Drop carried book
        if (kid.carriedBook) {
          kid.dropBook();
        }
        
        // Create hit particle
        this.game.skillSystem.particles.push({
          x: this.x,
          y: this.y,
          vx: (Math.random() - 0.5) * 50,
          vy: (Math.random() - 0.5) * 50,
          lifetime: 0.5,
          age: 0,
          size: 4,
          type: 'hit'
        });
      }
    }
  }
  
  render(ctx) {
    ctx.save();
    
    // Move to boomerang position
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation * Math.PI / 180);
    
    // Draw boomerang
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-8, -2, 16, 4);
    
    // Draw bookmark details
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-6, -1, 12, 2);
    
    ctx.restore();
  }
} 