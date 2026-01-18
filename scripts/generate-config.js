#!/usr/bin/env node
/**
 * Generate config.js from environment variables
 *
 * Used during Vercel deployment to inject the correct Convex URL.
 *
 * Environment variables:
 *   CONVEX_URL - The Convex deployment URL (required for production)
 *
 * If CONVEX_URL is not set, the script will fail with an error.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
    console.error('ERROR: CONVEX_URL environment variable is not set.');
    console.error('');
    console.error('For Vercel deployment:');
    console.error('  1. Go to Project Settings > Environment Variables');
    console.error('  2. Add CONVEX_URL with your production Convex URL');
    console.error('');
    console.error('To get your production URL:');
    console.error('  1. Run: npx convex deploy');
    console.error('  2. Copy the deployment URL from the output');
    process.exit(1);
}

const config = `/**
 * Runtime Configuration (Auto-generated)
 *
 * This file was generated during deployment.
 * DO NOT EDIT - changes will be overwritten.
 */
window.SCORCHED_EARTH_CONFIG = {
    CONVEX_URL: '${CONVEX_URL}'
};
`;

const configPath = path.join(__dirname, '..', 'config.js');
fs.writeFileSync(configPath, config);

console.log(`Generated config.js with CONVEX_URL: ${CONVEX_URL}`);
