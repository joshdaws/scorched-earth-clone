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

const DEFAULT_MASTER_VOLUME = 0.5;
const DEFAULT_MUSIC_VOLUME = 0.5;
const DEFAULT_SFX_VOLUME = 0.5;

// =============================================================================
// LOCAL STORAGE KEYS
// =============================================================================

const STORAGE_KEY_MASTER_VOLUME = 'scorched-earth-master-volume';
const STORAGE_KEY_MUSIC_VOLUME = 'scorched-earth-music-volume';
const STORAGE_KEY_SFX_VOLUME = 'scorched-earth-sfx-volume';
const STORAGE_KEY_MUTED = 'scorched-earth-muted';

// =============================================================================
// MUTE STATE
// =============================================================================

/** @type {boolean} Whether audio is currently muted */
let isMuted = false;

/** @type {number} Volume before mute was applied (for restoring) */
let preMuteVolume = DEFAULT_MASTER_VOLUME;

// =============================================================================
// VOLUME DUCKING STATE
// =============================================================================

/**
 * Ducking configuration - lowers music volume during explosions for impact
 */
const DUCK_CONFIG = {
    /** Target volume when ducked (30% of normal) */
    DUCKED_LEVEL: 0.3,
    /** Time to fade down to ducked level (100ms) */
    DUCK_FADE_IN: 0.1,
    /** Time to wait before starting fade back up (500ms for normal explosions) */
    DUCK_HOLD_DURATION: 0.5,
    /** Time to wait before starting fade back up for nuclear explosions (1000ms) */
    DUCK_HOLD_DURATION_NUCLEAR: 1.0,
    /** Time to fade back up to normal level (300ms for smooth transition) */
    DUCK_FADE_OUT: 0.3
};

/** @type {boolean} Whether music is currently ducked */
let isDucked = false;

/** @type {number|null} Scheduled time for duck to end */
let duckEndTime = null;

/** @type {number|null} Timeout ID for unduck operation */
let duckTimeoutId = null;

/** @type {number} Music volume before ducking (to restore after) */
let preDuckMusicVolume = 1.0;

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
        // Load persisted settings before creating gain nodes
        const savedMaster = loadVolumeSetting(STORAGE_KEY_MASTER_VOLUME, DEFAULT_MASTER_VOLUME);
        const savedMusic = loadVolumeSetting(STORAGE_KEY_MUSIC_VOLUME, DEFAULT_MUSIC_VOLUME);
        const savedSfx = loadVolumeSetting(STORAGE_KEY_SFX_VOLUME, DEFAULT_SFX_VOLUME);
        const savedMuted = loadMuteSetting();

        // Create audio context (with webkit fallback for older Safari)
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContextClass();

        // Create master gain node (controls overall volume)
        masterGain = audioContext.createGain();
        masterGain.connect(audioContext.destination);

        // Create music gain node (for background music volume)
        musicGain = audioContext.createGain();
        musicGain.gain.value = savedMusic;
        musicGain.connect(masterGain);

        // Create SFX gain node (for sound effects volume)
        sfxGain = audioContext.createGain();
        sfxGain.gain.value = savedSfx;
        sfxGain.connect(masterGain);

        // Apply saved mute state
        isMuted = savedMuted;
        preMuteVolume = savedMaster;
        masterGain.gain.value = isMuted ? 0 : savedMaster;

        // Resume context if it's in suspended state (common on mobile)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        initialized = true;
        console.log(`Audio initialized (master: ${savedMaster}, music: ${savedMusic}, sfx: ${savedSfx}, muted: ${isMuted})`);
        return true;
    } catch (error) {
        console.error('Failed to initialize audio:', error);
        return false;
    }
}

// =============================================================================
// LOCAL STORAGE HELPERS
// =============================================================================

/**
 * Load a volume setting from localStorage.
 * @param {string} key - Storage key
 * @param {number} defaultValue - Default value if not found or invalid
 * @returns {number} Volume value (0-1)
 */
function loadVolumeSetting(key, defaultValue) {
    try {
        const stored = localStorage.getItem(key);
        if (stored === null) return defaultValue;

        const value = parseFloat(stored);
        if (isNaN(value) || value < 0 || value > 1) return defaultValue;

        return value;
    } catch (e) {
        // localStorage may be disabled or inaccessible
        console.warn('Could not load volume setting:', e);
        return defaultValue;
    }
}

/**
 * Save a volume setting to localStorage.
 * @param {string} key - Storage key
 * @param {number} value - Volume value (0-1)
 */
function saveVolumeSetting(key, value) {
    try {
        localStorage.setItem(key, value.toString());
    } catch (e) {
        // localStorage may be disabled or full
        console.warn('Could not save volume setting:', e);
    }
}

/**
 * Load mute state from localStorage.
 * @returns {boolean} Mute state
 */
function loadMuteSetting() {
    try {
        return localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
    } catch (e) {
        return false;
    }
}

/**
 * Save mute state to localStorage.
 * @param {boolean} muted - Mute state
 */
function saveMuteSetting(muted) {
    try {
        localStorage.setItem(STORAGE_KEY_MUTED, muted.toString());
    } catch (e) {
        console.warn('Could not save mute setting:', e);
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
 * Automatically unmutes if setting a non-zero volume while muted.
 * Persists to localStorage for next session.
 * @param {number} volume - Volume level from 0 to 1
 */
export function setMasterVolume(volume) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    preMuteVolume = clampedVolume;
    saveVolumeSetting(STORAGE_KEY_MASTER_VOLUME, clampedVolume);

    if (masterGain) {
        // If changing volume while muted and new volume > 0, unmute
        if (isMuted && clampedVolume > 0) {
            isMuted = false;
            saveMuteSetting(false);
        }
        masterGain.gain.value = isMuted ? 0 : clampedVolume;
    }
}

/**
 * Set the music volume.
 * Persists to localStorage for next session.
 * @param {number} volume - Volume level from 0 to 1
 */
export function setMusicVolume(volume) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    saveVolumeSetting(STORAGE_KEY_MUSIC_VOLUME, clampedVolume);

    if (musicGain) {
        musicGain.gain.value = clampedVolume;
    }
}

/**
 * Set the sound effects volume.
 * Persists to localStorage for next session.
 * @param {number} volume - Volume level from 0 to 1
 */
export function setSfxVolume(volume) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    saveVolumeSetting(STORAGE_KEY_SFX_VOLUME, clampedVolume);

    if (sfxGain) {
        sfxGain.gain.value = clampedVolume;
    }
}

/**
 * Get current master volume.
 * Returns the configured volume even when muted (not 0).
 * @returns {number} Volume level from 0 to 1, or 0 if not initialized
 */
export function getMasterVolume() {
    // Return the pre-mute volume if muted, so UI shows correct slider position
    if (isMuted) {
        return preMuteVolume;
    }
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

// =============================================================================
// MUTE CONTROLS
// =============================================================================

/**
 * Toggle mute state. When muted, master volume is set to 0.
 * When unmuted, master volume is restored to previous level.
 * Persists to localStorage.
 * @returns {boolean} New mute state (true = muted)
 */
export function toggleMute() {
    isMuted = !isMuted;
    saveMuteSetting(isMuted);

    if (masterGain) {
        masterGain.gain.value = isMuted ? 0 : preMuteVolume;
    }

    console.log(`Audio ${isMuted ? 'muted' : 'unmuted'}`);
    return isMuted;
}

/**
 * Set mute state directly.
 * @param {boolean} muted - Whether to mute
 */
export function setMuted(muted) {
    if (isMuted === muted) return;

    isMuted = muted;
    saveMuteSetting(isMuted);

    if (masterGain) {
        masterGain.gain.value = isMuted ? 0 : preMuteVolume;
    }
}

/**
 * Check if audio is currently muted.
 * @returns {boolean} True if muted
 */
export function getMuted() {
    return isMuted;
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
// VOLUME DUCKING API
// =============================================================================

/**
 * Duck the music volume for explosion impact.
 * Uses Web Audio API's linearRampToValueAtTime for smooth transitions.
 * This affects the music channel gain, leaving SFX untouched.
 * Works with both playMusic() and procedural music systems.
 */
function duckMusic() {
    if (!audioContext || !musicGain) {
        return;
    }

    const now = audioContext.currentTime;

    // Store the current music volume so we can restore it
    preDuckMusicVolume = musicGain.gain.value;

    // Cancel any scheduled gain changes to prevent conflicts
    musicGain.gain.cancelScheduledValues(now);

    // Ramp down to ducked level (as a fraction of current volume)
    const targetVolume = preDuckMusicVolume * DUCK_CONFIG.DUCKED_LEVEL;
    musicGain.gain.setValueAtTime(preDuckMusicVolume, now);
    musicGain.gain.linearRampToValueAtTime(
        targetVolume,
        now + DUCK_CONFIG.DUCK_FADE_IN
    );

    isDucked = true;
}

/**
 * Restore music volume after ducking.
 * Uses Web Audio API's linearRampToValueAtTime for smooth transitions.
 */
function unduckMusic() {
    if (!audioContext || !musicGain) {
        isDucked = false;
        duckEndTime = null;
        return;
    }

    const now = audioContext.currentTime;

    // Cancel any scheduled gain changes
    musicGain.gain.cancelScheduledValues(now);

    // Ramp back up to the pre-duck volume
    const currentGain = musicGain.gain.value;
    musicGain.gain.setValueAtTime(currentGain, now);
    musicGain.gain.linearRampToValueAtTime(
        preDuckMusicVolume,
        now + DUCK_CONFIG.DUCK_FADE_OUT
    );

    isDucked = false;
    duckEndTime = null;
}

/**
 * Trigger volume ducking for an explosion.
 * If already ducked, extends the duck duration (multiple explosions compound).
 * @param {boolean} [isNuclear=false] - Whether this is a nuclear explosion (longer hold)
 */
export function triggerDuck(isNuclear = false) {
    if (!audioContext || !musicGain) {
        return; // Audio not initialized, nothing to duck
    }

    const holdDuration = isNuclear
        ? DUCK_CONFIG.DUCK_HOLD_DURATION_NUCLEAR
        : DUCK_CONFIG.DUCK_HOLD_DURATION;

    // Calculate when we should unduck
    const now = performance.now();
    const fadeInMs = DUCK_CONFIG.DUCK_FADE_IN * 1000;
    const holdMs = holdDuration * 1000;
    const newEndTime = now + fadeInMs + holdMs;

    // If not currently ducked, start ducking
    if (!isDucked) {
        duckMusic();
    }

    // If this explosion would end later than currently scheduled, extend the duck
    if (duckEndTime === null || newEndTime > duckEndTime) {
        duckEndTime = newEndTime;

        // Clear any existing unduck timeout
        if (duckTimeoutId !== null) {
            clearTimeout(duckTimeoutId);
        }

        // Schedule the unduck
        duckTimeoutId = setTimeout(() => {
            unduckMusic();
            duckTimeoutId = null;
        }, fadeInMs + holdMs);
    }
}

/**
 * Check if music is currently ducked.
 * @returns {boolean} True if music is ducked
 */
export function isMusicDucked() {
    return isDucked;
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

/**
 * Play a synthesized UI click sound.
 * Creates a short, satisfying click for button interactions.
 * @param {number} [volume=0.25] - Volume multiplier (0-1)
 */
export function playClickSound(volume = 0.25) {
    if (!audioContext || !sfxGain) {
        return; // Silently fail - UI clicks shouldn't warn
    }

    try {
        const now = audioContext.currentTime;

        // Short, snappy click using a filtered noise burst + quick sine
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // High-pitched sine for clean click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.03);

        // Very quick envelope for snappy feel
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.6, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);

        osc.start(now);
        osc.stop(now + 0.05);
    } catch (error) {
        // Silently fail for UI sounds
    }
}

// =============================================================================
// PROCEDURAL GAME SOUNDS
// =============================================================================

/**
 * Track recent sounds to prevent excessive overlap.
 * Maps sound type to last play timestamp.
 * @type {Map<string, number>}
 */
const recentSounds = new Map();

/**
 * Minimum time between same sounds in ms.
 * Prevents audio clipping from rapid-fire sounds.
 */
const SOUND_COOLDOWN = {
    fire: 100,
    explosion: 50,
    hit: 100,
    miss: 100
};

/**
 * Check if a sound can be played (respects cooldown).
 * @param {string} soundType - Type of sound
 * @returns {boolean} True if sound can be played
 */
function canPlaySound(soundType) {
    const lastPlayed = recentSounds.get(soundType);
    const cooldown = SOUND_COOLDOWN[soundType] || 50;

    if (lastPlayed && (performance.now() - lastPlayed) < cooldown) {
        return false;
    }

    recentSounds.set(soundType, performance.now());
    return true;
}

/**
 * Play a synthesized projectile fire sound.
 * Creates a punchy "thoom" sound for cannon firing.
 * @param {number} [volume=0.5] - Volume multiplier (0-1)
 */
export function playFireSound(volume = 0.5) {
    if (!audioContext || !sfxGain) {
        console.warn('Cannot play fire sound: Audio not initialized');
        return;
    }

    if (!canPlaySound('fire')) {
        return;
    }

    try {
        const now = audioContext.currentTime;

        // Low frequency "thump" oscillator
        const osc1 = audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(150, now);
        osc1.frequency.exponentialRampToValueAtTime(60, now + 0.15);

        // Mid frequency "punch" oscillator
        const osc2 = audioContext.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(300, now);
        osc2.frequency.exponentialRampToValueAtTime(100, now + 0.1);

        // Noise burst for "whoosh" effect
        const noiseBuffer = createNoiseBuffer(0.15);
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        // Filters
        const lowFilter = audioContext.createBiquadFilter();
        lowFilter.type = 'lowpass';
        lowFilter.frequency.value = 400;

        const noiseFilter = audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 2000;

        // Gain nodes for mixing
        const osc1Gain = audioContext.createGain();
        const osc2Gain = audioContext.createGain();
        const noiseGain = audioContext.createGain();
        const masterGainNode = audioContext.createGain();

        // Envelopes
        osc1Gain.gain.setValueAtTime(0, now);
        osc1Gain.gain.linearRampToValueAtTime(volume * 0.8, now + 0.01);
        osc1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc2Gain.gain.setValueAtTime(0, now);
        osc2Gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.005);
        osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        noiseGain.gain.setValueAtTime(volume * 0.15, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        masterGainNode.gain.value = 1;

        // Connect everything
        osc1.connect(lowFilter);
        lowFilter.connect(osc1Gain);
        osc2.connect(osc2Gain);
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);

        osc1Gain.connect(masterGainNode);
        osc2Gain.connect(masterGainNode);
        noiseGain.connect(masterGainNode);
        masterGainNode.connect(sfxGain);

        // Play
        osc1.start(now);
        osc2.start(now);
        noiseSource.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.15);
        noiseSource.stop(now + 0.15);
    } catch (error) {
        console.error('Error playing fire sound:', error);
    }
}

/**
 * Play a synthesized tank hit sound.
 * Creates a metallic impact sound when tank takes damage.
 * @param {number} [volume=0.45] - Volume multiplier (0-1)
 */
export function playHitSound(volume = 0.45) {
    if (!audioContext || !sfxGain) {
        console.warn('Cannot play hit sound: Audio not initialized');
        return;
    }

    if (!canPlaySound('hit')) {
        return;
    }

    try {
        const now = audioContext.currentTime;

        // Metallic ring oscillator (inharmonic frequencies for metal sound)
        const osc1 = audioContext.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(800, now);
        osc1.frequency.exponentialRampToValueAtTime(400, now + 0.08);

        const osc2 = audioContext.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1200, now);
        osc2.frequency.exponentialRampToValueAtTime(600, now + 0.12);

        // Clang overtone
        const osc3 = audioContext.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(2400, now);
        osc3.frequency.exponentialRampToValueAtTime(1500, now + 0.05);

        // Impact thump
        const osc4 = audioContext.createOscillator();
        osc4.type = 'sine';
        osc4.frequency.setValueAtTime(100, now);
        osc4.frequency.exponentialRampToValueAtTime(40, now + 0.1);

        // Gain nodes
        const gain1 = audioContext.createGain();
        const gain2 = audioContext.createGain();
        const gain3 = audioContext.createGain();
        const gain4 = audioContext.createGain();
        const masterGainNode = audioContext.createGain();

        // Envelopes - quick attack, medium decay for metallic ring
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(volume * 0.5, now + 0.005);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(volume * 0.3, now + 0.005);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        gain3.gain.setValueAtTime(0, now);
        gain3.gain.linearRampToValueAtTime(volume * 0.15, now + 0.003);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        gain4.gain.setValueAtTime(0, now);
        gain4.gain.linearRampToValueAtTime(volume * 0.6, now + 0.01);
        gain4.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        masterGainNode.gain.value = 1;

        // Connect
        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        osc4.connect(gain4);
        gain1.connect(masterGainNode);
        gain2.connect(masterGainNode);
        gain3.connect(masterGainNode);
        gain4.connect(masterGainNode);
        masterGainNode.connect(sfxGain);

        // Play
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        osc4.start(now);
        osc1.stop(now + 0.2);
        osc2.stop(now + 0.2);
        osc3.stop(now + 0.1);
        osc4.stop(now + 0.15);
    } catch (error) {
        console.error('Error playing hit sound:', error);
    }
}

/**
 * Play a synthesized terrain miss sound.
 * Creates a dull thud for projectiles hitting dirt (no tank hit).
 * @param {number} [volume=0.3] - Volume multiplier (0-1)
 */
export function playMissSound(volume = 0.3) {
    if (!audioContext || !sfxGain) {
        console.warn('Cannot play miss sound: Audio not initialized');
        return;
    }

    if (!canPlaySound('miss')) {
        return;
    }

    try {
        const now = audioContext.currentTime;

        // Low thud oscillator
        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

        // Soft noise for dirt scatter
        const noiseBuffer = createNoiseBuffer(0.2);
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        // Low pass filter for muffled sound
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;

        const noiseFilter = audioContext.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 600;

        // Gains
        const oscGain = audioContext.createGain();
        const noiseGain = audioContext.createGain();
        const masterGainNode = audioContext.createGain();

        // Envelopes - soft attack for dull impact
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(volume * 0.7, now + 0.02);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        noiseGain.gain.setValueAtTime(volume * 0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        masterGainNode.gain.value = 1;

        // Connect
        osc.connect(filter);
        filter.connect(oscGain);
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        oscGain.connect(masterGainNode);
        noiseGain.connect(masterGainNode);
        masterGainNode.connect(sfxGain);

        // Play
        osc.start(now);
        noiseSource.start(now);
        osc.stop(now + 0.25);
        noiseSource.stop(now + 0.2);
    } catch (error) {
        console.error('Error playing miss sound:', error);
    }
}

/**
 * Play a synthesized explosion sound with variable size.
 * Creates an explosion sound appropriate for the blast radius.
 * Small explosions are crisp, large explosions are bass-heavy.
 * @param {number} blastRadius - Explosion radius (affects sound character)
 * @param {number} [volume=0.5] - Volume multiplier (0-1)
 */
export function playExplosionSound(blastRadius, volume = 0.5) {
    if (!audioContext || !sfxGain) {
        console.warn('Cannot play explosion sound: Audio not initialized');
        return;
    }

    if (!canPlaySound('explosion')) {
        return;
    }

    try {
        const now = audioContext.currentTime;

        // Scale duration and characteristics based on blast radius
        // Small (20-40): short, crisp
        // Medium (40-70): moderate rumble
        // Large (70+): extended bass rumble
        const radiusNorm = Math.min(blastRadius / 100, 1);
        const duration = 0.2 + radiusNorm * 0.4;
        const baseFreq = 200 - radiusNorm * 120; // Larger = lower

        // Create noise buffer for explosion
        const sampleRate = audioContext.sampleRate;
        const bufferSize = Math.floor(duration * sampleRate);
        const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);

        // Fill with noise that decays (steeper decay for small explosions)
        const decayPower = 1.5 + (1 - radiusNorm) * 0.5;
        for (let i = 0; i < bufferSize; i++) {
            const decay = Math.pow(1 - (i / bufferSize), decayPower);
            data[i] = (Math.random() * 2 - 1) * decay;
        }

        // Create source and filters
        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = baseFreq + blastRadius * 4;

        // Add bass for larger explosions
        const bassBoost = audioContext.createBiquadFilter();
        bassBoost.type = 'lowshelf';
        bassBoost.frequency.value = 120;
        bassBoost.gain.value = radiusNorm * 8;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume * (0.4 + radiusNorm * 0.3);

        // Connect
        source.connect(filter);
        filter.connect(bassBoost);
        bassBoost.connect(gainNode);
        gainNode.connect(sfxGain);

        source.start(now);

        // Trigger volume ducking for music (non-nuclear)
        triggerDuck(false);
    } catch (error) {
        console.error('Error playing explosion sound:', error);
    }
}

/**
 * Play a synthesized nuclear explosion sound.
 * Creates a dramatic, bass-heavy rumbling explosion with longer decay.
 * @param {number} blastRadius - Explosion radius (affects sound intensity)
 * @param {number} [volume=0.7] - Volume multiplier (0-1)
 */
export function playNuclearExplosionSound(blastRadius, volume = 0.7) {
    if (!audioContext || !sfxGain) {
        console.warn('Cannot play nuclear explosion sound: Audio not initialized');
        return;
    }

    // Nuclear explosions bypass cooldown - they're dramatic enough to stand alone

    try {
        const now = audioContext.currentTime;

        // Longer duration for nuclear explosion
        const duration = 1.2;
        const sampleRate = audioContext.sampleRate;
        const bufferSize = Math.floor(duration * sampleRate);
        const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);

        // Fill with layered noise: initial crack + rumbling decay
        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;

            // Initial sharp crack (first 10%)
            let sample = 0;
            if (t < 0.1) {
                const crackEnvelope = 1 - (t / 0.1);
                sample = (Math.random() * 2 - 1) * crackEnvelope * crackEnvelope;
            }

            // Deep rumble (throughout)
            const rumbleEnvelope = Math.pow(1 - t, 1.5);
            const rumble = (Math.random() * 2 - 1) * rumbleEnvelope * 0.8;

            // Low frequency modulation for "womp" effect
            const lfoFreq = 8 + t * 20;
            const lfo = Math.sin(t * Math.PI * 2 * lfoFreq) * 0.3;

            sample += rumble * (1 + lfo * rumbleEnvelope);
            data[i] = sample;
        }

        // Create source
        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        // Very low pass filter for bass-heavy sound
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200 + (blastRadius * 2);
        filter.Q.value = 2;

        // Additional sub-bass boost
        const bassBoost = audioContext.createBiquadFilter();
        bassBoost.type = 'lowshelf';
        bassBoost.frequency.value = 100;
        bassBoost.gain.value = 10;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume;

        source.connect(filter);
        filter.connect(bassBoost);
        bassBoost.connect(gainNode);
        gainNode.connect(sfxGain);

        source.start(now);

        // Trigger volume ducking for music (nuclear = longer hold)
        triggerDuck(true);
    } catch (error) {
        console.error('Error playing nuclear explosion sound:', error);
    }
}

/**
 * Play a synthesized landing thud sound.
 * Creates a deep impact sound for tanks landing after falling.
 * @param {number} [volume=0.4] - Volume multiplier (0-1), scales with fall intensity
 */
export function playLandingSound(volume = 0.4) {
    if (!audioContext || !sfxGain) {
        console.warn('Cannot play landing sound: Audio not initialized');
        return;
    }

    try {
        const now = audioContext.currentTime;

        // Short, punchy impact sound
        const duration = 0.25;
        const sampleRate = audioContext.sampleRate;
        const bufferSize = Math.floor(duration * sampleRate);
        const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);

        // Create a short thud: initial impact + quick decay
        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;

            // Quick attack, exponential decay
            const envelope = Math.pow(1 - t, 3);

            // Filtered noise for dirt/impact texture
            const noise = Math.random() * 2 - 1;

            // Low frequency thump (simulates ground impact)
            const thumpFreq = 60 + t * 40; // 60Hz -> 100Hz slight pitch rise
            const thump = Math.sin(t * Math.PI * 2 * thumpFreq) * 0.8;

            // Combine noise and thump with envelope
            const sample = (noise * 0.3 + thump * 0.7) * envelope;
            data[i] = sample;
        }

        // Create source
        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        // Low pass filter for bass-heavy thud
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 1;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = Math.max(0, Math.min(1, volume));

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(sfxGain);

        source.start(now);
    } catch (error) {
        console.error('Error playing landing sound:', error);
    }
}

/**
 * Create a short noise buffer for use in sound effects.
 * @param {number} duration - Duration in seconds
 * @returns {AudioBuffer} Noise buffer
 */
function createNoiseBuffer(duration) {
    const sampleRate = audioContext.sampleRate;
    const bufferSize = Math.floor(duration * sampleRate);
    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    return buffer;
}

// =============================================================================
// ACHIEVEMENT & TOKEN SOUNDS
// =============================================================================

/**
 * Play a synthesized token earn sound.
 * Creates a satisfying coin-like chime for when tokens are earned.
 * Subtle but rewarding, distinct from the full achievement unlock sound.
 * @param {number} [volume=0.3] - Volume multiplier (0-1)
 */
export function playTokenEarnSound(volume = 0.3) {
    if (!audioContext || !sfxGain) {
        return; // Silently fail - don't spam warnings for optional sounds
    }

    try {
        const now = audioContext.currentTime;

        // Two quick high notes for a coin-like sound
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1046, now); // C6
        osc1.frequency.exponentialRampToValueAtTime(1319, now + 0.08); // E6
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(volume * 0.5, now + 0.01);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.connect(gain1);
        gain1.connect(sfxGain);
        osc1.start(now);
        osc1.stop(now + 0.15);

        // Higher overtone for shimmer
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(2093, now + 0.02); // C7
        gain2.gain.setValueAtTime(0, now + 0.02);
        gain2.gain.linearRampToValueAtTime(volume * 0.25, now + 0.04);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc2.connect(gain2);
        gain2.connect(sfxGain);
        osc2.start(now + 0.02);
        osc2.stop(now + 0.15);
    } catch (error) {
        // Silently fail for UI sounds
    }
}

// =============================================================================
// SUPPLY DROP SOUNDS
// =============================================================================

/**
 * Play plane approach sound (distant engine rumble).
 * Low frequency engine drone building up.
 * @param {number} [volume=0.4] - Volume multiplier (0-1)
 */
export function playPlaneApproachSound(volume = 0.4) {
    if (!audioContext || !sfxGain) {
        return;
    }

    try {
        const now = audioContext.currentTime;
        const duration = 1.5;

        // Low frequency drone
        const osc = audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.linearRampToValueAtTime(80, now + duration);

        // Second oscillator for engine throb
        const osc2 = audioContext.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(62, now);
        osc2.frequency.linearRampToValueAtTime(82, now + duration);

        // Low pass filter for muffled distant sound
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.linearRampToValueAtTime(400, now + duration);

        // Tremolo effect (propeller rhythm)
        const tremolo = audioContext.createGain();
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        lfo.frequency.value = 15;
        lfoGain.gain.value = 0.3;
        lfo.connect(lfoGain);
        lfoGain.connect(tremolo.gain);

        // Main envelope - builds up
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.6, now + duration * 0.7);
        gainNode.gain.linearRampToValueAtTime(volume * 0.8, now + duration);

        // Connect
        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(tremolo);
        tremolo.connect(gainNode);
        gainNode.connect(sfxGain);

        lfo.start(now);
        osc.start(now);
        osc2.start(now);
        lfo.stop(now + duration);
        osc.stop(now + duration);
        osc2.stop(now + duration);
    } catch (error) {
        console.warn('Error playing plane approach sound:', error);
    }
}

/**
 * Play plane flyover sound (engine pass with doppler effect).
 * Simulates plane passing overhead.
 * @param {number} [volume=0.5] - Volume multiplier (0-1)
 */
export function playPlaneFlyoverSound(volume = 0.5) {
    if (!audioContext || !sfxGain) {
        return;
    }

    try {
        const now = audioContext.currentTime;
        const duration = 1.0;

        // Engine drone with doppler pitch shift
        const osc = audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + duration); // Doppler down

        const osc2 = audioContext.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(122, now);
        osc2.frequency.exponentialRampToValueAtTime(92, now + duration);

        // Filter also drops for doppler effect
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + duration);
        filter.Q.value = 1;

        // Propeller rhythm
        const tremolo = audioContext.createGain();
        tremolo.gain.value = 1;
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        lfo.frequency.value = 20;
        lfoGain.gain.value = 0.2;
        lfo.connect(lfoGain);
        lfoGain.connect(tremolo.gain);

        // Volume envelope - loud in middle, fades at ends
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(volume * 0.5, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + duration * 0.4);
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + duration);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(tremolo);
        tremolo.connect(gainNode);
        gainNode.connect(sfxGain);

        lfo.start(now);
        osc.start(now);
        osc2.start(now);
        lfo.stop(now + duration);
        osc.stop(now + duration);
        osc2.stop(now + duration);
    } catch (error) {
        console.warn('Error playing plane flyover sound:', error);
    }
}

/**
 * Play crate drop sound (wind whistle as crate falls).
 * Descending whistle effect.
 * @param {number} [volume=0.35] - Volume multiplier (0-1)
 */
export function playCrateDropSound(volume = 0.35) {
    if (!audioContext || !sfxGain) {
        return;
    }

    try {
        const now = audioContext.currentTime;
        const duration = 0.8;

        // High pitched whistle descending
        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + duration);

        // Noise for wind
        const noiseBuffer = createNoiseBuffer(duration);
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        const noiseFilter = audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(2000, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(800, now + duration);
        noiseFilter.Q.value = 1;

        const oscGain = audioContext.createGain();
        oscGain.gain.setValueAtTime(volume * 0.3, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        const noiseGain = audioContext.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(oscGain);
        oscGain.connect(sfxGain);
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(sfxGain);

        osc.start(now);
        noiseSource.start(now);
        osc.stop(now + duration);
        noiseSource.stop(now + duration);
    } catch (error) {
        console.warn('Error playing crate drop sound:', error);
    }
}

/**
 * Play parachute deploy sound (fabric pop/whoosh).
 * Quick snap followed by fluttering.
 * @param {number} [volume=0.4] - Volume multiplier (0-1)
 */
export function playParachuteDeploySound(volume = 0.4) {
    if (!audioContext || !sfxGain) {
        return;
    }

    try {
        const now = audioContext.currentTime;

        // Initial pop/snap
        const noiseBuffer = createNoiseBuffer(0.15);
        const popSource = audioContext.createBufferSource();
        popSource.buffer = noiseBuffer;

        const popFilter = audioContext.createBiquadFilter();
        popFilter.type = 'bandpass';
        popFilter.frequency.value = 1500;
        popFilter.Q.value = 2;

        const popGain = audioContext.createGain();
        popGain.gain.setValueAtTime(volume * 0.8, now);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        popSource.connect(popFilter);
        popFilter.connect(popGain);
        popGain.connect(sfxGain);
        popSource.start(now);
        popSource.stop(now + 0.15);

        // Fabric flutter/whoosh after pop
        const flutterBuffer = createNoiseBuffer(0.4);
        const flutterSource = audioContext.createBufferSource();
        flutterSource.buffer = flutterBuffer;

        const flutterFilter = audioContext.createBiquadFilter();
        flutterFilter.type = 'lowpass';
        flutterFilter.frequency.setValueAtTime(3000, now + 0.05);
        flutterFilter.frequency.exponentialRampToValueAtTime(500, now + 0.4);

        const flutterGain = audioContext.createGain();
        flutterGain.gain.setValueAtTime(0, now + 0.05);
        flutterGain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.1);
        flutterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        flutterSource.connect(flutterFilter);
        flutterFilter.connect(flutterGain);
        flutterGain.connect(sfxGain);
        flutterSource.start(now + 0.05);
        flutterSource.stop(now + 0.5);
    } catch (error) {
        console.warn('Error playing parachute deploy sound:', error);
    }
}

/**
 * Play crate landing sound (thud + dust).
 * Heavy impact on ground.
 * @param {number} [volume=0.5] - Volume multiplier (0-1)
 */
export function playCrateLandSound(volume = 0.5) {
    if (!audioContext || !sfxGain) {
        return;
    }

    try {
        const now = audioContext.currentTime;

        // Deep thud
        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;

        const thudGain = audioContext.createGain();
        thudGain.gain.setValueAtTime(0, now);
        thudGain.gain.linearRampToValueAtTime(volume * 0.8, now + 0.02);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(filter);
        filter.connect(thudGain);
        thudGain.connect(sfxGain);

        // Creak/wood sound
        const creakOsc = audioContext.createOscillator();
        creakOsc.type = 'triangle';
        creakOsc.frequency.setValueAtTime(200, now + 0.02);
        creakOsc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

        const creakGain = audioContext.createGain();
        creakGain.gain.setValueAtTime(0, now + 0.02);
        creakGain.gain.linearRampToValueAtTime(volume * 0.2, now + 0.05);
        creakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        creakOsc.connect(creakGain);
        creakGain.connect(sfxGain);

        // Dust scatter noise
        const dustBuffer = createNoiseBuffer(0.2);
        const dustSource = audioContext.createBufferSource();
        dustSource.buffer = dustBuffer;

        const dustFilter = audioContext.createBiquadFilter();
        dustFilter.type = 'lowpass';
        dustFilter.frequency.value = 400;

        const dustGain = audioContext.createGain();
        dustGain.gain.setValueAtTime(volume * 0.3, now + 0.03);
        dustGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        dustSource.connect(dustFilter);
        dustFilter.connect(dustGain);
        dustGain.connect(sfxGain);

        osc.start(now);
        creakOsc.start(now + 0.02);
        dustSource.start(now + 0.03);
        osc.stop(now + 0.35);
        creakOsc.stop(now + 0.2);
        dustSource.stop(now + 0.3);
    } catch (error) {
        console.warn('Error playing crate land sound:', error);
    }
}

/**
 * Play supply drop reveal sound based on rarity.
 * Each rarity has a unique reveal sound from simple to epic.
 * @param {string} rarity - Tank rarity: 'common', 'uncommon', 'rare', 'epic', 'legendary'
 * @param {number} [volume=0.5] - Volume multiplier (0-1)
 */
export function playRevealSound(rarity, volume = 0.5) {
    if (!audioContext || !sfxGain) {
        return;
    }

    switch (rarity) {
        case 'common':
            playCommonRevealSound(volume);
            break;
        case 'uncommon':
            playUncommonRevealSound(volume);
            break;
        case 'rare':
            playRareRevealSound(volume);
            break;
        case 'epic':
            playEpicRevealSound(volume);
            break;
        case 'legendary':
            playLegendaryRevealSound(volume);
            break;
        default:
            playCommonRevealSound(volume);
    }
}

/**
 * Common reveal - Basic synth hit.
 */
function playCommonRevealSound(volume) {
    try {
        const now = audioContext.currentTime;

        const osc = audioContext.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);

        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.5, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);

        osc.start(now);
        osc.stop(now + 0.25);
    } catch (error) {
        console.warn('Error playing common reveal sound:', error);
    }
}

/**
 * Uncommon reveal - Ascending synth.
 */
function playUncommonRevealSound(volume) {
    try {
        const now = audioContext.currentTime;

        // Ascending two-note pattern
        const osc1 = audioContext.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(330, now); // E4
        const osc1Gain = audioContext.createGain();
        osc1Gain.gain.setValueAtTime(0, now);
        osc1Gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.02);
        osc1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.connect(osc1Gain);
        osc1Gain.connect(sfxGain);

        const osc2 = audioContext.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(440, now + 0.1); // A4
        const osc2Gain = audioContext.createGain();
        osc2Gain.gain.setValueAtTime(0, now + 0.1);
        osc2Gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.12);
        osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc2.connect(osc2Gain);
        osc2Gain.connect(sfxGain);

        osc1.start(now);
        osc2.start(now + 0.1);
        osc1.stop(now + 0.2);
        osc2.stop(now + 0.35);
    } catch (error) {
        console.warn('Error playing uncommon reveal sound:', error);
    }
}

/**
 * Rare reveal - Power chord.
 */
function playRareRevealSound(volume) {
    try {
        const now = audioContext.currentTime;

        // Power chord: root + fifth
        const root = audioContext.createOscillator();
        root.type = 'sawtooth';
        root.frequency.setValueAtTime(196, now); // G3

        const fifth = audioContext.createOscillator();
        fifth.type = 'sawtooth';
        fifth.frequency.setValueAtTime(294, now); // D4

        const octave = audioContext.createOscillator();
        octave.type = 'sawtooth';
        octave.frequency.setValueAtTime(392, now); // G4

        // Distortion-like filter
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        filter.Q.value = 2;

        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.5, now + 0.02);
        gainNode.gain.setValueAtTime(volume * 0.5, now + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        root.connect(filter);
        fifth.connect(filter);
        octave.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(sfxGain);

        root.start(now);
        fifth.start(now);
        octave.start(now);
        root.stop(now + 0.65);
        fifth.stop(now + 0.65);
        octave.stop(now + 0.65);
    } catch (error) {
        console.warn('Error playing rare reveal sound:', error);
    }
}

/**
 * Epic reveal - Full synth riff (3-4 seconds).
 */
function playEpicRevealSound(volume) {
    try {
        const now = audioContext.currentTime;

        // Dramatic ascending arpeggio with synthwave character
        const notes = [
            { freq: 196, time: 0 },      // G3
            { freq: 247, time: 0.15 },   // B3
            { freq: 294, time: 0.3 },    // D4
            { freq: 392, time: 0.45 },   // G4
            { freq: 494, time: 0.6 },    // B4
            { freq: 587, time: 0.8 },    // D5
            { freq: 784, time: 1.0 },    // G5 - hold
        ];

        notes.forEach(note => {
            const osc = audioContext.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(note.freq, now + note.time);

            const osc2 = audioContext.createOscillator();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(note.freq * 2, now + note.time);

            const filter = audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(3000, now + note.time);
            filter.frequency.exponentialRampToValueAtTime(1000, now + note.time + 0.5);

            const noteGain = audioContext.createGain();
            const isLastNote = note.freq === 784;
            const duration = isLastNote ? 2.0 : 0.25;

            noteGain.gain.setValueAtTime(0, now + note.time);
            noteGain.gain.linearRampToValueAtTime(volume * 0.4, now + note.time + 0.02);
            if (isLastNote) {
                noteGain.gain.setValueAtTime(volume * 0.5, now + note.time + 0.1);
                noteGain.gain.exponentialRampToValueAtTime(0.001, now + note.time + duration);
            } else {
                noteGain.gain.exponentialRampToValueAtTime(0.001, now + note.time + duration);
            }

            const osc2Gain = audioContext.createGain();
            osc2Gain.gain.value = 0.3;

            osc.connect(filter);
            osc2.connect(osc2Gain);
            osc2Gain.connect(filter);
            filter.connect(noteGain);
            noteGain.connect(sfxGain);

            osc.start(now + note.time);
            osc2.start(now + note.time);
            osc.stop(now + note.time + duration + 0.1);
            osc2.stop(now + note.time + duration + 0.1);
        });

        // Add shimmer/sparkle effect
        const shimmer = audioContext.createOscillator();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(1568, now + 1.2);
        shimmer.frequency.exponentialRampToValueAtTime(2093, now + 2.5);

        const shimmerGain = audioContext.createGain();
        shimmerGain.gain.setValueAtTime(0, now + 1.2);
        shimmerGain.gain.linearRampToValueAtTime(volume * 0.2, now + 1.5);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

        shimmer.connect(shimmerGain);
        shimmerGain.connect(sfxGain);
        shimmer.start(now + 1.2);
        shimmer.stop(now + 3.0);
    } catch (error) {
        console.warn('Error playing epic reveal sound:', error);
    }
}

/**
 * Legendary reveal - Epic 80s anthem sting.
 * Full dramatic fanfare worthy of a legendary unlock.
 */
function playLegendaryRevealSound(volume) {
    try {
        const now = audioContext.currentTime;

        // Dramatic intro hit
        const introHit = audioContext.createOscillator();
        introHit.type = 'sawtooth';
        introHit.frequency.setValueAtTime(98, now); // G2

        const introHit2 = audioContext.createOscillator();
        introHit2.type = 'sawtooth';
        introHit2.frequency.setValueAtTime(196, now); // G3

        const introFilter = audioContext.createBiquadFilter();
        introFilter.type = 'lowpass';
        introFilter.frequency.value = 1500;

        const introGain = audioContext.createGain();
        introGain.gain.setValueAtTime(0, now);
        introGain.gain.linearRampToValueAtTime(volume * 0.7, now + 0.02);
        introGain.gain.setValueAtTime(volume * 0.7, now + 0.2);
        introGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        introHit.connect(introFilter);
        introHit2.connect(introFilter);
        introFilter.connect(introGain);
        introGain.connect(sfxGain);

        introHit.start(now);
        introHit2.start(now);
        introHit.stop(now + 0.8);
        introHit2.stop(now + 0.8);

        // Main fanfare melody
        const melody = [
            { freq: 392, time: 0.3, dur: 0.2 },   // G4
            { freq: 494, time: 0.5, dur: 0.2 },   // B4
            { freq: 587, time: 0.7, dur: 0.2 },   // D5
            { freq: 784, time: 0.9, dur: 0.8 },   // G5 (long)
            { freq: 740, time: 1.7, dur: 0.2 },   // F#5
            { freq: 784, time: 1.9, dur: 0.2 },   // G5
            { freq: 880, time: 2.1, dur: 1.5 },   // A5 (triumphant hold)
        ];

        melody.forEach(note => {
            // Lead synth
            const lead = audioContext.createOscillator();
            lead.type = 'sawtooth';
            lead.frequency.setValueAtTime(note.freq, now + note.time);

            // Detuned for fatness
            const lead2 = audioContext.createOscillator();
            lead2.type = 'sawtooth';
            lead2.frequency.setValueAtTime(note.freq * 1.005, now + note.time);

            // Square for punch
            const square = audioContext.createOscillator();
            square.type = 'square';
            square.frequency.setValueAtTime(note.freq, now + note.time);

            const filter = audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(4000, now + note.time);
            filter.frequency.exponentialRampToValueAtTime(2000, now + note.time + note.dur);

            const noteGain = audioContext.createGain();
            noteGain.gain.setValueAtTime(0, now + note.time);
            noteGain.gain.linearRampToValueAtTime(volume * 0.5, now + note.time + 0.02);
            noteGain.gain.setValueAtTime(volume * 0.5, now + note.time + note.dur * 0.7);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

            const squareGain = audioContext.createGain();
            squareGain.gain.value = 0.2;

            lead.connect(filter);
            lead2.connect(filter);
            square.connect(squareGain);
            squareGain.connect(filter);
            filter.connect(noteGain);
            noteGain.connect(sfxGain);

            lead.start(now + note.time);
            lead2.start(now + note.time);
            square.start(now + note.time);
            lead.stop(now + note.time + note.dur + 0.1);
            lead2.stop(now + note.time + note.dur + 0.1);
            square.stop(now + note.time + note.dur + 0.1);
        });

        // Sustained pad underneath
        const pad = audioContext.createOscillator();
        pad.type = 'sine';
        pad.frequency.setValueAtTime(196, now + 0.3); // G3

        const pad2 = audioContext.createOscillator();
        pad2.type = 'sine';
        pad2.frequency.setValueAtTime(294, now + 0.3); // D4

        const padGain = audioContext.createGain();
        padGain.gain.setValueAtTime(0, now + 0.3);
        padGain.gain.linearRampToValueAtTime(volume * 0.25, now + 0.8);
        padGain.gain.setValueAtTime(volume * 0.25, now + 3.0);
        padGain.gain.exponentialRampToValueAtTime(0.001, now + 4.0);

        pad.connect(padGain);
        pad2.connect(padGain);
        padGain.connect(sfxGain);

        pad.start(now + 0.3);
        pad2.start(now + 0.3);
        pad.stop(now + 4.0);
        pad2.stop(now + 4.0);

        // Final shimmer/sparkle
        const shimmer = audioContext.createOscillator();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(2093, now + 2.3);
        shimmer.frequency.linearRampToValueAtTime(4186, now + 3.5);

        const shimmerGain = audioContext.createGain();
        shimmerGain.gain.setValueAtTime(0, now + 2.3);
        shimmerGain.gain.linearRampToValueAtTime(volume * 0.15, now + 2.6);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 4.0);

        shimmer.connect(shimmerGain);
        shimmerGain.connect(sfxGain);
        shimmer.start(now + 2.3);
        shimmer.stop(now + 4.0);
    } catch (error) {
        console.warn('Error playing legendary reveal sound:', error);
    }
}

// =============================================================================
// EXTRACTION REVEAL SOUNDS (LEGENDARY ALTERNATIVE)
// =============================================================================

/**
 * Play radio static/interference sound.
 * Used during the "INCOMING TRANSMISSION" phase.
 * @param {number} [volume=0.3] - Volume multiplier (0-1)
 * @param {number} [duration=1.5] - Duration in seconds
 * @returns {AudioBufferSourceNode|null} The noise source for stopping later
 */
export function playRadioStaticSound(volume = 0.3, duration = 1.5) {
    if (!audioContext || !sfxGain) {
        return null;
    }

    try {
        const now = audioContext.currentTime;

        // White noise base
        const noiseBuffer = createNoiseBuffer(duration);
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        // Bandpass filter for radio character
        const filter = audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 1;

        // Crackling modulation
        const lfo = audioContext.createOscillator();
        lfo.frequency.value = 8;
        const lfoGain = audioContext.createGain();
        lfoGain.gain.value = 0.5;

        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(volume * 0.5, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + duration * 0.3);
        gainNode.gain.setValueAtTime(volume, now + duration * 0.7);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);

        lfo.connect(lfoGain);
        lfoGain.connect(gainNode.gain);

        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(sfxGain);

        lfo.start(now);
        noiseSource.start(now);
        lfo.stop(now + duration);
        noiseSource.stop(now + duration);

        return noiseSource;
    } catch (error) {
        console.warn('Error playing radio static sound:', error);
        return null;
    }
}

/**
 * Play helicopter rotor sound.
 * Continuous chopping sound for helicopter approach.
 * @param {number} [volume=0.4] - Volume multiplier (0-1)
 * @param {number} [duration=3.0] - Duration in seconds
 * @returns {Object|null} Object with stop() method to end the sound
 */
export function playHelicopterRotorSound(volume = 0.4, duration = 3.0) {
    if (!audioContext || !sfxGain) {
        return null;
    }

    try {
        const now = audioContext.currentTime;

        // Low frequency rotor chop
        const osc = audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 40;

        // Blade whoosh noise
        const noiseBuffer = createNoiseBuffer(duration);
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        const noiseFilter = audioContext.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 600;

        // Chopping modulation (rotor rhythm)
        const chopLfo = audioContext.createOscillator();
        chopLfo.frequency.value = 6; // ~6 Hz for helicopter rotor
        const chopGain = audioContext.createGain();
        chopGain.gain.value = 0.8;

        const modGain = audioContext.createGain();
        modGain.gain.value = 0.2;

        chopLfo.connect(chopGain);
        chopGain.connect(modGain.gain);

        // Master gain envelope
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.5);
        gainNode.gain.setValueAtTime(volume, now + duration - 0.5);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);

        osc.connect(modGain);
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(modGain);
        modGain.connect(gainNode);
        gainNode.connect(sfxGain);

        chopLfo.start(now);
        osc.start(now);
        noiseSource.start(now);
        chopLfo.stop(now + duration);
        osc.stop(now + duration);
        noiseSource.stop(now + duration);

        return {
            stop: () => {
                try {
                    osc.stop();
                    noiseSource.stop();
                    chopLfo.stop();
                } catch (e) {
                    // Already stopped
                }
            }
        };
    } catch (error) {
        console.warn('Error playing helicopter rotor sound:', error);
        return null;
    }
}

/**
 * Play rotor wash/wind sound.
 * Intense wind effect from helicopter downdraft.
 * @param {number} [volume=0.35] - Volume multiplier (0-1)
 * @param {number} [duration=2.0] - Duration in seconds
 */
export function playRotorWashSound(volume = 0.35, duration = 2.0) {
    if (!audioContext || !sfxGain) {
        return;
    }

    try {
        const now = audioContext.currentTime;

        // Heavy wind noise
        const noiseBuffer = createNoiseBuffer(duration);
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        // Low rumble component
        const lowFilter = audioContext.createBiquadFilter();
        lowFilter.type = 'lowpass';
        lowFilter.frequency.value = 300;

        // Higher wind component
        const highFilter = audioContext.createBiquadFilter();
        highFilter.type = 'bandpass';
        highFilter.frequency.value = 1500;
        highFilter.Q.value = 0.5;

        const lowGain = audioContext.createGain();
        lowGain.gain.value = volume * 0.6;

        const highGain = audioContext.createGain();
        highGain.gain.value = volume * 0.4;

        // Master envelope
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + 0.3);
        gainNode.gain.setValueAtTime(1, now + duration - 0.3);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);

        noiseSource.connect(lowFilter);
        noiseSource.connect(highFilter);
        lowFilter.connect(lowGain);
        highFilter.connect(highGain);
        lowGain.connect(gainNode);
        highGain.connect(gainNode);
        gainNode.connect(sfxGain);

        noiseSource.start(now);
        noiseSource.stop(now + duration);
    } catch (error) {
        console.warn('Error playing rotor wash sound:', error);
    }
}

/**
 * Play cable release sound.
 * Mechanical click/clunk of cable detaching.
 * @param {number} [volume=0.45] - Volume multiplier (0-1)
 */
export function playCableReleaseSound(volume = 0.45) {
    if (!audioContext || !sfxGain) {
        return;
    }

    try {
        const now = audioContext.currentTime;

        // Metallic clunk
        const osc = audioContext.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);

        // Higher metallic ping
        const ping = audioContext.createOscillator();
        ping.type = 'sine';
        ping.frequency.setValueAtTime(1200, now);
        ping.frequency.exponentialRampToValueAtTime(800, now + 0.08);

        const oscGain = audioContext.createGain();
        oscGain.gain.setValueAtTime(volume * 0.6, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        const pingGain = audioContext.createGain();
        pingGain.gain.setValueAtTime(volume * 0.3, now);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        // Short noise burst
        const noiseBuffer = createNoiseBuffer(0.05);
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        const noiseFilter = audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 2000;

        const noiseGain = audioContext.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(oscGain);
        ping.connect(pingGain);
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        oscGain.connect(sfxGain);
        pingGain.connect(sfxGain);
        noiseGain.connect(sfxGain);

        osc.start(now);
        ping.start(now);
        noiseSource.start(now);
        osc.stop(now + 0.2);
        ping.stop(now + 0.15);
        noiseSource.stop(now + 0.1);
    } catch (error) {
        console.warn('Error playing cable release sound:', error);
    }
}

/**
 * Play extraction fanfare.
 * Triumphant military-style fanfare for legendary extraction complete.
 * @param {number} [volume=0.55] - Volume multiplier (0-1)
 */
export function playExtractionFanfareSound(volume = 0.55) {
    if (!audioContext || !sfxGain) {
        return;
    }

    // The legendary reveal sound already has a full fanfare
    // Use it for the extraction as well, possibly with slight variation
    playLegendaryRevealSound(volume);
}
