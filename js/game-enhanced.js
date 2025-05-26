// Enhanced Game Integration Module
// This module integrates the new libraries while maintaining compatibility

class GameEnhanced {
    constructor(existingGame) {
        this.game = existingGame;
        this.enhanced = false;
        
        // Enhanced modules
        this.enhancedPhysics = null;
        this.pixiRenderer = null;
        this.uiAnimations = null;
        
        // Performance monitoring
        this.stats = {
            fps: 60,
            frameTime: 0,
            drawCalls: 0
        };
    }
    
    // Initialize enhanced features
    async initializeEnhancements() {
        try {
            console.log('Initializing game enhancements...');
            
            // Initialize UI animations first (lightweight)
            this.uiAnimations = new UIAnimations();
            this.enhanceUI();
            
            // Check if we should use enhanced renderer
            const usePixi = this.shouldUsePixiRenderer();
            if (usePixi) {
                await this.initializePixiRenderer();
            }
            
            // Check if we should use Matter.js physics
            const useMatter = this.shouldUseMatterPhysics();
            if (useMatter) {
                this.initializeMatterPhysics();
            }
            
            this.enhanced = true;
            console.log('Game enhancements initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize enhancements:', error);
            console.log('Falling back to standard game mode');
        }
    }
    
    // Determine if we should use PIXI renderer
    shouldUsePixiRenderer() {
        // Check WebGL support and performance
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            console.log('WebGL not supported, using standard renderer');
            return false;
        }
        
        // Check device performance
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile && window.innerWidth < 768) {
            console.log('Mobile device detected, using standard renderer for performance');
            return false;
        }
        
        return true;
    }
    
    // Initialize PIXI renderer
    async initializePixiRenderer() {
        const canvas = this.game.renderer.canvas;
        
        // Create PIXI renderer
        this.pixiRenderer = new PIXIRenderer(canvas, {
            antialias: true,
            resolution: window.devicePixelRatio || 1
        });
        
        // Override game's render methods
        this.overrideRenderMethods();
        
        console.log('PIXI renderer initialized');
    }
    
    // Override rendering methods to use PIXI
    overrideRenderMethods() {
        const originalRender = this.game.render.bind(this.game);
        const self = this;
        
        // Override main render method
        this.game.render = function() {
            if (self.pixiRenderer) {
                self.renderWithPixi();
            } else {
                originalRender();
            }
        };
        
        // Override terrain rendering
        const originalRenderTerrain = this.game.terrain.render.bind(this.game.terrain);
        this.game.terrain.render = function(ctx) {
            if (self.pixiRenderer) {
                // Render terrain to off-screen canvas as usual
                originalRenderTerrain(ctx);
                // Update PIXI terrain sprite
                self.pixiRenderer.updateTerrain(this.canvas);
            } else {
                originalRenderTerrain(ctx);
            }
        };
    }
    
    // Render with PIXI
    renderWithPixi() {
        const pixi = this.pixiRenderer;
        
        // Clear
        pixi.app.renderer.clear();
        
        // Render tanks
        this.game.tanks.forEach(tank => {
            const sprite = pixi.createTank(
                tank.id,
                tank.x,
                tank.y,
                tank.color,
                tank.angle
            );
            
            // Update tank state
            if (tank.state === CONSTANTS.TANK_STATES.DAMAGED) {
                sprite.alpha = 0.7;
            }
            
            // Add shield if active
            if (tank.shield) {
                pixi.createShield(tank.id, tank.shield.type);
            }
        });
        
        // Render projectiles
        this.game.projectileManager.projectiles.forEach(projectile => {
            if (!projectile.exploded) {
                pixi.updateProjectile(
                    projectile.id,
                    projectile.x,
                    projectile.y
                );
            }
        });
        
        // Render effects
        this.game.effectsManager.effects.forEach(effect => {
            if (effect.type === 'explosion' && effect.particles.length > 0) {
                // Particles are handled by PIXI's explosion effect
            }
        });
        
        // Update debug
        if (this.game.debugMode) {
            pixi.updateDebug(
                this.game.physics.spatialGrid,
                this.game.dirtyRectManager
            );
        }
        
        // Render PIXI stage
        pixi.app.renderer.render(pixi.stage);
    }
    
    // Determine if we should use Matter.js physics
    shouldUseMatterPhysics() {
        // For now, keep the existing physics as it works well
        // Matter.js integration would require significant refactoring
        return false;
    }
    
    // Initialize Matter.js physics
    initializeMatterPhysics() {
        this.enhancedPhysics = new EnhancedPhysics();
        this.enhancedPhysics.initSpatialGrid(
            this.game.canvas.width,
            this.game.canvas.height
        );
        
        // Override physics methods
        this.overridePhysicsMethods();
        
        console.log('Matter.js physics initialized');
    }
    
    // Override physics methods to use Matter.js
    overridePhysicsMethods() {
        // This would require significant refactoring
        // Keep for future implementation
    }
    
    // Enhance UI with animations
    enhanceUI() {
        const ui = this.uiAnimations;
        
        // Enhance menu screen
        const menuScreen = document.getElementById('menu-screen');
        if (menuScreen) {
            ui.animateMenuScreen({
                title: menuScreen.querySelector('h1'),
                buttons: menuScreen.querySelectorAll('button'),
                version: menuScreen.querySelector('.version')
            });
        }
        
        // Add hover effects to all buttons
        document.querySelectorAll('button').forEach(button => {
            ui.addButtonHoverEffects(button);
        });
        
        // Override UI manager methods
        this.overrideUIMethods();
    }
    
    // Override UI methods to add animations
    overrideUIMethods() {
        const uiManager = this.game.ui;  // Fixed: use this.game.ui not this.game.uiManager
        const animations = this.uiAnimations;
        
        // Check if UI manager exists
        if (!uiManager) {
            console.warn('UI manager not found, skipping UI enhancements');
            return;
        }
        
        // Animate shop open/close
        const originalShowShop = uiManager.showShop.bind(uiManager);
        uiManager.showShop = function() {
            originalShowShop();
            const shopScreen = document.getElementById('shop-screen');
            if (shopScreen) {
                animations.animateShopOpen(shopScreen);
            }
        };
        
        // Animate turn changes
        const originalUpdateTurnIndicator = uiManager.updateTurnIndicator.bind(uiManager);
        uiManager.updateTurnIndicator = function(player) {
            originalUpdateTurnIndicator(player);
            const playerElement = document.querySelector('.current-player');
            if (playerElement) {
                animations.animateTurnIndicator(playerElement);
            }
        };
        
        // Animate score updates
        const originalUpdateScore = uiManager.updatePlayerScore.bind(uiManager);
        uiManager.updatePlayerScore = function(player) {
            const scoreElement = document.getElementById(`score-${player.id}`);
            const oldScore = scoreElement ? parseInt(scoreElement.textContent) : 0;
            originalUpdateScore(player);
            
            if (scoreElement && oldScore !== player.score) {
                animations.animateScoreUpdate(scoreElement, oldScore, player.score);
            }
        };
        
        // Animate money updates
        const originalUpdateMoney = uiManager.updatePlayerMoney.bind(uiManager);
        uiManager.updatePlayerMoney = function(player) {
            const moneyElement = document.getElementById(`money-${player.id}`);
            const oldMoney = moneyElement ? parseInt(moneyElement.textContent.replace('$', '')) : 0;
            originalUpdateMoney(player);
            
            if (moneyElement && oldMoney < player.money) {
                // Animate money gain
                const tankPos = player.tank ? player.tank.getPosition() : { x: 400, y: 300 };
                animations.animateMoneyGain(
                    moneyElement,
                    player.money - oldMoney,
                    tankPos.x,
                    tankPos.y
                );
            }
        };
        
        // Animate damage numbers
        const originalDamage = this.game.handleDamage;
        if (originalDamage) {
            this.game.handleDamage = function(tank, damage, x, y) {
                originalDamage.call(this, tank, damage);
                
                // Show damage number
                animations.animateDamageNumber(x, y, damage, damage > 50);
            };
        }
    }
    
    // Add performance monitoring
    startPerformanceMonitoring() {
        let lastTime = performance.now();
        let frames = 0;
        
        const monitor = () => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;
            
            frames++;
            
            if (deltaTime >= 1000) {
                this.stats.fps = Math.round(frames * 1000 / deltaTime);
                this.stats.frameTime = deltaTime / frames;
                frames = 0;
                lastTime = currentTime;
                
                // Update performance display
                this.updatePerformanceDisplay();
            }
            
            requestAnimationFrame(monitor);
        };
        
        monitor();
    }
    
    // Update performance display
    updatePerformanceDisplay() {
        let perfDisplay = document.getElementById('performance-display');
        if (!perfDisplay) {
            perfDisplay = document.createElement('div');
            perfDisplay.id = 'performance-display';
            perfDisplay.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.7);
                color: #00ff00;
                padding: 10px;
                font-family: monospace;
                font-size: 12px;
                z-index: 10000;
                display: none;
            `;
            document.body.appendChild(perfDisplay);
        }
        
        if (this.game.debugMode) {
            perfDisplay.style.display = 'block';
            perfDisplay.innerHTML = `
                FPS: ${this.stats.fps}<br>
                Frame: ${this.stats.frameTime.toFixed(2)}ms<br>
                Renderer: ${this.pixiRenderer ? 'PIXI' : 'Canvas2D'}<br>
                Physics: ${this.enhancedPhysics ? 'Matter.js' : 'Standard'}
            `;
        } else {
            perfDisplay.style.display = 'none';
        }
    }
    
    // Toggle enhanced mode
    toggleEnhanced() {
        this.enhanced = !this.enhanced;
        
        if (this.enhanced) {
            console.log('Enhanced mode enabled');
            this.initializeEnhancements();
        } else {
            console.log('Enhanced mode disabled');
            // Restore original methods
            location.reload(); // Simple way to restore
        }
    }
    
    // Clean up
    destroy() {
        if (this.pixiRenderer) {
            this.pixiRenderer.destroy();
        }
        
        if (this.enhancedPhysics) {
            this.enhancedPhysics.destroy();
        }
        
        if (this.uiAnimations) {
            this.uiAnimations.killAll();
        }
    }
}

// Export as global
if (typeof window !== 'undefined') {
    window.GameEnhanced = GameEnhanced;
}