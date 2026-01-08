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

/** @type {Map<string, AudioBuffer>} Cache of loaded audio buffers */
const soundCache = new Map();

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

// =============================================================================
// SOUND EFFECTS API
// =============================================================================

/**
 * Load a sound effect from a file path and cache it for playback.
 * @param {string} id - Unique identifier for the sound
 * @param {string} path - Path to the audio file
 * @returns {Promise<boolean>} True if loading succeeded
 */
export async function loadSound(id, path) {
    // Check if already cached
    if (soundCache.has(id)) {
        return true;
    }

    // Audio context must be initialized
    if (!audioContext) {
        console.warn(`Cannot load sound '${id}': Audio not initialized`);
        return false;
    }

    try {
        const response = await fetch(path);

        if (!response.ok) {
            console.warn(`Failed to load sound '${id}': ${response.status} ${response.statusText}`);
            return false;
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        soundCache.set(id, audioBuffer);
        console.log(`Sound loaded: ${id}`);
        return true;
    } catch (error) {
        console.warn(`Failed to load sound '${id}':`, error.message);
        return false;
    }
}

/**
 * Play a loaded sound effect.
 * Multiple calls will play overlapping instances of the same sound.
 * @param {string} id - Identifier of the sound to play
 * @param {number} [volume=1] - Volume multiplier (0-1), applied on top of SFX gain
 * @returns {AudioBufferSourceNode|null} The source node, or null if playback failed
 */
export function playSound(id, volume = 1) {
    // Audio must be initialized
    if (!audioContext || !sfxGain) {
        console.warn(`Cannot play sound '${id}': Audio not initialized`);
        return null;
    }

    // Sound must be loaded
    const buffer = soundCache.get(id);
    if (!buffer) {
        console.warn(`Cannot play sound '${id}': Sound not loaded`);
        return null;
    }

    try {
        // Create a new source node for each playback (allows overlapping)
        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        // Create a gain node for per-sound volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = Math.max(0, Math.min(1, volume));

        // Connect: source → per-sound gain → SFX gain → master → destination
        source.connect(gainNode);
        gainNode.connect(sfxGain);

        source.start(0);
        return source;
    } catch (error) {
        console.error(`Error playing sound '${id}':`, error);
        return null;
    }
}

/**
 * Check if a sound is loaded and ready to play.
 * @param {string} id - Sound identifier to check
 * @returns {boolean} True if sound is loaded
 */
export function isSoundLoaded(id) {
    return soundCache.has(id);
}

/**
 * Unload a sound from the cache.
 * @param {string} id - Sound identifier to unload
 */
export function unloadSound(id) {
    soundCache.delete(id);
}

/**
 * Clear all loaded sounds from the cache.
 */
export function clearSoundCache() {
    soundCache.clear();
}
