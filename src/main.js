import { Game } from './game/Game.js';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing game...');
  
  // Create game instance
  const game = new Game('game-canvas');
  
  // Remove global exposure for security - only expose in development
  if (process.env.NODE_ENV === 'development') {
    window.game = game;
  }
  
  try {
    // Initialize and start the game
    await game.init();
    console.log('Library Survivors initialized successfully!');
    console.log('Current state:', game.stateManager.currentState?.name);
  } catch (error) {
    console.error('Failed to initialize game:', error);
    
    // Show error to user
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.textContent = 'Failed to load game. Please refresh the page.';
      loadingEl.style.color = '#ff0000';
    }
  }
  
  // Handle visibility changes (pause when tab is hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.stateManager.currentState?.name === 'playing') {
      game.gameData.isPaused = true;
    }
  });
});