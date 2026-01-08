/**
 * Scorched Earth: Synthwave Edition
 * Web Audio API Sound Manager
 *
 * Handles audio initialization and playback with separate channels
 * for music and sound effects.
 */

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {AudioContext|null} */
let audioContext = null;

/** @type {GainNode|null} */
let masterGain = null;

/** @type {GainNode|null} */
let musicGain = null;

/** @type {GainNode|null} */
let sfxGain = null;

/** @type {boolean} */
let initialized = false;

// =============================================================================
// AUDIO CONFIGURATION
// =============================================================================

const DEFAULT_MASTER_VOLUME = 0.8;
const DEFAULT_MUSIC_VOLUME = 0.5;
const DEFAULT_SFX_VOLUME = 0.8;

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Check if the Web Audio API is supported.
 * @returns {boolean} True if Web Audio API is available
 */
export function isSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
}

/**
 * Check if the audio system has been initialized.
 * @returns {boolean} True if audio context is initialized and running
 */
export function isInitialized() {
    return initialized && audioContext !== null && audioContext.state === 'running';
}

/**
 * Initialize the audio system.
 * Must be called in response to a user interaction (click/touch) due to
 * browser autoplay policies.
 * @returns {boolean} True if initialization succeeded
 */
export function init() {
    // Already initialized
    if (initialized) {
        return true;
    }

    // Check for Web Audio API support
    if (!isSupported()) {
        console.warn('Web Audio API not supported in this browser');
        return false;
    }

    try {
        // Create audio context (with webkit fallback for older Safari)
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContextClass();

        // Create master gain node (controls overall volume)
        masterGain = audioContext.createGain();
        masterGain.gain.value = DEFAULT_MASTER_VOLUME;
        masterGain.connect(audioContext.destination);

        // Create music gain node (for background music volume)
        musicGain = audioContext.createGain();
        musicGain.gain.value = DEFAULT_MUSIC_VOLUME;
        musicGain.connect(masterGain);

        // Create SFX gain node (for sound effects volume)
        sfxGain = audioContext.createGain();
        sfxGain.gain.value = DEFAULT_SFX_VOLUME;
        sfxGain.connect(masterGain);

        // Resume context if it's in suspended state (common on mobile)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        initialized = true;
        console.log('Audio initialized');
        return true;
    } catch (error) {
        console.error('Failed to initialize audio:', error);
        return false;
    }
}

/**
 * Get the audio context.
 * Returns null if not initialized.
 * @returns {AudioContext|null}
 */
export function getContext() {
    return audioContext;
}

/**
 * Get the music gain node for connecting music sources.
 * Returns null if not initialized.
 * @returns {GainNode|null}
 */
export function getMusicGain() {
    return musicGain;
}

/**
 * Get the SFX gain node for connecting sound effect sources.
 * Returns null if not initialized.
 * @returns {GainNode|null}
 */
export function getSfxGain() {
    return sfxGain;
}

/**
 * Set the master volume (affects both music and SFX).
 * @param {number} volume - Volume level from 0 to 1
 */
export function setMasterVolume(volume) {
    if (masterGain) {
        masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
}

/**
 * Set the music volume.
 * @param {number} volume - Volume level from 0 to 1
 */
export function setMusicVolume(volume) {
    if (musicGain) {
        musicGain.gain.value = Math.max(0, Math.min(1, volume));
    }
}

/**
 * Set the sound effects volume.
 * @param {number} volume - Volume level from 0 to 1
 */
export function setSfxVolume(volume) {
    if (sfxGain) {
        sfxGain.gain.value = Math.max(0, Math.min(1, volume));
    }
}

/**
 * Get current master volume.
 * @returns {number} Volume level from 0 to 1, or 0 if not initialized
 */
export function getMasterVolume() {
    return masterGain ? masterGain.gain.value : 0;
}

/**
 * Get current music volume.
 * @returns {number} Volume level from 0 to 1, or 0 if not initialized
 */
export function getMusicVolume() {
    return musicGain ? musicGain.gain.value : 0;
}

/**
 * Get current SFX volume.
 * @returns {number} Volume level from 0 to 1, or 0 if not initialized
 */
export function getSfxVolume() {
    return sfxGain ? sfxGain.gain.value : 0;
}

/**
 * Resume the audio context if it's suspended.
 * Useful for handling browser autoplay policies.
 * @returns {Promise<void>}
 */
export async function resume() {
    if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
    }
}

/**
 * Suspend the audio context.
 * Useful for pausing all audio when the game loses focus.
 * @returns {Promise<void>}
 */
export async function suspend() {
    if (audioContext && audioContext.state === 'running') {
        await audioContext.suspend();
    }
}
