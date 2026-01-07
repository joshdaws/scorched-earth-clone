// Progression System - XP, Levels, and Unlocks
class ProgressionSystem {
    constructor() {
        this.data = this.loadProgress();
        this.unlockTree = this.initializeUnlockTree();
        this.oneLiners = this.initializeOneLiners();
    }
    
    // Load saved progress or create new
    loadProgress() {
        const saved = localStorage.getItem('scorchedEarthProgress');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // Default progress for new players
        return {
            xp: 0,
            level: 1,
            totalKills: 0,
            totalDeaths: 0,
            totalDamage: 0,
            totalMoneyEarned: 0,
            accuracyShots: 0,
            accuracyHits: 0,
            unlockedWeapons: ['BABY_MISSILE', 'MISSILE', 'BABY_NUKE', 'NUKE', 'DIRT_BOMB'],
            unlockedTankColors: ['#ff00ff', '#00ffff', '#ffff00', '#ff0066', '#00ff00'],
            achievements: [],
            statistics: {
                gamesPlayed: 0,
                gamesWon: 0,
                perfectShots: 0,
                longestKillStreak: 0,
                currentKillStreak: 0,
                favoriteWeapon: 'MISSILE'
            },
            settings: {
                hasSeenTutorial: false,
                preferredColor: '#ff00ff',
                soundVolume: 50,
                musicVolume: 50
            }
        };
    }
    
    // Save progress
    saveProgress() {
        localStorage.setItem('scorchedEarthProgress', JSON.stringify(this.data));
    }
    
    // Initialize weapon unlock tree
    initializeUnlockTree() {
        return {
            // Level 1 - Starters (already unlocked)
            1: [],
            
            // Level 3 - Basic upgrades
            3: ['MEGA_NUKE', 'TRACER', 'SMOKE_BOMB'],
            
            // Level 5 - The Classics
            5: ['DEATHS_HEAD', 'NAPALM', 'ACID_RAIN', 'CLUSTER_BOMB'],
            
            // Level 10 - Advanced
            10: ['MIRV', 'CHAIN_REACTION', 'BOUNCY_BOMB', 'TUNNELER'],
            
            // Level 15 - Sci-Fi
            15: ['LASER', 'PLASMA_BLAST', 'EMP', 'TELEPORTER'],
            
            // Level 20 - The Ridiculous
            20: ['DISCO_BALL', 'SYNTHESIZER', 'TIME_BOMB', 'LIGHTNING_GUITAR'],
            
            // Level 25 - Defensive
            25: ['SUPER_MAG_SHIELD', 'DEFLECTOR_SHIELD', 'FORCE_FIELD', 'CLOAKING_DEVICE'],
            
            // Level 30 - Chaos
            30: ['RANDOM_TELEPORT', 'GRAVITY_BOMB', 'BLACK_HOLE', 'ANTIMATTER'],
            
            // Level 40 - Master
            40: ['ARMAGEDDON', 'PLANET_KILLER', 'DIMENSIONAL_RIFT'],
            
            // Level 50 - Legendary
            50: ['BURTONS_BIG_TROUBLE', 'THE_MACREADY', 'CARPENTERS_REVENGE']
        };
    }
    
    // Initialize 80s one-liners
    initializeOneLiners() {
        return {
            kill: [
                "Looks like someone brought a tank to a tank fight!",
                "He won't be back... for the sequel",
                "That's what I call a hostile takeover",
                "Terminated... with extreme prejudice",
                "Game over, man! Game over!",
                "I came here to chew bubblegum and blow up tanks...",
                "Consider that a divorce!",
                "Yippee-ki-yay, tank fighter!",
                "I'll be back... but you won't",
                "Welcome to the party, pal!",
                "Smile, you son of a—BOOM!",
                "That's no moon... oh wait, that's just debris",
                "Say hello to my little friend!",
                "Groovy!",
                "Maximum effort!",
                "I ain't got time to bleed... because I'm winning!"
            ],
            death: [
                "I'll be back... after respawn",
                "Game over, man!",
                "Tell my tank... I loved her",
                "This is fine. Everything is fine.",
                "Witness me!",
                "Not like this... not like this...",
                "Et tu, Nuke?",
                "I knew I should've taken that left turn at Albuquerque",
                "Tis but a scratch!",
                "'Twas beauty killed the tank"
            ],
            miss: [
                "I meant to do that",
                "Warning shot!",
                "Just checking the wind...",
                "That was just the trailer",
                "Calculating... recalculating...",
                "The wind! It was the wind!",
                "That shot was dedicated to my fans"
            ],
            shop: [
                "Welcome to Wang's Weapons! No horsing around!",
                "What'll it be, tough guy?",
                "You want fries with that apocalypse?",
                "Everything must go! The world is ending anyway!",
                "I've got what you need... if you've got the cash",
                "Time to separate the tanks from the boys"
            ]
        };
    }
    
    // Add XP and check for level up
    addXP(amount, reason) {
        const oldLevel = this.data.level;
        this.data.xp += amount;
        
        // Calculate new level
        while (this.getXPForLevel(this.data.level + 1) <= this.data.xp) {
            this.data.level++;
            this.onLevelUp(this.data.level);
        }
        
        this.saveProgress();
        
        return {
            xpGained: amount,
            newTotal: this.data.xp,
            leveledUp: this.data.level > oldLevel,
            newLevel: this.data.level,
            reason: reason
        };
    }
    
    // Get XP required for a level
    getXPForLevel(level) {
        // Exponential curve - gets harder as you progress
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }
    
    // Get XP progress to next level
    getXPProgress() {
        const currentLevelXP = this.getXPForLevel(this.data.level);
        const nextLevelXP = this.getXPForLevel(this.data.level + 1);
        const progressXP = this.data.xp - currentLevelXP;
        const neededXP = nextLevelXP - currentLevelXP;
        
        return {
            current: progressXP,
            needed: neededXP,
            percentage: (progressXP / neededXP) * 100
        };
    }
    
    // Handle level up
    onLevelUp(newLevel) {
        console.log(`LEVEL UP! Welcome to level ${newLevel}!`);
        
        // Check for weapon unlocks
        const weaponsToUnlock = this.unlockTree[newLevel] || [];
        weaponsToUnlock.forEach(weapon => {
            if (!this.data.unlockedWeapons.includes(weapon)) {
                this.data.unlockedWeapons.push(weapon);
                console.log(`NEW WEAPON UNLOCKED: ${weapon}!`);
            }
        });
        
        // Special rewards at milestone levels
        if (newLevel % 10 === 0) {
            // Unlock new tank color every 10 levels
            const bonusColors = ['#ff1493', '#00fa9a', '#ffd700', '#dc143c', '#4169e1'];
            const newColor = bonusColors[Math.floor(newLevel / 10) - 1];
            if (newColor && !this.data.unlockedTankColors.includes(newColor)) {
                this.data.unlockedTankColors.push(newColor);
                console.log(`NEW TANK COLOR UNLOCKED: ${newColor}!`);
            }
        }
    }
    
    // Track kill and calculate XP
    recordKill(victimTank, weapon, distance) {
        this.data.totalKills++;
        this.data.statistics.currentKillStreak++;
        
        if (this.data.statistics.currentKillStreak > this.data.statistics.longestKillStreak) {
            this.data.statistics.longestKillStreak = this.data.statistics.currentKillStreak;
        }
        
        // Base XP
        let xp = 100;
        
        // Distance bonus
        if (distance > 500) xp += 50;
        if (distance > 800) xp += 100;
        
        // Weapon difficulty bonus
        const difficultWeapons = ['BABY_MISSILE', 'MISSILE', 'TRACER', 'SMOKE_BOMB'];
        if (difficultWeapons.includes(weapon)) xp += 50;
        
        // Kill streak bonus
        xp += this.data.statistics.currentKillStreak * 25;
        
        // Add the XP
        const result = this.addXP(xp, `Eliminated ${victimTank.name}`);
        
        // Return a one-liner
        const oneLiner = this.getRandomOneLiner('kill');
        
        return { ...result, oneLiner };
    }
    
    // Track death
    recordDeath() {
        this.data.totalDeaths++;
        this.data.statistics.currentKillStreak = 0;
        this.saveProgress();
        
        return {
            oneLiner: this.getRandomOneLiner('death')
        };
    }
    
    // Track shot accuracy
    recordShot(hit) {
        this.data.accuracyShots++;
        if (hit) {
            this.data.accuracyHits++;
            
            // Perfect shot bonus
            if (this.data.accuracyShots % 10 === 0) {
                const accuracy = (this.data.accuracyHits / this.data.accuracyShots) * 100;
                if (accuracy >= 80) {
                    this.addXP(50, 'Sharpshooter bonus!');
                }
            }
        }
        this.saveProgress();
    }
    
    // Get random one-liner
    getRandomOneLiner(category) {
        const lines = this.oneLiners[category];
        return lines[Math.floor(Math.random() * lines.length)];
    }
    
    // Check if weapon is unlocked
    isWeaponUnlocked(weaponId) {
        return this.data.unlockedWeapons.includes(weaponId);
    }
    
    // Get all unlocked weapons
    getUnlockedWeapons() {
        return this.data.unlockedWeapons;
    }
    
    // Get locked weapons with unlock requirements
    getLockedWeapons() {
        const locked = [];
        
        for (const [level, weapons] of Object.entries(this.unlockTree)) {
            weapons.forEach(weapon => {
                if (!this.data.unlockedWeapons.includes(weapon)) {
                    locked.push({
                        id: weapon,
                        requiredLevel: parseInt(level),
                        currentLevel: this.data.level
                    });
                }
            });
        }
        
        return locked;
    }
    
    // Achievement system
    checkAchievements(gameState) {
        const newAchievements = [];
        
        // First Blood - First kill
        if (this.data.totalKills === 1 && !this.hasAchievement('first_blood')) {
            newAchievements.push(this.unlockAchievement('first_blood', 'First Blood', 'Welcome to the party, pal!'));
        }
        
        // Sharpshooter - 90% accuracy over 20 shots
        if (this.data.accuracyShots >= 20) {
            const accuracy = (this.data.accuracyHits / this.data.accuracyShots) * 100;
            if (accuracy >= 90 && !this.hasAchievement('sharpshooter')) {
                newAchievements.push(this.unlockAchievement('sharpshooter', 'Sharpshooter', 'I never miss... except when I do'));
            }
        }
        
        // Rampage - 5 kill streak
        if (this.data.statistics.longestKillStreak >= 5 && !this.hasAchievement('rampage')) {
            newAchievements.push(this.unlockAchievement('rampage', 'Rampage', 'Stop! He\'s already dead!'));
        }
        
        return newAchievements;
    }
    
    // Check if player has achievement
    hasAchievement(id) {
        return this.data.achievements.some(a => a.id === id);
    }
    
    // Unlock achievement
    unlockAchievement(id, name, description) {
        const achievement = {
            id,
            name,
            description,
            unlockedAt: Date.now()
        };
        
        this.data.achievements.push(achievement);
        this.addXP(200, `Achievement: ${name}`);
        this.saveProgress();
        
        return achievement;
    }
    
    // Get player stats for display
    getStats() {
        const accuracy = this.data.accuracyShots > 0 
            ? (this.data.accuracyHits / this.data.accuracyShots * 100).toFixed(1)
            : 0;
            
        const winRate = this.data.statistics.gamesPlayed > 0
            ? (this.data.statistics.gamesWon / this.data.statistics.gamesPlayed * 100).toFixed(1)
            : 0;
            
        return {
            level: this.data.level,
            xp: this.data.xp,
            xpProgress: this.getXPProgress(),
            totalKills: this.data.totalKills,
            totalDeaths: this.data.totalDeaths,
            accuracy: accuracy + '%',
            winRate: winRate + '%',
            longestStreak: this.data.statistics.longestKillStreak,
            gamesPlayed: this.data.statistics.gamesPlayed,
            achievements: this.data.achievements.length
        };
    }
}

// Export as global
if (typeof window !== 'undefined') {
    window.ProgressionSystem = ProgressionSystem;
}