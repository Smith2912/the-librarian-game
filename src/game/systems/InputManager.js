export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Map();
    this.frameKeyReleases = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.touchActive = false;
    this.lastFocusTime = Date.now();
    
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Setting up input event listeners...');
    }
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Focus canvas
    this.canvas.focus();
    
    // Keyboard events
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('wheel', (e) => this.handleMouseWheel(e));
    
    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Touch events (basic support)
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    
    // Handle focus loss - be less aggressive about clearing inputs
    let windowHasFocus = true;
    window.addEventListener('blur', (e) => {
      // Clear all input state when window loses focus to prevent stuck keys
      if (document.hasFocus() === false) {
        console.log('Window lost focus, clearing all input state');
        windowHasFocus = false;
        this.clearAllInputs();
      }
    });
    
    window.addEventListener('focus', () => {
      console.log('Window regained focus');
      windowHasFocus = true;
      // Refocus canvas when window regains focus
      this.canvas.focus();
    });
    
    // Also handle canvas blur/focus
    this.canvas.addEventListener('blur', () => {
      console.log('Canvas lost focus');
    });
    
    this.canvas.addEventListener('focus', () => {
      console.log('Canvas gained focus');
    });
  }
  
  handleKeyDown(event) {
    const key = event.key;
    
    // Prevent default behavior for game keys
    if (this.isGameKey(key)) {
      event.preventDefault();
    }
    
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('New key press:', key);
    }
    
    this.keys.set(key, Date.now());
  }
  
  handleKeyUp(event) {
    const key = event.key;
    
    // Prevent default behavior for game keys
    if (this.isGameKey(key)) {
      event.preventDefault();
    }
    
    this.keys.delete(key);
    this.frameKeyReleases.add(key);
  }
  
  handleMouseDown(event) {
    this.mouse.buttons.set(event.button, true);
    this.updateMousePosition(event);
  }
  
  handleMouseUp(event) {
    this.mouse.buttons.delete(event.button);
  }
  
  handleMouseMove(event) {
    this.updateMousePosition(event);
  }
  
  handleMouseWheel(event) {
    event.preventDefault();
    this.mouse.wheel = event.deltaY;
  }
  
  handleTouchStart(event) {
    event.preventDefault();
    for (const touch of event.changedTouches) {
      this.touches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY
      });
    }
  }
  
  handleTouchEnd(event) {
    event.preventDefault();
    for (const touch of event.changedTouches) {
      this.touches.delete(touch.identifier);
    }
  }
  
  handleTouchMove(event) {
    event.preventDefault();
    for (const touch of event.changedTouches) {
      if (this.touches.has(touch.identifier)) {
        const touchData = this.touches.get(touch.identifier);
        touchData.x = touch.clientX;
        touchData.y = touch.clientY;
      }
    }
  }
  
  updateMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    this.mouse.x = (event.clientX - rect.left) * scaleX;
    this.mouse.y = (event.clientY - rect.top) * scaleY;
  }
  
  update() {
    // Clear frame-specific data
    this.frameKeyReleases.clear();
    
    // Check for stuck keys and clear them
    const currentTime = Date.now();
    for (const [key, timestamp] of this.keys.entries()) {
      if (typeof timestamp === 'number' && currentTime - timestamp > 3000) { // Reduced from 5000
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log(`Clearing potentially stuck key: ${key}`);
        }
        this.keys.delete(key);
        this.frameKeyReleases.add(key); // Mark as released
      }
    }
    
    // Special handling for sprint key - if it's stuck, force clear it
    if (this.keys.has('Shift')) {
      const shiftTimestamp = this.keys.get('Shift');
      if (typeof shiftTimestamp === 'number' && currentTime - shiftTimestamp > 2000) { // Specific for Shift
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('Clearing stuck sprint key');
        }
        this.keys.delete('Shift');
        this.frameKeyReleases.add('Shift');
      }
    }
  }
  
  // Key state queries
  isKeyDown(key) {
    return this.keys.has(key);
  }
  
  isKeyPressed(key) {
    return this.frameKeyPresses.has(key);
  }
  
  isKeyReleased(key) {
    return this.frameKeyReleases.has(key);
  }
  
  // Action queries (support multiple key mappings)
  isActionDown(action) {
    const keys = this.actionMappings.get(action) || [];
    return keys.some(key => this.isKeyDown(key));
  }
  
  isActionPressed(action) {
    const keys = this.actionMappings.get(action) || [];
    return keys.some(key => this.isKeyPressed(key));
  }
  
  // Mouse queries
  isMouseButtonDown(button) {
    return this.mouse.buttons.has(button);
  }
  
  isMouseButtonPressed(button) {
    return this.isMouseButtonDown(button) && !this.mouse.previousButtons.has(button);
  }
  
  getMousePosition() {
    return { x: this.mouse.x, y: this.mouse.y };
  }
  
  getMouseWheel() {
    return this.mouse.wheel;
  }
  
  // Movement vector (for player control)
  getMovementVector() {
    let x = 0;
    let y = 0;
    
    if (this.isActionDown('moveLeft')) x -= 1;
    if (this.isActionDown('moveRight')) x += 1;
    if (this.isActionDown('moveUp')) y -= 1;
    if (this.isActionDown('moveDown')) y += 1;
    
    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }
    
    return { x, y };
  }
  
  // Utility methods
  isGameKey(key) {
    const gameKeys = ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 
                     'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                     ' ', 'Shift', 'p', 'P', 'Escape'];
    return gameKeys.includes(key);
  }
  
  clearAllInputs() {
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Clearing all input state');
    }
    
    this.keys.clear();
    this.frameKeyReleases.clear();
    this.mouseDown = false;
    this.touchActive = false;
  }
  
  // Safely clear just the frame events (for state transitions)
  clearFrameEvents() {
    this.frameKeyPresses.clear();
    this.frameKeyReleases.clear();
  }
  
  // Ensure canvas has focus
  ensureFocus() {
    if (document.activeElement !== this.canvas) {
      console.log('Refocusing canvas');
      this.canvas.focus();
    }
  }
}