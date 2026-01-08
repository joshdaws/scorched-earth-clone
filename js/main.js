/**
 * Scorched Earth: Synthwave Edition
 * Main entry point
 */

// Log initialization
console.log('Scorched Earth: Synthwave Edition');
console.log('Initializing...');

// Get canvas element
const canvas = document.getElementById('game-canvas');

if (canvas) {
    console.log('Canvas found:', canvas.id);
    console.log('Scorched Earth initialized');
} else {
    console.error('Canvas element not found!');
}
