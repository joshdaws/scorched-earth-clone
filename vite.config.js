import { defineConfig } from 'vite';
import path from 'path';

const buildSourcemap = process.env.BUILD_SOURCEMAP === 'true';

export default defineConfig({
  // Build output directory (for Capacitor)
  build: {
    outDir: 'www',
    // Don't empty outDir (we might have other files there)
    emptyOutDir: true,
    // Release builds omit sourcemaps to keep iOS bundles small. Use
    // `npm run build:debug` when source maps are needed for local debugging.
    sourcemap: buildSourcemap,
    // Handle Convex dynamic imports - don't try to bundle them
    rollupOptions: {
      external: [
        /^convex/,
        /convex\/_generated/,
      ],
    },
  },
  // Base path for assets (Capacitor serves from root)
  base: './',
  // Dev server config
  server: {
    port: 8000,
    open: true,
  },
  // Resolve aliases for Three.js addons
  resolve: {
    alias: {
      'three/addons/': path.resolve(__dirname, 'node_modules/three/examples/jsm/'),
    },
  },
});
