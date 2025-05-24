// Main Game Class
class Game {
    constructor(canvas, ui) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ui = ui;
        
        // Set canvas size
        this.canvas.width = CONSTANTS.CANVAS_WIDTH;
        this.canvas.height = CONSTANTS.CANVAS_HEIGHT;
        
        // Game components
        this.terrain = null;
        this.physics = new Physics();
        this.projectileManager = new ProjectileManager();
        this.effectsSystem = new EffectsSystem();
        this.shop = new Shop();
        this.soundSystem = new SoundSystem();
        
        // Game state
        this.tanks = [];
        this.aiControllers = [];
        this.currentPlayer = 0;
        this.currentRound = 1;
        this.totalRounds = 10;
        this.gameState = CONSTANTS.GAME_STATES.MENU;
        this.projectileActive = false;
        this.turnStartTime = 0;
        
        // Game settings
        this.settings = {};
        
        // Animation
        this.lastTime = 0;
        this.animationId = null;
    }
    
    startNewGame(settings) {
        this.settings = settings;
        this.totalRounds = settings.rounds;
        this.currentRound = 1;
        
        // Configure physics
        this.physics.setGravity(settings.gravity);
        this.physics.setWindType(settings.windType);
        this.physics.wallBehavior = settings.wallBehavior || 'wrap';
        this.physics.ceilingBehavior = settings.ceilingBehavior || 'wrap';
        
        // Configure shop
        this.shop.enableSupplyDemand(settings.supplyDemand);
        
        // Start first round
        this.startRound();
    }
    
    startRound() {
        // Generate new terrain
        this.terrain = new Terrain(this.canvas.width, this.canvas.height);
        
        // Clear effects
        this.projectileManager.clear();
        this.effectsSystem.clear();
        
        // Create tanks
        this.createTanks();
        
        // Update wind
        this.physics.updateWind();
        
        // Determine turn order
        this.currentPlayer = Math.floor(Math.random() * this.tanks.length);
        
        // Start with shop phase if players have money
        if (this.settings.startingCash > 0 || this.currentRound > 1) {
            this.enterShopPhase();
        } else {
            this.startCombatPhase();
        }
    }
    
    createTanks() {
        this.tanks = [];
        this.aiControllers = [];
        
        // Generate tank positions
        const positions = this.generateTankPositions(this.settings.numPlayers);
        
        // Create tanks
        for (let i = 0; i < this.settings.numPlayers; i++) {
            const player = this.settings.players[i];
            const pos = positions[i];
            const color = CONSTANTS.PLAYER_COLORS[i % CONSTANTS.PLAYER_COLORS.length];
            
            const tank = new Tank(
                pos.x,
                pos.y,
                color,
                player.name,
                player.type === 'ai',
                player.aiType
            );
            
            // Set starting money
            if (this.currentRound === 1) {
                tank.money = this.settings.startingCash;
            }
            
            this.tanks.push(tank);
            
            // Create AI controller if needed
            if (player.type === 'ai') {
                this.aiControllers.push(new AIController(tank, player.aiType));
            } else {
                this.aiControllers.push(null);
            }
        }
    }
    
    generateTankPositions(numTanks) {
        const positions = [];
        const minDistance = CONSTANTS.TANK_MIN_DISTANCE;
        const margin = 50;
        
        for (let i = 0; i < numTanks; i++) {
            let validPosition = false;
            let attempts = 0;
            let x, y;
            
            while (!validPosition && attempts < 100) {
                x = margin + Math.random() * (this.canvas.width - margin * 2);
                
                // Create flat spot for tank
                const flatY = this.terrain.createFlatSpot(x, CONSTANTS.TANK_WIDTH * 2);
                y = flatY - CONSTANTS.TANK_HEIGHT;
                
                // Check distance from other tanks
                validPosition = true;
                for (let pos of positions) {
                    const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
                    if (dist < minDistance) {
                        validPosition = false;
                        break;
                    }
                }
                
                attempts++;
            }
            
            positions.push({ x, y });
        }
        
        // Re-render terrain after all flat spots are created
        this.terrain.renderTerrain();
        
        return positions;
    }
    
    enterShopPhase() {
        this.gameState = CONSTANTS.GAME_STATES.SHOP;
        
        // Process AI purchases first
        if (this.settings.computersBuy) {
            for (let i = 0; i < this.tanks.length; i++) {
                if (this.aiControllers[i]) {
                    this.shop.processAIPurchases(this.aiControllers[i], this.tanks[i]);
                }
            }
        }
        
        // Find first human player
        let humanIndex = -1;
        for (let i = 0; i < this.tanks.length; i++) {
            if (!this.tanks[i].isAI) {
                humanIndex = i;
                break;
            }
        }
        
        if (humanIndex >= 0) {
            // Open shop for human player
            this.shop.openShop(this.tanks[humanIndex]);
        } else {
            // All AI game, skip shop
            this.startCombatPhase();
        }
    }
    
    startCombatPhase() {
        this.gameState = CONSTANTS.GAME_STATES.PLAYING;
        this.ui.showGameScreen();
        this.startTurn();
        
        // Start game loop
        this.animate();
    }
    
    startTurn() {
        // Skip destroyed tanks
        while (this.tanks[this.currentPlayer].state === CONSTANTS.TANK_STATES.DESTROYED) {
            this.nextPlayer();
            
            // Check if round is over
            if (this.countAliveTanks() < 2) {
                this.endRound();
                return;
            }
        }
        
        this.turnStartTime = Date.now();
        this.projectileActive = false;
        
        // Update UI
        this.ui.updateHUD(this.getGameState());
        
        // If AI player, take turn
        const currentTank = this.tanks[this.currentPlayer];
        if (currentTank.isAI) {
            setTimeout(() => this.handleAITurn(), 1000);
        }
    }
    
    handleAITurn() {
        const ai = this.aiControllers[this.currentPlayer];
        if (!ai) return;
        
        const action = ai.takeTurn(this.tanks, this.physics, this.terrain);
        
        if (action && action.action === 'fire') {
            this.fireCurrentTank();
        } else {
            // AI couldn't find a shot, skip turn
            this.endTurn();
        }
    }
    
    fireCurrentTank() {
        if (this.projectileActive) return;
        
        const currentTank = this.tanks[this.currentPlayer];
        if (currentTank.state === CONSTANTS.TANK_STATES.DESTROYED) return;
        
        const projectile = this.projectileManager.fireWeapon(currentTank, this.physics);
        if (projectile) {
            this.projectileActive = true;
            
            // Play firing sound based on weapon type
            const weapon = CONSTANTS.WEAPONS[currentTank.selectedWeapon];
            if (weapon) {
                switch(weapon.projectileType) {
                    case 'beam':
                        this.soundSystem.play('laser');
                        break;
                    case 'dirt':
                        this.soundSystem.play('tankFire');
                        break;
                    default:
                        this.soundSystem.play('missile');
                        break;
                }
            }
        }
    }
    
    endTurn() {
        // Award survival money
        const currentTank = this.tanks[this.currentPlayer];
        if (currentTank.state !== CONSTANTS.TANK_STATES.DESTROYED) {
            currentTank.money += CONSTANTS.SURVIVAL_REWARD;
            currentTank.roundsSurvived++;
        }
        
        // Next player
        this.nextPlayer();
        
        // Update wind if changing
        if (this.physics.windType === 'changing') {
            this.physics.updateWind();
        }
        
        this.startTurn();
    }
    
    nextPlayer() {
        this.currentPlayer = (this.currentPlayer + 1) % this.tanks.length;
    }
    
    countAliveTanks() {
        return this.tanks.filter(t => t.state !== CONSTANTS.TANK_STATES.DESTROYED).length;
    }
    
    endRound() {
        // Find winner
        const aliveTanks = this.tanks.filter(t => t.state !== CONSTANTS.TANK_STATES.DESTROYED);
        const winner = aliveTanks.length === 1 ? aliveTanks[0] : null;
        
        this.ui.showRoundEnd(winner);
        
        // Check if game is over
        if (this.currentRound >= this.totalRounds) {
            this.endGame();
        } else {
            this.currentRound++;
            this.startRound();
        }
    }
    
    endGame() {
        this.gameState = CONSTANTS.GAME_STATES.GAME_OVER;
        
        // Calculate final stats
        const stats = this.tanks.map(tank => ({
            playerName: tank.playerName,
            kills: tank.kills,
            damageDealt: tank.damageDealt,
            roundsSurvived: tank.roundsSurvived
        }));
        
        this.ui.showGameOver(stats);
    }
    
    update(deltaTime) {
        if (this.gameState !== CONSTANTS.GAME_STATES.PLAYING) return;
        
        // Apply terrain collapse physics periodically
        if (!this.projectileActive) {
            // Only collapse terrain when no projectiles are active
            this.terrain.applyTerrainCollapse(this.effectsSystem, this.soundSystem);
        }
        
        // Update tanks
        for (let tank of this.tanks) {
            tank.update(deltaTime, this.terrain, this.physics);
        }
        
        // Update projectiles
        this.projectileManager.update(deltaTime, this.physics, this.terrain, this.tanks, this.effectsSystem, this.soundSystem);
        
        // Update effects
        this.effectsSystem.update(deltaTime);
        
        // Check if projectile phase is over
        if (this.projectileActive && !this.projectileManager.hasActiveProjectiles()) {
            this.projectileActive = false;
            
            // Apply terrain collapse after explosions
            let collapseFrames = 0;
            const collapseInterval = setInterval(() => {
                const hasCollapsed = this.terrain.applyTerrainCollapse(this.effectsSystem, this.soundSystem);
                collapseFrames++;
                
                // Stop after 10 frames or when terrain stabilizes
                if (collapseFrames >= 10 || !hasCollapsed) {
                    clearInterval(collapseInterval);
                    setTimeout(() => this.endTurn(), 500);
                }
            }, 50);
        }
        
        // Update UI
        this.ui.updateHUD(this.getGameState());
    }
    
    render() {
        // Clear canvas and draw vibrant gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0a0015');     // Very dark purple at top
        gradient.addColorStop(0.2, '#1a0033');   // Dark purple
        gradient.addColorStop(0.4, '#330066');   // Purple
        gradient.addColorStop(0.6, '#4d0099');   // Bright purple
        gradient.addColorStop(0.8, '#6600cc');   // Light purple
        gradient.addColorStop(1, '#9933ff');     // Pink-purple at horizon
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add stars for atmosphere
        this.drawStars();
        
        // Draw terrain
        if (this.terrain) {
            this.terrain.draw(this.ctx);
        }
        
        // Draw tanks
        for (let tank of this.tanks) {
            tank.draw(this.ctx);
        }
        
        // Draw projectiles
        this.projectileManager.draw(this.ctx);
        
        // Draw effects
        this.effectsSystem.draw(this.ctx);
    }
    
    animate(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        this.animationId = requestAnimationFrame((time) => this.animate(time));
    }
    
    // Public methods for UI
    canPlayerAct() {
        return this.gameState === CONSTANTS.GAME_STATES.PLAYING &&
               !this.projectileActive &&
               !this.tanks[this.currentPlayer].isAI;
    }
    
    getCurrentTank() {
        return this.tanks[this.currentPlayer];
    }
    
    adjustCurrentTankAngle(delta) {
        const tank = this.getCurrentTank();
        if (tank) {
            tank.adjustAngle(delta);
        }
    }
    
    adjustCurrentTankPower(delta) {
        const tank = this.getCurrentTank();
        if (tank) {
            tank.adjustPower(delta);
        }
    }
    
    getGameState() {
        return {
            tanks: this.tanks,
            currentPlayer: this.currentPlayer,
            currentRound: this.currentRound,
            totalRounds: this.totalRounds,
            wind: this.physics.wind,
            projectileActive: this.projectileActive
        };
    }
    
    startNextRound() {
        this.startCombatPhase();
    }
    
    drawStars() {
        // Cache stars for performance
        if (!this.stars) {
            this.stars = [];
            for (let i = 0; i < 100; i++) {
                this.stars.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height * 0.7, // Only in upper 70% of screen
                    size: Math.random() * 2,
                    brightness: Math.random()
                });
            }
        }
        
        // Draw stars
        this.ctx.fillStyle = '#ffffff';
        for (let star of this.stars) {
            this.ctx.globalAlpha = star.brightness;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        }
        this.ctx.globalAlpha = 1;
    }
}