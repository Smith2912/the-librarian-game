export class AssetLoader {
  constructor() {
    this.assets = new Map();
    this.loadingProgress = 0;
    this.totalAssets = 0;
    this.loadedAssets = 0;
  }
  
  async loadAll(assetManifest) {
    const promises = [];
    this.totalAssets = 0;
    this.loadedAssets = 0;
    
    // Count total assets
    for (const category of Object.values(assetManifest)) {
      this.totalAssets += Object.keys(category).length;
    }
    
    // Load images
    if (assetManifest.images) {
      for (const [name, path] of Object.entries(assetManifest.images)) {
        promises.push(this.loadImage(name, path));
      }
    }
    
    // Load audio
    if (assetManifest.audio) {
      for (const [name, path] of Object.entries(assetManifest.audio)) {
        promises.push(this.loadAudio(name, path));
      }
    }
    
    // Load JSON data
    if (assetManifest.data) {
      for (const [name, path] of Object.entries(assetManifest.data)) {
        promises.push(this.loadJSON(name, path));
      }
    }
    
    await Promise.all(promises);
    console.log(`Loaded ${this.loadedAssets} assets successfully`);
  }
  
  async loadImage(name, path) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.assets.set(name, img);
        this.loadedAssets++;
        this.updateProgress();
        resolve(img);
      };
      
      img.onerror = () => {
        console.error(`Failed to load image: ${path}`);
        // Still resolve to not break the loading process
        this.loadedAssets++;
        this.updateProgress();
        resolve(null);
      };
      
      img.src = path;
    });
  }
  
  async loadAudio(name, path) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      audio.addEventListener('canplaythrough', () => {
        this.assets.set(name, audio);
        this.loadedAssets++;
        this.updateProgress();
        resolve(audio);
      }, { once: true });
      
      audio.onerror = () => {
        console.error(`Failed to load audio: ${path}`);
        this.loadedAssets++;
        this.updateProgress();
        resolve(null);
      };
      
      audio.src = path;
      audio.load();
    });
  }
  
  async loadJSON(name, path) {
    try {
      // Validate and sanitize the path
      const sanitizedPath = this.sanitizeAssetPath(path);
      if (!sanitizedPath) {
        console.error(`Invalid asset path: ${path}`);
        this.loadedAssets++;
        this.updateProgress();
        return null;
      }
      
      const response = await fetch(sanitizedPath);
      
      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid content type for JSON asset');
      }
      
      const data = await response.json();
      
      // Validate JSON structure
      if (!this.validateJSONAsset(data)) {
        throw new Error('Invalid JSON asset structure');
      }
      
      this.assets.set(name, data);
      this.loadedAssets++;
      this.updateProgress();
      return data;
    } catch (error) {
      console.error(`Failed to load JSON: ${path}`, error);
      this.loadedAssets++;
      this.updateProgress();
      return null;
    }
  }
  
  // Sanitize asset path to prevent path traversal attacks
  sanitizeAssetPath(path) {
    if (typeof path !== 'string') return null;
    
    // Remove any path traversal attempts
    const sanitized = path.replace(/\.\./g, '').replace(/\/\//g, '/');
    
    // Only allow paths starting with / or ./
    if (!sanitized.startsWith('/') && !sanitized.startsWith('./')) {
      return null;
    }
    
    // Limit path length
    if (sanitized.length > 200) {
      return null;
    }
    
    // Only allow specific file extensions
    const allowedExtensions = ['.json', '.png', '.jpg', '.jpeg', '.gif', '.mp3', '.wav', '.ogg'];
    const hasValidExtension = allowedExtensions.some(ext => sanitized.toLowerCase().endsWith(ext));
    
    return hasValidExtension ? sanitized : null;
  }
  
  // Validate JSON asset structure
  validateJSONAsset(data) {
    if (!data || typeof data !== 'object') return false;
    
    // Add specific validation based on expected JSON structure
    // This is a basic validation - expand based on your JSON schemas
    return true;
  }
  
  updateProgress() {
    this.loadingProgress = this.totalAssets > 0 
      ? this.loadedAssets / this.totalAssets 
      : 0;
  }
  
  get(name) {
    return this.assets.get(name);
  }
  
  getImage(name) {
    const asset = this.get(name);
    if (asset instanceof HTMLImageElement) {
      return asset;
    }
    return null;
  }
  
  getAudio(name) {
    const asset = this.get(name);
    if (asset instanceof HTMLAudioElement) {
      return asset;
    }
    return null;
  }
  
  getData(name) {
    const asset = this.get(name);
    if (asset && !(asset instanceof HTMLElement)) {
      return asset;
    }
    return null;
  }
  
  // Create placeholder image for development
  createPlaceholderImage(width, height, color = '#888888', text = '') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    // Draw border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
    
    // Draw text if provided
    if (text) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.min(width, height) * 0.2}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width / 2, height / 2);
    }
    
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }
  
  // Generate placeholder assets for development
  generatePlaceholderAssets() {
    // Player sprite
    this.assets.set('librarian', this.createPlaceholderImage(32, 48, '#4169E1', 'P'));
    
    // Kid sprites - create 3 different types with different colors
    this.assets.set('kid1Stand', this.createPlaceholderImage(24, 36, '#FF6347', 'K1')); // Red kid
    this.assets.set('kid1Walk', this.createPlaceholderImage(24, 36, '#FF6347', 'K1'));
    this.assets.set('kid2Stand', this.createPlaceholderImage(24, 36, '#32CD32', 'K2')); // Green kid
    this.assets.set('kid2Walk', this.createPlaceholderImage(24, 36, '#32CD32', 'K2'));
    this.assets.set('kid3Stand', this.createPlaceholderImage(24, 36, '#4169E1', 'K3')); // Blue kid
    this.assets.set('kid3Walk', this.createPlaceholderImage(24, 36, '#4169E1', 'K3'));
    
    // Generic fallback kid sprite
    this.assets.set('kid', this.createPlaceholderImage(24, 36, '#FF6347', 'K'));
    
    // Book sprite
    this.assets.set('book', this.createPlaceholderImage(16, 20, '#8B4513', 'B'));
    
    // Shelf sprite
    this.assets.set('shelf', this.createPlaceholderImage(64, 96, '#654321', 'S'));
    
    // Floor tiles
    this.assets.set('tiles', this.createPlaceholderImage(32, 32, '#D2691E'));
    
    console.log('Generated placeholder assets with 3 kid types');
  }
}