#!/usr/bin/env node
/**
 * Generate config.js from environment variables
 *
 * Used during Vercel deployment to inject the correct Convex URL.
 *
 * Environment variables:
 *   SERVICE_MODE - "online" or "offline" (defaults to online)
 *   CONVEX_URL - The Convex deployment URL (required for online mode)
 *
 * If CONVEX_URL is not set in online mode, the script will fail with an error.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
const SERVICE_MODE = process.env.SERVICE_MODE || process.env.VITE_SERVICE_MODE || 'online';
const OFFLINE_SERVICES = SERVICE_MODE === 'offline';

if (!OFFLINE_SERVICES && !CONVEX_URL) {
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
    SERVICE_MODE: '${SERVICE_MODE}',
    OFFLINE_SERVICES: ${OFFLINE_SERVICES},
    CONVEX_URL: '${OFFLINE_SERVICES ? '' : CONVEX_URL}'
};
`;

const configPath = path.join(__dirname, '..', 'config.js');
fs.writeFileSync(configPath, config);

console.log(`Generated config.js with SERVICE_MODE=${SERVICE_MODE}${OFFLINE_SERVICES ? '' : ` CONVEX_URL=${CONVEX_URL}`}`);
