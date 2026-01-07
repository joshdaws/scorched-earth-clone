// Game Constants
const CONSTANTS = {
    // Canvas settings - 16:9 mobile landscape standard
    CANVAS_WIDTH: 1280,
    CANVAS_HEIGHT: 720,
    
    // Physics
    GRAVITY_DEFAULT: 9.8,
    WIND_MAX: 10,
    
    // Tank settings
    TANK_WIDTH: 24,
    TANK_HEIGHT: 12,
    TANK_MIN_DISTANCE: 80,
    TANK_FALL_DAMAGE_HEIGHT: 50,
    
    // Terrain
    TERRAIN_RESOLUTION: 2, // pixels per terrain point
    
    // Weapons
    WEAPONS: {
        MISSILE: {
            name: 'Missile',
            cost: 0,
            damage: 100,  // Direct hit should kill
            radius: 30,  // Increased from 20
            quantity: -1, // unlimited
            projectileType: 'ballistic',
            color: '#fff'
        },
        BABY_NUKE: {
            name: 'Baby Nuke',
            cost: 500,
            damage: 150,  // Ensures kill even with shields
            radius: 75,  // Increased from 50
            quantity: 1,
            projectileType: 'ballistic',
            color: '#ff0'
        },
        NUKE: {
            name: 'Nuke',
            cost: 1000,
            damage: 200,  // Massive damage
            radius: 150,  // Increased from 100
            quantity: 1,
            projectileType: 'ballistic',
            color: '#f00'
        },
        DIRT_BOMB: {
            name: 'Dirt Bomb',
            cost: 300,
            damage: 0,
            radius: 60,  // Increased from 40
            quantity: 5,
            projectileType: 'dirt',
            color: '#840'
        },
        NAPALM: {
            name: 'Napalm',
            cost: 800,
            damage: 120,  // Direct hit kills, plus fire damage
            radius: 90,  // Increased from 60
            quantity: 2,
            projectileType: 'fire',
            color: '#f80'
        },
        FUNKY_BOMB: {
            name: 'Funky Bomb',
            cost: 1500,
            damage: 80,  // Each submunition does good damage
            radius: 45,  // Increased from 30
            quantity: 1,
            projectileType: 'cluster',
            subMunitions: 8,
            color: '#f0f'
        },
        LASER: {
            name: 'Laser',
            cost: 2000,
            damage: 100,  // Instant kill on direct hit
            radius: 5,
            quantity: 1,
            projectileType: 'beam',
            color: '#0ff'
        }
    },
    
    // Defensive Items
    ITEMS: {
        SHIELD: {
            name: 'Shield',
            cost: 500,
            type: 'shield',
            health: 100
        },
        DEFLECTOR_SHIELD: {
            name: 'Deflector Shield',
            cost: 1000,
            type: 'shield',
            health: 100,
            deflects: true
        },
        SUPER_MAG: {
            name: 'SuperMag',
            cost: 2500,
            type: 'shield',
            health: 200,
            deflects: true,
            repels: true
        },
        PARACHUTE: {
            name: 'Parachute',
            cost: 200,
            type: 'utility',
            autoActivate: true
        },
        BATTERY: {
            name: 'Battery',
            cost: 400,
            type: 'utility',
            restorePower: 50
        },
        TRACER: {
            name: 'Tracer',
            cost: 100,
            type: 'upgrade',
            duration: 1
        }
    },
    
    // AI Types
    AI_TYPES: {
        SHOOTER: {
            name: 'Shooter',
            accuracy: 0.6,
            weaponPreference: 'basic',
            economySkill: 0.3,
            taunts: {
                firing: ['Here it comes!', 'Watch this!', 'Fire in the hole!'],
                dying: ['Oops...', 'Not fair!', 'I\'ll get you next time!']
            }
        },
        CYBORG: {
            name: 'Cyborg',
            accuracy: 0.85,
            weaponPreference: 'balanced',
            economySkill: 0.7,
            taunts: {
                firing: ['Resistance is futile.', 'Target acquired.', 'Calculating trajectory...'],
                dying: ['System failure...', 'Does not compute!', 'I\'ll be back... (not)']
            }
        },
        KILLER: {
            name: 'Killer',
            accuracy: 0.95,
            weaponPreference: 'advanced',
            economySkill: 0.9,
            taunts: {
                firing: ['Prepare for annihilation!', 'You cannot escape!', 'Death comes for you!'],
                dying: ['Impossible!', 'This cannot be!', 'My destiny... foiled!']
            }
        }
    },
    
    // Game States
    GAME_STATES: {
        MENU: 'menu',
        SETUP: 'setup',
        PLAYING: 'playing',
        SHOP: 'shop',
        ROUND_END: 'round_end',
        GAME_OVER: 'game_over'
    },
    
    // Tank States
    TANK_STATES: {
        NORMAL: 'normal',
        DAMAGED: 'damaged',
        BURIED: 'buried',
        FALLING: 'falling',
        SLIDING: 'sliding',
        DESTROYED: 'destroyed'
    },
    
    // Colors
    PLAYER_COLORS: [
        '#ff0066', // Hot Pink
        '#00ffff', // Cyan
        '#ffff00', // Yellow
        '#ff00ff', // Magenta
        '#00ff00', // Lime Green
        '#ff6600', // Orange
        '#9966ff', // Purple
        '#66ff66', // Light Green
        '#ff66ff', // Light Pink
        '#66ffff'  // Light Cyan
    ],
    
    // Economy
    KILL_REWARD: 1000,
    SURVIVAL_REWARD: 100,
    DAMAGE_REWARD: 10,
    
    // Misc
    MAX_PLAYERS: 10,
    DEFAULT_ROUNDS: 10,
    DEFAULT_STARTING_CASH: 10000
};