import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'happy-dom',

    // Include patterns
    include: ['tests/**/*.test.js'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['js/**/*.js'],
      exclude: [
        'js/vendor/**',
        'js/**/*.test.js'
      ]
    },

    // Global test timeout
    testTimeout: 5000,

    // Enable globals (describe, it, expect)
    globals: true
  },

  // Resolve aliases (match vite.config.js)
  resolve: {
    alias: {
      'three/addons/': path.resolve(__dirname, 'node_modules/three/examples/jsm/'),
    },
  },
});
