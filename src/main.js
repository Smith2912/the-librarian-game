// Library Survivors Game - Main Entry Point
// This is a legitimate HTML5 game application

import { Game } from './game/Game.js';

// Initialize game when DOM is ready
function initializeGame() {
  console.log('Initializing Library Survivors game...');
  
  try {
    // Create game instance
    const gameInstance = new Game('game-canvas');
    
    // Development mode debugging
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      window.gameInstance = gameInstance;
    }
    
    // Start the game
    gameInstance.init().then(() => {
      console.log('Library Survivors game started successfully');
      
      // Handle page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && gameInstance.stateManager.currentState?.name === 'playing') {
          gameInstance.gameData.isPaused = true;
        }
      });
    }).catch((error) => {
      console.error('Game initialization failed:', error);
      showErrorMessage('Game failed to start. Please refresh the page.');
    });
    
  } catch (error) {
    console.error('Failed to create game instance:', error);
    showErrorMessage('Unable to create game. Please check your browser settings.');
  }
}

// Show error message to user
function showErrorMessage(message) {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.textContent = message;
    loadingElement.style.color = '#ff0000';
  }
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGame);
} else {
  // DOM is already loaded
  initializeGame();
}