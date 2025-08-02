import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Minify and optimize for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // Prevent source map exposure
        sourcemap: false,
        // Optimize chunk splitting
        manualChunks: {
          vendor: ['vite']
        }
      }
    }
  },
  server: {
    port: 5173, // Use default Vite port
    open: false, // Don't auto-open browser
    // Relaxed security headers for antivirus compatibility
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '0', // Disable XSS protection to avoid conflicts
      'Referrer-Policy': 'no-referrer-when-downgrade'
    }
  },
  // Environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  // Optimize for antivirus compatibility
  optimizeDeps: {
    include: ['vite']
  }
});