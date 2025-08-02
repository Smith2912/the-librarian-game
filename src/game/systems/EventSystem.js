export class EventSystem {
  constructor(game) {
    this.game = game;
    this.events = [];
    this.activeEvents = [];
    this.eventTimer = 0;
    this.eventInterval = 300; // 5 minutes in seconds
    
    // Define special events
    this.eventDefinitions = {
      fieldTrip: {
        name: 'Field Trip Chaperone',
        description: 'A chaperone arrives and knocks 10 books instantly!',
        triggerTime: 720, // 12 minutes
        duration: 30,
        effect: (playingState) => {
          // Knock 10 random books from shelves
          const shelves = playingState.shelves;
          let booksKnocked = 0;
          
          for (const shelf of shelves) {
            if (booksKnocked >= 10) break;
            
            const booksInShelf = shelf.books.length;
            const booksToKnock = Math.min(booksInShelf, 10 - booksKnocked);
            
            for (let i = 0; i < booksToKnock; i++) {
              const book = shelf.removeRandomBook();
              if (book) {
                // Drop book randomly near the shelf
                const angle = Math.random() * Math.PI * 2;
                const distance = 50 + Math.random() * 100;
                book.x = shelf.x + Math.cos(angle) * distance;
                book.y = shelf.y + Math.sin(angle) * distance;
                book.vx = (Math.random() - 0.5) * 100;
                book.vy = Math.random() * 50 + 50;
                book.visible = true;
                booksKnocked++;
              }
            }
          }
          
          // Increase chaos significantly
          this.game.gameData.chaosLevel += 20;
          
          // Play special sound
          this.playEventSound('fieldTrip');
        }
      },
      
      substituteTeacher: {
        name: 'Substitute Teacher',
        description: 'A substitute teacher spawns 5 kids per 10% HP lost!',
        triggerTime: 1500, // 25 minutes
        duration: 60,
        effect: async (playingState) => {
          // Spawn additional kids based on chaos level
          const chaosPercent = this.game.gameData.chaosLevel / this.game.gameData.maxChaos;
          const additionalKids = Math.floor(chaosPercent * 10) + 3; // 3-13 kids
          
          for (let i = 0; i < additionalKids; i++) {
            const spawnPoint = playingState.spawnPoints[Math.floor(Math.random() * playingState.spawnPoints.length)];
            const kid = new (await import('../entities/Kid.js')).Kid(this.game, spawnPoint.x, spawnPoint.y, 3); // Aggressive
            playingState.kids.push(kid);
          }
          
          // Increase max kids temporarily
          playingState.maxKids += additionalKids;
          
          // Play special sound
          this.playEventSound('substitute');
        }
      },
      
      snackSmugglers: {
        name: 'Snack Smugglers',
        description: 'Kids leave sticky puddles that slow you down!',
        triggerTime: 480, // 8 minutes
        duration: 45,
        effect: async (playingState) => {
          // Create sticky puddles around the library
          const puddleCount = 5;
          for (let i = 0; i < puddleCount; i++) {
            const puddle = {
              x: 100 + Math.random() * (playingState.worldWidth - 200),
              y: 100 + Math.random() * (playingState.worldHeight - 200),
              radius: 40 + Math.random() * 20,
              duration: 45,
              age: 0
            };
            playingState.stickyPuddles = playingState.stickyPuddles || [];
            playingState.stickyPuddles.push(puddle);
          }
          
          // Play special sound
          this.playEventSound('snack');
        }
      },
      
      paperAirplanes: {
        name: 'Paper Airplanes',
        description: 'Gamers throw paper airplanes that distract you!',
        triggerTime: 900, // 15 minutes
        duration: 40,
        effect: async (playingState) => {
          // Create paper airplane projectiles
          const airplaneCount = 8;
          for (let i = 0; i < airplaneCount; i++) {
            const airplane = {
              x: Math.random() * playingState.worldWidth,
              y: Math.random() * playingState.worldHeight,
              vx: (Math.random() - 0.5) * 200,
              vy: (Math.random() - 0.5) * 200,
              lifetime: 10,
              age: 0,
              size: 8
            };
            playingState.paperAirplanes = playingState.paperAirplanes || [];
            playingState.paperAirplanes.push(airplane);
          }
          
          // Play special sound
          this.playEventSound('airplane');
        }
      },
      
      tornadoToddlers: {
        name: 'Tornado Toddlers',
        description: 'High-speed toddlers create chaos!',
        triggerTime: 1200, // 20 minutes
        duration: 35,
        effect: async (playingState) => {
          // Spawn high-speed kids
          const tornadoKids = 4;
          for (let i = 0; i < tornadoKids; i++) {
            const spawnPoint = playingState.spawnPoints[Math.floor(Math.random() * playingState.spawnPoints.length)];
            const kid = new (await import('../entities/Kid.js')).Kid(this.game, spawnPoint.x, spawnPoint.y, 3);
            kid.speed *= 1.5; // 50% faster
            kid.fleeSpeed *= 1.5;
            kid.tornadoMode = true; // Special flag for visual effects
            playingState.kids.push(kid);
          }
          
          // Play special sound
          this.playEventSound('tornado');
        }
      }
    };
  }
  
  update(deltaTime) {
    const playingState = this.game.stateManager.getState('playing');
    if (!playingState) return;
    
    // Update event timer
    this.eventTimer += deltaTime;
    
    // Check for event triggers
    const gameTime = this.game.gameData.elapsedTime;
    
    for (const [eventId, eventDef] of Object.entries(this.eventDefinitions)) {
      if (gameTime >= eventDef.triggerTime && !this.hasEventOccurred(eventId)) {
        this.triggerEvent(eventId, playingState).catch(error => {
          console.error('Error triggering event:', error);
        });
      }
    }
    
    // Update active events
    this.activeEvents = this.activeEvents.filter(event => {
      event.duration -= deltaTime;
      return event.duration > 0;
    });
    
    // Update sticky puddles
    if (playingState.stickyPuddles) {
      playingState.stickyPuddles = playingState.stickyPuddles.filter(puddle => {
        puddle.age += deltaTime;
        return puddle.age < puddle.duration;
      });
    }
    
    // Update paper airplanes
    if (playingState.paperAirplanes) {
      playingState.paperAirplanes = playingState.paperAirplanes.filter(airplane => {
        airplane.age += deltaTime;
        airplane.x += airplane.vx * deltaTime;
        airplane.y += airplane.vy * deltaTime;
        
        // Bounce off walls
        if (airplane.x <= 0 || airplane.x >= playingState.worldWidth) {
          airplane.vx = -airplane.vx;
        }
        if (airplane.y <= 0 || airplane.y >= playingState.worldHeight) {
          airplane.vy = -airplane.vy;
        }
        
        return airplane.age < airplane.lifetime;
      });
    }
    
    // Check player collision with sticky puddles
    if (playingState.stickyPuddles && playingState.player) {
      for (const puddle of playingState.stickyPuddles) {
        const distance = Math.sqrt(
          Math.pow(playingState.player.getCenterX() - puddle.x, 2) +
          Math.pow(playingState.player.getCenterY() - puddle.y, 2)
        );
        
        if (distance < puddle.radius) {
          // Slow player down
          playingState.player.stats.moveSpeed *= 0.7;
          break;
        }
      }
    }
  }
  
  async triggerEvent(eventId, playingState) {
    const eventDef = this.eventDefinitions[eventId];
    if (!eventDef) return;
    
    // Execute event effect
    await eventDef.effect(playingState);
    
    // Mark event as occurred
    this.events.push(eventId);
    
    // Add to active events
    this.activeEvents.push({
      id: eventId,
      name: eventDef.name,
      duration: eventDef.duration
    });
    
    // Show event notification
    this.showEventNotification(eventDef.name, eventDef.description);
    
    console.log(`[EVENT SYSTEM] Triggered: ${eventDef.name}`);
  }
  
  hasEventOccurred(eventId) {
    return this.events.includes(eventId);
  }
  
  showEventNotification(title, description) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      z-index: 1000;
      font-family: Arial, sans-serif;
      max-width: 400px;
    `;
    
    notification.innerHTML = `
      <h2 style="color: #ff6b6b; margin: 0 0 10px 0;">${title}</h2>
      <p style="margin: 0;">${description}</p>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
  
  playEventSound(eventType) {
    const sounds = {
      fieldTrip: '/uh_oh.mp3',
      substitute: '/kid_laughing_1.mp3',
      snack: '/pickup_book.mp3',
      airplane: '/out_of_breath.mp3',
      tornado: '/yay.mp3'
    };
    
    const soundFile = sounds[eventType];
    if (soundFile) {
      const audio = new Audio(soundFile);
      audio.volume = 0.6;
      audio.play().catch(e => console.log('Event sound play failed:', e));
    }
  }
  
  render(ctx) {
    const playingState = this.game.stateManager.getState('playing');
    if (!playingState) return;
    
    // Render sticky puddles
    if (playingState.stickyPuddles) {
      for (const puddle of playingState.stickyPuddles) {
        ctx.save();
        
        const alpha = 1 - (puddle.age / puddle.duration);
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = '#8B4513';
        
        ctx.beginPath();
        ctx.arc(puddle.x, puddle.y, puddle.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }
    }
    
    // Render paper airplanes
    if (playingState.paperAirplanes) {
      for (const airplane of playingState.paperAirplanes) {
        ctx.save();
        
        const alpha = 1 - (airplane.age / airplane.lifetime);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        
        // Draw paper airplane
        ctx.beginPath();
        ctx.moveTo(airplane.x, airplane.y - airplane.size);
        ctx.lineTo(airplane.x - airplane.size, airplane.y + airplane.size);
        ctx.lineTo(airplane.x + airplane.size, airplane.y + airplane.size);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      }
    }
    
    // Render tornado kids with special effects
    if (playingState.kids) {
      for (const kid of playingState.kids) {
        if (kid.tornadoMode) {
          ctx.save();
          
          // Draw tornado trail
          const trailLength = 5;
          for (let i = 1; i <= trailLength; i++) {
            const alpha = 0.3 - (i * 0.05);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff6b6b';
            
            const trailX = kid.x - (kid.vx * 0.01 * i);
            const trailY = kid.y - (kid.vy * 0.01 * i);
            
            ctx.beginPath();
            ctx.arc(trailX + kid.width/2, trailY + kid.height/2, 8, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.restore();
        }
      }
    }
  }
} 