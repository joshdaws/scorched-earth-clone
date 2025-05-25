// Main Game Class
class Game {
    constructor(canvas, ui) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ui = ui;
        
        // Set initial canvas size
        this.canvas.width = CONSTANTS.CANVAS_WIDTH;
        this.canvas.height = CONSTANTS.CANVAS_HEIGHT;
        
        // Listen for resize events
        window.addEventListener('resize', () => this.updateCanvasSize());
        window.addEventListener('orientationchange', () => this.updateCanvasSize());
        
        // Initialize renderer (try WebGL first)
        this.renderer = new Renderer(canvas, true);
        
        // Initialize performance optimizations
        this.dirtyRectManager = new DirtyRectManager(this.canvas.width, this.canvas.height);
        
        // Game components
        this.terrain = null;
        this.physics = new Physics();
        this.projectileManager = new ProjectileManager();
        this.effectsSystem = new EffectsSystem();
        this.shop = new Shop();
        this.soundSystem = new SoundSystem();
        
        // Initialize spatial grid in physics
        this.physics.initSpatialGrid(this.canvas.width, this.canvas.height);
        
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
        
        // Debug mode
        this.debugMode = false;
        
        // Touch/mobile support
        this.touchSupport = 'ontouchstart' in window;
        this.touchDragInfo = null; // Store touch drag info for visual feedback
        this.setupTouchControls();
    }
    
    updateCanvasSize() {
        const container = this.canvas.parentElement;
        if (!container) return;
        
        // Only update size if game screen is visible
        const gameScreen = document.getElementById('game-screen');
        if (!gameScreen || gameScreen.classList.contains('hidden')) return;
        
        const rect = container.getBoundingClientRect();
        const maxWidth = Math.min(rect.width, window.innerWidth);
        const maxHeight = Math.min(rect.height, window.innerHeight - 150); // Account for UI
        
        // Calculate scale to fit while maintaining aspect ratio
        const targetRatio = CONSTANTS.CANVAS_WIDTH / CONSTANTS.CANVAS_HEIGHT;
        let width = maxWidth;
        let height = width / targetRatio;
        
        if (height > maxHeight) {
            height = maxHeight;
            width = height * targetRatio;
        }
        
        // Set actual canvas resolution
        this.canvas.width = CONSTANTS.CANVAS_WIDTH;
        this.canvas.height = CONSTANTS.CANVAS_HEIGHT;
        
        // Set CSS size for scaling
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        
        // Store scale factor for touch coordinates
        this.scaleX = CONSTANTS.CANVAS_WIDTH / width;
        this.scaleY = CONSTANTS.CANVAS_HEIGHT / height;
        
        // Mark for redraw
        if (this.dirtyRectManager) {
            this.dirtyRectManager.markFullDirty();
        }
    }
    
    setupTouchControls() {
        if (!this.touchSupport) return;
        
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartPower = 0;
        let touchStartAngle = 0;
        let isDragging = false;
        
        this.canvas.addEventListener('touchstart', (e) => {
            if (this.gameState !== CONSTANTS.GAME_STATES.PLAYING || this.projectileActive) return;
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            touchStartX = (touch.clientX - rect.left) * this.scaleX;
            touchStartY = (touch.clientY - rect.top) * this.scaleY;
            
            const currentTank = this.tanks[this.currentPlayer];
            if (currentTank && !currentTank.isAI) {
                touchStartPower = currentTank.power;
                touchStartAngle = currentTank.angle;
                isDragging = true;
                
                // Store drag info for visual feedback
                this.touchDragInfo = {
                    startX: touchStartX,
                    startY: touchStartY,
                    currentX: touchStartX,
                    currentY: touchStartY,
                    tankX: currentTank.x,
                    tankY: currentTank.y
                };
            }
            
            e.preventDefault();
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (!isDragging || this.gameState !== CONSTANTS.GAME_STATES.PLAYING) return;
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const touchX = (touch.clientX - rect.left) * this.scaleX;
            const touchY = (touch.clientY - rect.top) * this.scaleY;
            
            const currentTank = this.tanks[this.currentPlayer];
            if (currentTank && !currentTank.isAI) {
                // Slingshot behavior - trajectory is opposite to drag direction
                const dx = touchX - currentTank.x;
                const dy = touchY - currentTank.y;
                
                // Calculate angle from tank to touch point, then flip 180 degrees
                let angle = Math.atan2(-dy, dx) * 180 / Math.PI; // Negative dy because canvas Y is flipped
                angle = (angle + 180) % 360; // Flip 180 degrees for slingshot effect
                
                // Clamp to valid firing range (0-180 degrees)
                if (angle > 180) angle = 360 - angle;
                currentTank.angle = Math.max(0, Math.min(180, angle));
                
                // Calculate power based on drag distance from tank (farther = more power)
                const distance = Math.sqrt(dx * dx + dy * dy);
                const powerChange = distance * 1.0; // Sensitivity for slingshot
                currentTank.power = Math.max(10, Math.min(500, powerChange));
                
                // Update touch drag info for visual feedback
                if (this.touchDragInfo) {
                    this.touchDragInfo.currentX = touchX;
                    this.touchDragInfo.currentY = touchY;
                }
                
                // Update UI
                this.ui.updateHUD(this.getGameState());
                this.dirtyRectManager.markDirty(0, 0, this.canvas.width, this.canvas.height);
            }
            
            e.preventDefault();
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            if (isDragging && this.gameState === CONSTANTS.GAME_STATES.PLAYING && !this.projectileActive) {
                // Auto-fire on release (slingshot behavior)
                this.fireCurrentTank();
            }
            
            isDragging = false;
            this.touchDragInfo = null; // Clear visual feedback
            this.dirtyRectManager.markDirty(0, 0, this.canvas.width, this.canvas.height);
            e.preventDefault();
        });
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
        
        // Clear effects and spatial grid
        this.projectileManager.clear();
        this.effectsSystem.clear();
        this.physics.spatialGrid.clear();
        
        // Create tanks
        this.createTanks();
        
        // Add tanks to spatial grid
        this.updateSpatialGrid();
        
        // Update wind
        this.physics.updateWind();
        
        // Determine turn order
        this.currentPlayer = Math.floor(Math.random() * this.tanks.length);
        
        // Mark full redraw needed
        this.dirtyRectManager.markFullDirty();
        
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
                y = flatY; // Tank y position is at ground level
                
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
        // Skip destroyed and buried tanks
        while (this.tanks[this.currentPlayer].state === CONSTANTS.TANK_STATES.DESTROYED ||
               this.tanks[this.currentPlayer].state === CONSTANTS.TANK_STATES.BURIED) {
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
        return this.tanks.filter(t => 
            t.state !== CONSTANTS.TANK_STATES.DESTROYED && 
            t.state !== CONSTANTS.TANK_STATES.BURIED
        ).length;
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
        
        // Clear dirty rects for this frame
        this.dirtyRectManager.clear();
        
        // Apply terrain collapse physics periodically
        if (!this.projectileActive) {
            // Only collapse terrain when no projectiles are active
            const collapsed = this.terrain.applyTerrainCollapse(this.effectsSystem, this.soundSystem);
            if (collapsed) {
                // Mark terrain area as dirty
                this.dirtyRectManager.markFullDirty(); // Terrain changes affect whole screen
            }
        }
        
        // Update tanks and track dirty regions
        for (let tank of this.tanks) {
            const prevX = tank.x;
            const prevY = tank.y;
            
            tank.update(deltaTime, this.terrain, this.physics);
            
            // If tank moved, mark dirty
            if (tank.x !== prevX || tank.y !== prevY) {
                // Mark old position
                this.dirtyRectManager.markDirty(
                    prevX - CONSTANTS.TANK_WIDTH,
                    prevY - CONSTANTS.TANK_HEIGHT * 2,
                    CONSTANTS.TANK_WIDTH * 2,
                    CONSTANTS.TANK_HEIGHT * 3
                );
                // Mark new position
                this.dirtyRectManager.markDirty(
                    tank.x - CONSTANTS.TANK_WIDTH,
                    tank.y - CONSTANTS.TANK_HEIGHT * 2,
                    CONSTANTS.TANK_WIDTH * 2,
                    CONSTANTS.TANK_HEIGHT * 3
                );
            }
        }
        
        // Update projectiles and mark their areas dirty
        const activeProjectiles = this.projectileManager.projectiles.filter(p => p.active);
        for (let projectile of activeProjectiles) {
            // Mark current position dirty
            this.dirtyRectManager.markDirty(
                projectile.x - 50,
                projectile.y - 50,
                100,
                100
            );
        }
        
        this.projectileManager.update(deltaTime, this.physics, this.terrain, this.tanks, this.effectsSystem, this.soundSystem);
        
        // Update effects and mark their areas dirty
        for (let particle of this.effectsSystem.particles) {
            this.dirtyRectManager.markDirty(
                particle.x - particle.size,
                particle.y - particle.size,
                particle.size * 2,
                particle.size * 2
            );
        }
        
        this.effectsSystem.update(deltaTime, this.terrain);
        
        // Update spatial grid if tanks moved
        this.updateSpatialGrid();
        
        // Check if projectile phase is over
        if (this.projectileActive && !this.projectileManager.hasActiveProjectiles()) {
            this.projectileActive = false;
            
            // Apply terrain collapse after explosions
            let collapseFrames = 0;
            const maxCollapseFrames = 30; // More frames for smoother animation
            const collapseInterval = setInterval(() => {
                const hasCollapsed = this.terrain.applyTerrainCollapse(this.effectsSystem, this.soundSystem);
                
                // Update tank positions during collapse
                for (let tank of this.tanks) {
                    if (tank.state !== CONSTANTS.TANK_STATES.DESTROYED) {
                        tank.update(16, this.terrain, this.physics); // ~60fps update
                    }
                }
                
                if (hasCollapsed) {
                    this.dirtyRectManager.markFullDirty();
                }
                collapseFrames++;
                
                // Stop after max frames or when terrain stabilizes
                if (collapseFrames >= maxCollapseFrames || (!hasCollapsed && collapseFrames > 5)) {
                    clearInterval(collapseInterval);
                    setTimeout(() => this.endTurn(), 500);
                }
            }, 33); // ~30fps for smoother animation
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
        
        // Draw touch drag feedback (slingshot style)
        if (this.touchDragInfo) {
            this.ctx.save();
            
            const currentTank = this.tanks[this.currentPlayer];
            if (currentTank) {
                // Draw slingshot line (from tank to drag point)
                this.ctx.strokeStyle = '#00ffff';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.moveTo(this.touchDragInfo.tankX, this.touchDragInfo.tankY);
                this.ctx.lineTo(this.touchDragInfo.currentX, this.touchDragInfo.currentY);
                this.ctx.stroke();
                
                // Draw trajectory line (opposite direction from drag)
                const dx = this.touchDragInfo.currentX - this.touchDragInfo.tankX;
                const dy = this.touchDragInfo.currentY - this.touchDragInfo.tankY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 5) { // Only show if dragging significantly
                    // Calculate trajectory endpoint (opposite direction)
                    const trajectoryLength = Math.min(distance * 0.8, 150);
                    const trajectoryEndX = this.touchDragInfo.tankX - (dx / distance) * trajectoryLength;
                    const trajectoryEndY = this.touchDragInfo.tankY - (dy / distance) * trajectoryLength;
                    
                    // Draw trajectory arrow
                    this.ctx.strokeStyle = '#ff00ff';
                    this.ctx.lineWidth = 3;
                    this.ctx.setLineDash([]);
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.touchDragInfo.tankX, this.touchDragInfo.tankY);
                    this.ctx.lineTo(trajectoryEndX, trajectoryEndY);
                    this.ctx.stroke();
                    
                    // Draw arrowhead
                    const arrowSize = 10;
                    const angle = Math.atan2(trajectoryEndY - this.touchDragInfo.tankY, trajectoryEndX - this.touchDragInfo.tankX);
                    this.ctx.beginPath();
                    this.ctx.moveTo(trajectoryEndX, trajectoryEndY);
                    this.ctx.lineTo(
                        trajectoryEndX - arrowSize * Math.cos(angle - Math.PI / 6),
                        trajectoryEndY - arrowSize * Math.sin(angle - Math.PI / 6)
                    );
                    this.ctx.moveTo(trajectoryEndX, trajectoryEndY);
                    this.ctx.lineTo(
                        trajectoryEndX - arrowSize * Math.cos(angle + Math.PI / 6),
                        trajectoryEndY - arrowSize * Math.sin(angle + Math.PI / 6)
                    );
                    this.ctx.stroke();
                }
                
                // Draw power indicator circle
                const power = Math.min(distance * 1.0, 500);
                const radius = Math.min(power * 0.2, 100);
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([3, 3]);
                this.ctx.beginPath();
                this.ctx.arc(this.touchDragInfo.tankX, this.touchDragInfo.tankY, radius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            
            this.ctx.restore();
        }
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
    
    // Update spatial grid with tank positions
    updateSpatialGrid() {
        // Clear and re-add all tanks
        this.physics.spatialGrid.clear();
        
        for (let i = 0; i < this.tanks.length; i++) {
            const tank = this.tanks[i];
            if (tank.state !== CONSTANTS.TANK_STATES.DESTROYED) {
                this.physics.spatialGrid.add(
                    { type: 'tank', tank: tank, index: i },
                    tank.x - CONSTANTS.TANK_WIDTH/2,
                    tank.y - CONSTANTS.TANK_HEIGHT,
                    CONSTANTS.TANK_WIDTH,
                    CONSTANTS.TANK_HEIGHT
                );
            }
        }
    }
    
    // Toggle debug mode
    toggleDebug() {
        this.debugMode = !this.debugMode;
        this.renderer.setDebugMode(this.debugMode);
        console.log('Debug mode:', this.debugMode ? 'ON' : 'OFF');
    }
}