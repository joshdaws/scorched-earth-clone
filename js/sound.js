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

/** @type {Map<string, AudioBuffer>} Cache of loaded music buffers */
const musicCache = new Map();

/** @type {AudioBufferSourceNode|null} Currently playing music source */
let currentMusicSource = null;

/** @type {GainNode|null} Gain node for current music (for fading) */
let currentMusicGainNode = null;

/** @type {string|null} ID of currently playing music track */
let currentMusicId = null;

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

// =============================================================================
// MUSIC API
// =============================================================================

/** Default fade duration in seconds */
const DEFAULT_FADE_DURATION = 1.0;

/**
 * Load a music track from a file path and cache it for playback.
 * @param {string} id - Unique identifier for the music track
 * @param {string} path - Path to the audio file
 * @returns {Promise<boolean>} True if loading succeeded
 */
export async function loadMusic(id, path) {
    // Check if already cached
    if (musicCache.has(id)) {
        return true;
    }

    // Audio context must be initialized
    if (!audioContext) {
        console.warn(`Cannot load music '${id}': Audio not initialized`);
        return false;
    }

    try {
        const response = await fetch(path);

        if (!response.ok) {
            console.warn(`Failed to load music '${id}': ${response.status} ${response.statusText}`);
            return false;
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        musicCache.set(id, audioBuffer);
        console.log(`Music loaded: ${id}`);
        return true;
    } catch (error) {
        console.warn(`Failed to load music '${id}':`, error.message);
        return false;
    }
}

/**
 * Play a music track. Only one track plays at a time.
 * If another track is playing, it will be stopped first.
 * @param {string} id - Identifier of the music track to play
 * @param {boolean} [loop=true] - Whether to loop the track
 * @param {number} [fadeIn=0] - Fade in duration in seconds (0 for instant)
 * @returns {boolean} True if playback started successfully
 */
export function playMusic(id, loop = true, fadeIn = 0) {
    // Audio must be initialized
    if (!audioContext || !musicGain) {
        console.warn(`Cannot play music '${id}': Audio not initialized`);
        return false;
    }

    // Music must be loaded
    const buffer = musicCache.get(id);
    if (!buffer) {
        console.warn(`Cannot play music '${id}': Music not loaded`);
        return false;
    }

    // Stop current music if playing
    if (currentMusicSource) {
        stopMusicImmediate();
    }

    try {
        // Create source node
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;

        // Create per-track gain node for fading
        const gainNode = audioContext.createGain();

        // Set initial volume (0 if fading in, 1 otherwise)
        gainNode.gain.value = fadeIn > 0 ? 0 : 1;

        // Connect: source → per-track gain → music gain → master → destination
        source.connect(gainNode);
        gainNode.connect(musicGain);

        // Apply fade in if requested
        if (fadeIn > 0) {
            gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + fadeIn);
        }

        // Store references
        currentMusicSource = source;
        currentMusicGainNode = gainNode;
        currentMusicId = id;

        // Clean up when track ends (if not looping)
        source.onended = () => {
            if (currentMusicSource === source) {
                currentMusicSource = null;
                currentMusicGainNode = null;
                currentMusicId = null;
            }
        };

        source.start(0);
        console.log(`Music playing: ${id}`);
        return true;
    } catch (error) {
        console.error(`Error playing music '${id}':`, error);
        return false;
    }
}

/**
 * Stop the currently playing music immediately.
 */
function stopMusicImmediate() {
    if (currentMusicSource) {
        try {
            currentMusicSource.stop();
        } catch (e) {
            // Ignore errors if already stopped
        }
        currentMusicSource = null;
        currentMusicGainNode = null;
        currentMusicId = null;
    }
}

/**
 * Stop the currently playing music.
 * @param {number} [fadeOut=0] - Fade out duration in seconds (0 for instant)
 */
export function stopMusic(fadeOut = 0) {
    if (!currentMusicSource || !currentMusicGainNode || !audioContext) {
        return;
    }

    if (fadeOut > 0) {
        // Fade out then stop
        const source = currentMusicSource;
        const gainNode = currentMusicGainNode;

        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeOut);

        // Stop after fade completes
        setTimeout(() => {
            if (currentMusicSource === source) {
                stopMusicImmediate();
            }
        }, fadeOut * 1000);
    } else {
        stopMusicImmediate();
    }
}

/**
 * Crossfade from current music to a new track.
 * @param {string} id - Identifier of the music track to fade to
 * @param {boolean} [loop=true] - Whether to loop the new track
 * @param {number} [duration=1] - Crossfade duration in seconds
 * @returns {boolean} True if crossfade started successfully
 */
export function crossfadeMusic(id, loop = true, duration = DEFAULT_FADE_DURATION) {
    // If nothing is playing, just play with fade in
    if (!currentMusicSource) {
        return playMusic(id, loop, duration);
    }

    // Same track - do nothing
    if (currentMusicId === id) {
        return true;
    }

    // Music must be loaded
    const buffer = musicCache.get(id);
    if (!buffer) {
        console.warn(`Cannot crossfade to music '${id}': Music not loaded`);
        return false;
    }

    // Fade out current
    if (currentMusicGainNode && audioContext) {
        const oldSource = currentMusicSource;
        const oldGain = currentMusicGainNode;

        oldGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);

        // Stop old track after fade
        setTimeout(() => {
            try {
                oldSource.stop();
            } catch (e) {
                // Ignore
            }
        }, duration * 1000);
    }

    // Clear current references before playing new track
    currentMusicSource = null;
    currentMusicGainNode = null;
    currentMusicId = null;

    // Play new track with fade in
    return playMusic(id, loop, duration);
}

/**
 * Check if a music track is loaded and ready to play.
 * @param {string} id - Music identifier to check
 * @returns {boolean} True if music is loaded
 */
export function isMusicLoaded(id) {
    return musicCache.has(id);
}

/**
 * Get the ID of the currently playing music track.
 * @returns {string|null} The current track ID, or null if nothing is playing
 */
export function getCurrentMusicId() {
    return currentMusicId;
}

/**
 * Check if music is currently playing.
 * @returns {boolean} True if music is playing
 */
export function isMusicPlaying() {
    return currentMusicSource !== null;
}

/**
 * Unload a music track from the cache.
 * @param {string} id - Music identifier to unload
 */
export function unloadMusic(id) {
    musicCache.delete(id);
}

/**
 * Clear all loaded music from the cache.
 */
export function clearMusicCache() {
    stopMusic();
    musicCache.clear();
}

// =============================================================================
// PROCEDURAL UI SOUNDS
// =============================================================================

/**
 * Play a synthesized purchase/confirm sound.
 * Creates a short ascending tone with a synthwave character.
 * @param {number} [volume=0.4] - Volume multiplier (0-1)
 */
export function playPurchaseSound(volume = 0.4) {
    if (!audioContext || !sfxGain) {
        console.warn('Cannot play purchase sound: Audio not initialized');
        return;
    }

    try {
        const now = audioContext.currentTime;

        // Create two oscillators for a richer sound (synthwave character)
        const osc1 = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Primary oscillator - sawtooth for that synthwave edge
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(440, now);
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.1);

        // Secondary oscillator - square wave one octave higher for brightness
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(880, now);
        osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.1);

        // Connect oscillators with relative volumes
        const osc1Gain = audioContext.createGain();
        const osc2Gain = audioContext.createGain();
        osc1Gain.gain.value = 0.7;
        osc2Gain.gain.value = 0.3;

        osc1.connect(osc1Gain);
        osc2.connect(osc2Gain);
        osc1Gain.connect(gainNode);
        osc2Gain.connect(gainNode);

        // Envelope: quick attack, short decay
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.5, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        // Connect to SFX channel
        gainNode.connect(sfxGain);

        // Play
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.15);
        osc2.stop(now + 0.15);
    } catch (error) {
        console.error('Error playing purchase sound:', error);
    }
}

/**
 * Play a synthesized error/reject sound.
 * Creates a short descending tone indicating failure.
 * @param {number} [volume=0.3] - Volume multiplier (0-1)
 */
export function playErrorSound(volume = 0.3) {
    if (!audioContext || !sfxGain) {
        console.warn('Cannot play error sound: Audio not initialized');
        return;
    }

    try {
        const now = audioContext.currentTime;

        // Single oscillator for error - descending tone
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Square wave for harsh error sound
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

        // Envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.4, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);

        osc.start(now);
        osc.stop(now + 0.2);
    } catch (error) {
        console.error('Error playing error sound:', error);
    }
}
