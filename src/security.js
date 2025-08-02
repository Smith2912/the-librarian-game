/**
 * Security Configuration and Utilities
 * Centralized security settings and validation functions
 */

export class SecurityConfig {
  // Content Security Policy settings
  static CSP_POLICY = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'media-src': ["'self'", 'data:', 'blob:'],
    'connect-src': ["'self'"],
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"]
  };

  // Input validation patterns
  static VALIDATION_PATTERNS = {
    // Allow only alphanumeric characters and basic punctuation
    TEXT: /^[a-zA-Z0-9\s.,!?-]*$/,
    // Allow only numbers
    NUMBER: /^\d+$/,
    // Allow only valid file paths
    FILE_PATH: /^[a-zA-Z0-9\/._-]+$/,
    // Allow only valid asset names
    ASSET_NAME: /^[a-zA-Z0-9_-]+$/
  };

  // Maximum lengths for various inputs
  static MAX_LENGTHS = {
    TEXT: 200,
    TITLE: 100,
    DESCRIPTION: 500,
    FILE_PATH: 200,
    ASSET_NAME: 50
  };

  // Allowed file extensions
  static ALLOWED_EXTENSIONS = [
    '.json', '.png', '.jpg', '.jpeg', '.gif', '.mp3', '.wav', '.ogg'
  ];

  // Maximum values for game data
  static MAX_VALUES = {
    CURRENCY: 999999,
    SCORE: 999999999,
    TIME: 999999,
    LEVEL: 999
  };
}

export class SecurityUtils {
  /**
   * Sanitize text input to prevent XSS
   */
  static sanitizeText(text, maxLength = SecurityConfig.MAX_LENGTHS.TEXT) {
    if (typeof text !== 'string') {
      return '';
    }
    
    // Remove HTML tags
    let sanitized = text.replace(/<[^>]*>/g, '');
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>\"'&]/g, '');
    
    // Limit length
    return sanitized.substring(0, maxLength);
  }

  /**
   * Validate and sanitize number input
   */
  static sanitizeNumber(value, min = 0, max = SecurityConfig.MAX_VALUES.CURRENCY) {
    const num = Number(value);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Validate file path to prevent path traversal
   */
  static validateFilePath(path) {
    if (typeof path !== 'string') return false;
    
    // Remove path traversal attempts
    const sanitized = path.replace(/\.\./g, '').replace(/\/\//g, '/');
    
    // Only allow paths starting with / or ./
    if (!sanitized.startsWith('/') && !sanitized.startsWith('./')) {
      return false;
    }
    
    // Check length
    if (sanitized.length > SecurityConfig.MAX_LENGTHS.FILE_PATH) {
      return false;
    }
    
    // Check file extension
    const hasValidExtension = SecurityConfig.ALLOWED_EXTENSIONS.some(
      ext => sanitized.toLowerCase().endsWith(ext)
    );
    
    return hasValidExtension;
  }

  /**
   * Validate asset name
   */
  static validateAssetName(name) {
    if (typeof name !== 'string') return false;
    
    if (name.length > SecurityConfig.MAX_LENGTHS.ASSET_NAME) return false;
    
    return SecurityConfig.VALIDATION_PATTERNS.ASSET_NAME.test(name);
  }

  /**
   * Validate JSON structure
   */
  static validateJSONStructure(data, schema) {
    if (!data || typeof data !== 'object') return false;
    
    // Basic validation - expand based on specific schemas
    for (const [key, validator] of Object.entries(schema)) {
      if (!(key in data)) return false;
      if (!validator(data[key])) return false;
    }
    
    return true;
  }

  /**
   * Generate secure random ID
   */
  static generateSecureId() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hash sensitive data (basic implementation)
   */
  static async hashData(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate localStorage data structure
   */
  static validateLocalStorageData(data) {
    if (!data || typeof data !== 'object') return false;
    
    const requiredFields = ['currency', 'permanentUpgrades', 'unlockedLibrarians', 'currentLibrarian', 'highScores'];
    
    for (const field of requiredFields) {
      if (!(field in data)) return false;
    }
    
    // Validate currency
    if (typeof data.currency !== 'number' || data.currency < 0 || data.currency > SecurityConfig.MAX_VALUES.CURRENCY) {
      return false;
    }
    
    // Validate upgrades
    if (!Array.isArray(data.permanentUpgrades) && typeof data.permanentUpgrades !== 'object') {
      return false;
    }
    
    // Validate librarians
    if (!Array.isArray(data.unlockedLibrarians) || data.unlockedLibrarians.length === 0) {
      return false;
    }
    
    // Validate current librarian
    if (typeof data.currentLibrarian !== 'string' || data.currentLibrarian.length > SecurityConfig.MAX_LENGTHS.TEXT) {
      return false;
    }
    
    // Validate high scores
    if (!Array.isArray(data.highScores)) {
      return false;
    }
    
    return true;
  }

  /**
   * Sanitize object data
   */
  static sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return {};
    
    // For simple objects, return as-is but validate structure
    if (Array.isArray(obj)) return this.sanitizeArray(obj);
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof key === 'string' && key.length <= SecurityConfig.MAX_LENGTHS.TEXT) {
        if (typeof value === 'number') {
          sanitized[key] = this.sanitizeNumber(value);
        } else if (typeof value === 'string') {
          sanitized[key] = this.sanitizeText(value);
        } else if (typeof value === 'boolean') {
          sanitized[key] = Boolean(value);
        } else if (Array.isArray(value)) {
          sanitized[key] = this.sanitizeArray(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeObject(value);
        }
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize array data
   */
  static sanitizeArray(arr) {
    if (!Array.isArray(arr)) return [];
    
    const sanitized = [];
    for (let i = 0; i < arr.length && i < 1000; i++) { // Limit array size
      const item = arr[i];
      if (typeof item === 'number') {
        sanitized.push(this.sanitizeNumber(item));
      } else if (typeof item === 'string') {
        sanitized.push(this.sanitizeText(item));
      } else if (typeof item === 'boolean') {
        sanitized.push(Boolean(item));
      } else if (Array.isArray(item)) {
        sanitized.push(this.sanitizeArray(item));
      } else if (typeof item === 'object' && item !== null) {
        sanitized.push(this.sanitizeObject(item));
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize string data
   */
  static sanitizeString(str, maxLength = SecurityConfig.MAX_LENGTHS.TEXT) {
    if (typeof str !== 'string') return '';
    return this.sanitizeText(str, maxLength);
  }

  /**
   * Sanitize high scores array
   */
  static sanitizeHighScores(scores) {
    if (!Array.isArray(scores)) return [];
    
    const sanitized = [];
    for (let i = 0; i < scores.length && i < 100; i++) { // Limit to 100 high scores
      const score = scores[i];
      if (score && typeof score === 'object') {
        const sanitizedScore = {
          score: this.sanitizeNumber(score.score, 0, SecurityConfig.MAX_VALUES.SCORE),
          time: this.sanitizeNumber(score.time, 0, SecurityConfig.MAX_VALUES.TIME),
          date: this.sanitizeText(score.date, SecurityConfig.MAX_LENGTHS.TEXT),
          booksCollected: this.sanitizeNumber(score.booksCollected, 0, SecurityConfig.MAX_VALUES.SCORE)
        };
        sanitized.push(sanitizedScore);
      }
    }
    
    return sanitized;
  }
}

// Export security configuration
export default SecurityConfig; 