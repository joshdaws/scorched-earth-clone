/**
 * Scorched Earth: Synthwave Edition
 * Procedural Music System
 *
 * Generates synthwave-style background music for different game states.
 * Uses Web Audio API oscillators and filters to create atmospheric tracks.
 */

import * as Sound from './sound.js';
import { GAME_STATES } from './constants.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {boolean} Whether the music system is initialized */
let initialized = false;

/** @type {string|null} Currently playing music track ID */
let currentTrackId = null;

/** @type {Object|null} Current music generator instance */
let currentGenerator = null;

/** @type {boolean} Whether music is muted (independent of SFX) */
let musicMuted = false;

/** @type {number} Music volume before muting (to restore) */
let preMuteVolume = 0.5;

// =============================================================================
// MUSIC CONFIGURATION
// =============================================================================

/**
 * Music track configurations for different game states.
 * Each defines tempo, key, and synthesis parameters.
 */
const TRACK_CONFIG = {
    menu: {
        name: 'Menu Theme',
        tempo: 85,              // Slow, ambient
        key: 'minor',
        baseNote: 36,           // C2 (MIDI note)
        style: 'ambient',
        padVolume: 0.15,
        bassVolume: 0.12,
        arpVolume: 0.08
    },
    gameplay: {
        name: 'Battle Theme',
        tempo: 120,             // Mid-tempo, driving
        key: 'minor',
        baseNote: 36,
        style: 'driving',
        padVolume: 0.12,
        bassVolume: 0.18,
        arpVolume: 0.12
    },
    shop: {
        name: 'Shop Theme',
        tempo: 95,              // Relaxed
        key: 'major',
        baseNote: 38,           // D2
        style: 'chill',
        padVolume: 0.14,
        bassVolume: 0.10,
        arpVolume: 0.10
    }
};

/**
 * Crossfade duration in seconds for music transitions.
 */
const CROSSFADE_DURATION = 1.5;

/**
 * Convert MIDI note number to frequency.
 * @param {number} note - MIDI note number
 * @returns {number} Frequency in Hz
 */
function midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

// =============================================================================
// MUSIC GENERATOR CLASS
// =============================================================================

/**
 * Generates procedural synthwave music using Web Audio API.
 * Creates layered synthesis with pads, bass, and arpeggios.
 */
class MusicGenerator {
    /**
     * @param {AudioContext} ctx - Web Audio context
     * @param {GainNode} destination - Destination gain node (music channel)
     * @param {Object} config - Track configuration
     */
    constructor(ctx, destination, config) {
        this.ctx = ctx;
        this.destination = destination;
        this.config = config;
        this.isPlaying = false;
        this.nodes = [];
        this.intervals = [];

        // Master gain for this track (for fading)
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 0;
        this.masterGain.connect(destination);

        // Build chord progressions
        this.chordProgression = this.buildChordProgression();
        this.currentChordIndex = 0;
        this.beatCount = 0;
    }

    /**
     * Build chord progression based on key and style.
     * @returns {number[][]} Array of chord intervals
     */
    buildChordProgression() {
        if (this.config.key === 'minor') {
            // Classic synthwave minor progression: i - VI - III - VII
            return [
                [0, 3, 7],      // i minor
                [8, 12, 15],    // VI major
                [3, 7, 10],     // III major
                [10, 14, 17]    // VII major
            ];
        } else {
            // Major progression: I - V - vi - IV
            return [
                [0, 4, 7],      // I major
                [7, 11, 14],    // V major
                [9, 12, 16],    // vi minor
                [5, 9, 12]      // IV major
            ];
        }
    }

    /**
     * Get current chord frequencies.
     * @returns {number[]} Array of frequencies
     */
    getCurrentChord() {
        const intervals = this.chordProgression[this.currentChordIndex];
        return intervals.map(i => midiToFreq(this.config.baseNote + i + 12)); // One octave up
    }

    /**
     * Start music playback.
     * @param {number} [fadeIn=0] - Fade in duration in seconds
     */
    start(fadeIn = 0) {
        if (this.isPlaying) return;
        this.isPlaying = true;

        // Fade in master gain
        const now = this.ctx.currentTime;
        if (fadeIn > 0) {
            this.masterGain.gain.setValueAtTime(0, now);
            this.masterGain.gain.linearRampToValueAtTime(1, now + fadeIn);
        } else {
            this.masterGain.gain.value = 1;
        }

        // Start all layers
        this.startPadLayer();
        this.startBassLayer();

        if (this.config.style !== 'ambient') {
            this.startArpLayer();
        }

        // Start progression timer
        const beatsPerChord = 8;
        const beatDuration = 60 / this.config.tempo;
        const chordDuration = beatDuration * beatsPerChord * 1000;

        this.progressionInterval = setInterval(() => {
            this.currentChordIndex = (this.currentChordIndex + 1) % this.chordProgression.length;
            this.updateChord();
        }, chordDuration);

        this.intervals.push(this.progressionInterval);
    }

    /**
     * Stop music playback.
     * @param {number} [fadeOut=0] - Fade out duration in seconds
     */
    stop(fadeOut = 0) {
        if (!this.isPlaying) return;

        const now = this.ctx.currentTime;

        if (fadeOut > 0) {
            this.masterGain.gain.linearRampToValueAtTime(0, now + fadeOut);

            // Clean up after fade
            setTimeout(() => {
                this.cleanup();
            }, fadeOut * 1000);
        } else {
            this.cleanup();
        }

        this.isPlaying = false;
    }

    /**
     * Clean up all audio nodes and intervals.
     */
    cleanup() {
        // Stop all intervals
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];

        // Stop all oscillators
        this.nodes.forEach(node => {
            try {
                if (node.stop) node.stop();
                if (node.disconnect) node.disconnect();
            } catch (e) {
                // Ignore errors from already-stopped nodes
            }
        });
        this.nodes = [];

        // Reset state
        this.currentChordIndex = 0;
        this.beatCount = 0;
    }

    /**
     * Create the ambient pad layer - slow-moving chords with filter.
     */
    startPadLayer() {
        const chord = this.getCurrentChord();

        // Create oscillators for each note in the chord
        this.padOscs = chord.map((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;

            // Slight detune for thickness
            osc.detune.value = (i - 1) * 8;

            return osc;
        });

        // Low-pass filter for warmth
        this.padFilter = this.ctx.createBiquadFilter();
        this.padFilter.type = 'lowpass';
        this.padFilter.frequency.value = 800;
        this.padFilter.Q.value = 1;

        // Pad gain
        this.padGain = this.ctx.createGain();
        this.padGain.gain.value = this.config.padVolume;

        // Connect: oscs → filter → gain → master
        this.padOscs.forEach(osc => {
            osc.connect(this.padFilter);
            osc.start();
            this.nodes.push(osc);
        });

        this.padFilter.connect(this.padGain);
        this.padGain.connect(this.masterGain);

        // Animate filter for movement
        this.animatePadFilter();
    }

    /**
     * Animate the pad filter cutoff for movement.
     */
    animatePadFilter() {
        const lfoFreq = 0.1; // Very slow
        const minCutoff = 400;
        const maxCutoff = 1200;

        const animate = () => {
            if (!this.isPlaying || !this.padFilter) return;

            const t = this.ctx.currentTime;
            const value = minCutoff + (maxCutoff - minCutoff) * (0.5 + 0.5 * Math.sin(t * lfoFreq * 2 * Math.PI));
            this.padFilter.frequency.value = value;

            requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * Update pad oscillators when chord changes.
     */
    updateChord() {
        if (!this.isPlaying) return;

        const chord = this.getCurrentChord();
        const now = this.ctx.currentTime;
        const glideTime = 0.3;

        // Glide pad oscillators to new frequencies
        if (this.padOscs) {
            this.padOscs.forEach((osc, i) => {
                if (chord[i]) {
                    osc.frequency.linearRampToValueAtTime(chord[i], now + glideTime);
                }
            });
        }

        // Update bass
        if (this.bassOsc) {
            const bassNote = this.chordProgression[this.currentChordIndex][0];
            const bassFreq = midiToFreq(this.config.baseNote + bassNote);
            this.bassOsc.frequency.linearRampToValueAtTime(bassFreq, now + glideTime);
        }
    }

    /**
     * Create the bass layer - octave bass following root notes.
     */
    startBassLayer() {
        // Main bass oscillator
        this.bassOsc = this.ctx.createOscillator();
        this.bassOsc.type = 'sawtooth';

        const bassNote = this.chordProgression[this.currentChordIndex][0];
        this.bassOsc.frequency.value = midiToFreq(this.config.baseNote + bassNote);

        // Sub oscillator for weight
        this.subOsc = this.ctx.createOscillator();
        this.subOsc.type = 'sine';
        this.subOsc.frequency.value = this.bassOsc.frequency.value / 2;

        // Low-pass for warmth
        const bassFilter = this.ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.value = 300;

        // Gains
        const bassGain = this.ctx.createGain();
        bassGain.gain.value = this.config.bassVolume * 0.7;

        const subGain = this.ctx.createGain();
        subGain.gain.value = this.config.bassVolume * 0.5;

        // Connect
        this.bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.masterGain);

        this.subOsc.connect(subGain);
        subGain.connect(this.masterGain);

        this.bassOsc.start();
        this.subOsc.start();

        this.nodes.push(this.bassOsc, this.subOsc);

        // For driving style, add rhythm
        if (this.config.style === 'driving') {
            this.startBassRhythm(bassGain);
        }
    }

    /**
     * Add rhythmic pumping to bass for driving tracks.
     * @param {GainNode} bassGain - Bass gain node to modulate
     */
    startBassRhythm(bassGain) {
        const beatDuration = 60 / this.config.tempo;

        const pump = () => {
            if (!this.isPlaying) return;

            const now = this.ctx.currentTime;

            // Quick attack, gradual release (sidechain-style pump)
            bassGain.gain.setValueAtTime(this.config.bassVolume * 0.3, now);
            bassGain.gain.linearRampToValueAtTime(this.config.bassVolume * 0.7, now + beatDuration * 0.1);
            bassGain.gain.linearRampToValueAtTime(this.config.bassVolume * 0.5, now + beatDuration * 0.8);
        };

        const interval = setInterval(pump, beatDuration * 1000);
        this.intervals.push(interval);
        pump(); // Start immediately
    }

    /**
     * Create the arpeggio layer - classic synthwave arpeggiated pattern.
     */
    startArpLayer() {
        // Arpeggiator oscillator (reused for each note)
        this.arpOsc = this.ctx.createOscillator();
        this.arpOsc.type = 'square';

        // Filter for classic arp sound
        this.arpFilter = this.ctx.createBiquadFilter();
        this.arpFilter.type = 'lowpass';
        this.arpFilter.frequency.value = 2000;
        this.arpFilter.Q.value = 2;

        // Arp gain
        this.arpGain = this.ctx.createGain();
        this.arpGain.gain.value = 0; // Will be pulsed

        // Connect
        this.arpOsc.connect(this.arpFilter);
        this.arpFilter.connect(this.arpGain);
        this.arpGain.connect(this.masterGain);

        this.arpOsc.start();
        this.nodes.push(this.arpOsc);

        // Start arp pattern
        this.runArpPattern();
    }

    /**
     * Run the arpeggiator pattern.
     */
    runArpPattern() {
        const beatDuration = 60 / this.config.tempo;
        const noteDuration = beatDuration / 4; // 16th notes

        // Arp pattern: up and down through chord
        let step = 0;
        const pattern = [0, 1, 2, 1]; // Indices into chord

        const playNote = () => {
            if (!this.isPlaying || !this.arpOsc || !this.arpGain) return;

            const chord = this.getCurrentChord();
            const noteIndex = pattern[step % pattern.length];
            const freq = chord[noteIndex] * 2; // One octave up

            const now = this.ctx.currentTime;

            // Set frequency
            this.arpOsc.frequency.setValueAtTime(freq, now);

            // Envelope
            this.arpGain.gain.setValueAtTime(0, now);
            this.arpGain.gain.linearRampToValueAtTime(this.config.arpVolume, now + 0.01);
            this.arpGain.gain.exponentialRampToValueAtTime(0.001, now + noteDuration * 0.8);

            step++;
        };

        const interval = setInterval(playNote, noteDuration * 1000);
        this.intervals.push(interval);
        playNote(); // Start immediately
    }
}

// =============================================================================
// STINGER GENERATORS
// =============================================================================

/**
 * Play a victory stinger - triumphant ascending phrase.
 * @param {number} [volume=0.4] - Volume multiplier
 */
export function playVictoryStinger(volume = 0.4) {
    const ctx = Sound.getContext();
    const destination = Sound.getMusicGain();

    if (!ctx || !destination || musicMuted) return;

    const now = ctx.currentTime;

    // Ascending major arpeggio with fanfare quality
    const notes = [60, 64, 67, 72, 76, 79]; // C major arpeggio up
    const durations = [0.15, 0.15, 0.15, 0.15, 0.15, 0.4];

    let time = 0;

    notes.forEach((note, i) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';

        const freq = midiToFreq(note);
        osc1.frequency.value = freq;
        osc2.frequency.value = freq * 2;

        const osc1Gain = ctx.createGain();
        const osc2Gain = ctx.createGain();
        osc1Gain.gain.value = 0.6;
        osc2Gain.gain.value = 0.3;

        osc1.connect(osc1Gain);
        osc2.connect(osc2Gain);
        osc1Gain.connect(gain);
        osc2Gain.connect(gain);

        // Envelope
        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(volume * 0.6, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + durations[i]);

        gain.connect(destination);

        osc1.start(now + time);
        osc2.start(now + time);
        osc1.stop(now + time + durations[i] + 0.1);
        osc2.stop(now + time + durations[i] + 0.1);

        time += durations[i];
    });

    // Final sustained chord
    const chordNotes = [72, 76, 79, 84]; // C major chord high
    chordNotes.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = midiToFreq(note);

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(volume * 0.3, now + time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + 1.0);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(now + time);
        osc.stop(now + time + 1.1);
    });
}

/**
 * Play a defeat stinger - descending minor phrase.
 * @param {number} [volume=0.35] - Volume multiplier
 */
export function playDefeatStinger(volume = 0.35) {
    const ctx = Sound.getContext();
    const destination = Sound.getMusicGain();

    if (!ctx || !destination || musicMuted) return;

    const now = ctx.currentTime;

    // Descending minor phrase - sad and final
    const notes = [72, 71, 68, 67, 63, 60]; // Descending minor
    const durations = [0.2, 0.2, 0.2, 0.3, 0.3, 0.6];

    let time = 0;

    notes.forEach((note, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = midiToFreq(note);

        filter.type = 'lowpass';
        filter.frequency.value = 800 - i * 80; // Darker as it descends

        // Envelope - longer decay for final notes
        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(volume * 0.5, now + time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + durations[i]);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        osc.start(now + time);
        osc.stop(now + time + durations[i] + 0.1);

        time += durations[i] * 0.7; // Overlapping notes for legato
    });

    // Final low note
    const finalOsc = ctx.createOscillator();
    const finalGain = ctx.createGain();

    finalOsc.type = 'sine';
    finalOsc.frequency.value = midiToFreq(36); // Low C

    finalGain.gain.setValueAtTime(0, now + time);
    finalGain.gain.linearRampToValueAtTime(volume * 0.4, now + time + 0.1);
    finalGain.gain.exponentialRampToValueAtTime(0.001, now + time + 1.5);

    finalOsc.connect(finalGain);
    finalGain.connect(destination);

    finalOsc.start(now + time);
    finalOsc.stop(now + time + 1.6);
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize the music system.
 * Sets up state change listeners for automatic music transitions.
 */
export function init() {
    if (initialized) return;
    initialized = true;
    console.log('Music system initialized');
}

/**
 * Play music for a specific game state.
 * Crossfades from current track if one is playing.
 * @param {string} state - Game state to play music for
 */
export function playForState(state) {
    if (musicMuted) return;

    const ctx = Sound.getContext();
    const destination = Sound.getMusicGain();

    if (!ctx || !destination) {
        console.warn('Cannot play music: Audio not initialized');
        return;
    }

    // Map states to tracks
    let trackId = null;
    let config = null;

    switch (state) {
        case GAME_STATES.MENU:
            trackId = 'menu';
            config = TRACK_CONFIG.menu;
            break;
        case GAME_STATES.PLAYING:
        case GAME_STATES.AIMING:
        case GAME_STATES.FIRING:
        case GAME_STATES.PAUSED:
            trackId = 'gameplay';
            config = TRACK_CONFIG.gameplay;
            break;
        case GAME_STATES.SHOP:
        case GAME_STATES.ROUND_END:
            trackId = 'shop';
            config = TRACK_CONFIG.shop;
            break;
        case GAME_STATES.VICTORY:
            // Play stinger, then menu music
            stopCurrentTrack(0.5);
            playVictoryStinger();
            // Delay before returning to menu music
            setTimeout(() => {
                if (currentTrackId === null) {
                    playTrack('menu', TRACK_CONFIG.menu);
                }
            }, 2000);
            return;
        case GAME_STATES.DEFEAT:
            // Play stinger, then menu music
            stopCurrentTrack(0.5);
            playDefeatStinger();
            setTimeout(() => {
                if (currentTrackId === null) {
                    playTrack('menu', TRACK_CONFIG.menu);
                }
            }, 2500);
            return;
        default:
            // Unknown state - keep current music or silence
            return;
    }

    // Don't restart if already playing this track
    if (trackId === currentTrackId && currentGenerator) {
        return;
    }

    playTrack(trackId, config);
}

/**
 * Start playing a specific track.
 * @param {string} trackId - Track identifier
 * @param {Object} config - Track configuration
 */
function playTrack(trackId, config) {
    if (musicMuted) return;

    const ctx = Sound.getContext();
    const destination = Sound.getMusicGain();

    if (!ctx || !destination) return;

    // Stop current track with fade
    if (currentGenerator) {
        currentGenerator.stop(CROSSFADE_DURATION);
    }

    // Create and start new generator
    currentGenerator = new MusicGenerator(ctx, destination, config);
    currentGenerator.start(CROSSFADE_DURATION);
    currentTrackId = trackId;

    console.log(`Music playing: ${config.name}`);
}

/**
 * Stop the current track.
 * @param {number} [fadeOut=1] - Fade out duration in seconds
 */
function stopCurrentTrack(fadeOut = 1) {
    if (currentGenerator) {
        currentGenerator.stop(fadeOut);
        currentGenerator = null;
    }
    currentTrackId = null;
}

/**
 * Stop all music.
 * @param {number} [fadeOut=1] - Fade out duration in seconds
 */
export function stop(fadeOut = 1) {
    stopCurrentTrack(fadeOut);
}

/**
 * Check if music is currently playing.
 * @returns {boolean} True if music is playing
 */
export function isPlaying() {
    return currentGenerator !== null && currentGenerator.isPlaying;
}

/**
 * Get the current track ID.
 * @returns {string|null} Current track ID or null
 */
export function getCurrentTrack() {
    return currentTrackId;
}

/**
 * Mute music (independent of SFX).
 */
export function mute() {
    if (musicMuted) return;

    preMuteVolume = Sound.getMusicVolume();
    Sound.setMusicVolume(0);
    musicMuted = true;

    console.log('Music muted');
}

/**
 * Unmute music (restore previous volume).
 */
export function unmute() {
    if (!musicMuted) return;

    Sound.setMusicVolume(preMuteVolume);
    musicMuted = false;

    console.log('Music unmuted');
}

/**
 * Toggle music mute state.
 * @returns {boolean} New mute state (true = muted)
 */
export function toggleMute() {
    if (musicMuted) {
        unmute();
    } else {
        mute();
    }
    return musicMuted;
}

/**
 * Check if music is muted.
 * @returns {boolean} True if muted
 */
export function isMuted() {
    return musicMuted;
}

/**
 * Set music volume.
 * @param {number} volume - Volume from 0 to 1
 */
export function setVolume(volume) {
    Sound.setMusicVolume(volume);
    if (volume > 0) {
        preMuteVolume = volume;
    }
}

/**
 * Get current music volume.
 * @returns {number} Volume from 0 to 1
 */
export function getVolume() {
    return Sound.getMusicVolume();
}
