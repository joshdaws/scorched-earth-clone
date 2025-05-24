// Simple Sound System using Web Audio API directly
class SoundSystem {
    constructor() {
        this.enabled = true;
        this.masterVolume = 0.7; // Increased default volume
        this.initialized = false;
        this.context = null;
        
        // Don't initialize immediately - wait for user interaction
        this.setupUserInteractionListener();
    }
    
    setupUserInteractionListener() {
        // Initialize on first user interaction
        const initOnInteraction = () => {
            this.initialize();
            // Remove listeners after initialization
            document.removeEventListener('click', initOnInteraction);
            document.removeEventListener('keydown', initOnInteraction);
            document.removeEventListener('touchstart', initOnInteraction);
        };
        
        document.addEventListener('click', initOnInteraction);
        document.addEventListener('keydown', initOnInteraction);
        document.addEventListener('touchstart', initOnInteraction);
    }
    
    initialize() {
        if (this.initialized) return;
        
        try {
            // Create audio context
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('Sound system initialized successfully');
            
            // Test sound to confirm it's working
            this.playBeep(440, 0.1, 0.1);
        } catch (e) {
            console.error('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }
    
    play(soundName, volume = 1.0) {
        console.log(`SoundSystem.play called: ${soundName} at volume ${volume}`);
        
        if (!this.enabled) {
            console.log('Sound disabled');
            return;
        }
        
        // Try to initialize if not done yet
        if (!this.initialized) {
            console.log('Sound not initialized, attempting to initialize...');
            this.initialize();
            if (!this.initialized) {
                console.log('Failed to initialize sound');
                return;
            }
        }
        
        if (!this.context) {
            console.log('No audio context');
            return;
        }
        
        console.log(`Audio context state: ${this.context.state}`);
        
        // Resume context if suspended (happens on some browsers)
        if (this.context.state === 'suspended') {
            this.context.resume().then(() => {
                console.log('Audio context resumed');
                // Try playing the sound again after resume
                this.play(soundName, volume);
            });
            return;
        }
        
        const now = this.context.currentTime;
        
        // Create sounds based on name
        switch(soundName) {
            case 'missile':
                this.playBeep(400, 0.15, 0.6 * volume);
                break;
            case 'laser':
                this.playLaser(0.6 * volume);
                break;
            case 'tankFire':
                this.playBeep(150, 0.15, 0.6 * volume);
                break;
            case 'smallExplosion':
                this.playExplosion(0.2, 0.7 * volume);
                break;
            case 'mediumExplosion':
                this.playExplosion(0.3, 0.8 * volume);
                break;
            case 'largeExplosion':
                this.playExplosion(0.4, 0.9 * volume);
                break;
            case 'nukeExplosion':
                this.playExplosion(0.6, 1.0 * volume);
                break;
            case 'buttonClick':
                this.playBeep(600, 0.05, 0.4 * volume);
                break;
            case 'menuSelect':
                this.playBeep(500, 0.1, 0.4 * volume);
                break;
            case 'shopPurchase':
                this.playBeep(700, 0.15, 0.5 * volume);
                setTimeout(() => this.playBeep(900, 0.15, 0.5 * volume), 150);
                break;
            case 'shopDenied':
                this.playBeep(200, 0.2, 0.5 * volume);
                break;
            case 'tankHit':
                this.playBeep(250, 0.15, 0.5 * volume);
                break;
            case 'tankDestroyed':
                this.playExplosion(0.4, 0.8 * volume);
                break;
            case 'tankFalling':
                this.playFallingSound(0.4 * volume);
                break;
            case 'terrainCollapse':
                this.playRumble(0.5 * volume);
                break;
            case 'dirtThud':
                this.playBeep(70, 0.2, 0.6 * volume);
                break;
            case 'fire':
                this.playBeep(350, 0.3, 0.4 * volume);
                break;
        }
    }
    
    playBeep(frequency, duration, volume) {
        try {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.frequency.value = frequency;
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(volume * this.masterVolume, this.context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.context.destination);
            
            osc.start();
            osc.stop(this.context.currentTime + duration);
            
            console.log(`Playing beep: ${frequency}Hz for ${duration}s at volume ${volume}`);
        } catch (e) {
            console.error('Error playing beep:', e);
        }
    }
    
    playLaser(volume) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.3);
        
        gain.gain.setValueAtTime(volume * this.masterVolume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(this.context.destination);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.3);
    }
    
    playExplosion(duration, volume) {
        // Create noise
        const bufferSize = this.context.sampleRate * duration;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        
        const noise = this.context.createBufferSource();
        noise.buffer = buffer;
        
        const gain = this.context.createGain();
        gain.gain.value = volume * this.masterVolume;
        
        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.context.destination);
        
        noise.start();
    }
    
    playFallingSound(volume) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.context.currentTime + 0.5);
        
        gain.gain.setValueAtTime(volume * this.masterVolume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(this.context.destination);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.5);
    }
    
    playRumble(volume) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'triangle';
        osc.frequency.value = 40;
        
        gain.gain.setValueAtTime(volume * this.masterVolume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(this.context.destination);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.3);
    }
    
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// Export as global
window.SoundSystem = SoundSystem;