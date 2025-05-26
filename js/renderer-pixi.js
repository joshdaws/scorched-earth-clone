// Enhanced Renderer using PIXI.js
// Assumes PIXI and gsap are loaded globally

class PIXIRenderer {
    constructor(canvas, options = {}) {
        // Initialize PIXI Application with Canvas2D fallback
        try {
            this.app = new PIXI.Application({
                width: canvas.width,
                height: canvas.height,
                view: canvas,
                backgroundColor: 0x000000,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                forceCanvas: true,  // Force Canvas2D renderer instead of WebGL
                ...options
            });
        } catch (error) {
            console.warn('PIXI.js initialization failed:', error);
            throw new Error('PIXI renderer not available');
        }
        
        // Container hierarchy
        this.stage = this.app.stage;
        this.backgroundContainer = new PIXI.Container();
        this.terrainContainer = new PIXI.Container();
        this.tanksContainer = new PIXI.Container();
        this.projectilesContainer = new PIXI.Container();
        this.effectsContainer = new PIXI.Container();
        this.uiContainer = new PIXI.Container();
        
        // Add containers in render order
        this.stage.addChild(this.backgroundContainer);
        this.stage.addChild(this.terrainContainer);
        this.stage.addChild(this.tanksContainer);
        this.stage.addChild(this.projectilesContainer);
        this.stage.addChild(this.effectsContainer);
        this.stage.addChild(this.uiContainer);
        
        // Asset cache
        this.textures = new Map();
        this.sprites = new Map();
        
        // Special effects
        this.filters = {
            glow: new PIXI.filters.GlowFilter({
                distance: 15,
                outerStrength: 2,
                color: 0xffffff,
                quality: 0.5
            }),
            blur: new PIXI.filters.BlurFilter(2),
            shock: new PIXI.filters.ShockwaveFilter()
        };
        
        // Particle emitters
        this.emitters = new Map();
        
        // Initialize background
        this.initBackground();
        
        // Debug mode
        this.debugMode = false;
        this.debugGraphics = new PIXI.Graphics();
        this.stage.addChild(this.debugGraphics);
    }
    
    // Initialize animated background
    initBackground() {
        // Create gradient background
        const gradient = new PIXI.Graphics();
        const colors = [0x0a0015, 0x1a0033, 0x2d004d, 0x400066];
        
        gradient.beginFill(colors[0]);
        gradient.drawRect(0, 0, this.app.screen.width, this.app.screen.height * 0.3);
        
        for (let i = 1; i < colors.length; i++) {
            const y = (this.app.screen.height * 0.3 * i) / colors.length;
            const height = this.app.screen.height * 0.3 / colors.length;
            gradient.beginFill(colors[i]);
            gradient.drawRect(0, y, this.app.screen.width, height);
        }
        
        // Add synthwave sun
        const sun = new PIXI.Graphics();
        sun.beginFill(0xff0066);
        sun.drawCircle(0, 0, 80);
        sun.endFill();
        sun.x = this.app.screen.width * 0.7;
        sun.y = this.app.screen.height * 0.3;
        
        // Add glow to sun
        sun.filters = [this.filters.glow];
        
        // Animate sun with GSAP
        gsap.to(sun, {
            y: this.app.screen.height * 0.35,
            duration: 4,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });
        
        // Add grid lines for retro effect
        const grid = new PIXI.Graphics();
        grid.lineStyle(1, 0xff00ff, 0.3);
        
        // Horizontal lines
        for (let y = this.app.screen.height * 0.5; y < this.app.screen.height; y += 20) {
            grid.moveTo(0, y);
            grid.lineTo(this.app.screen.width, y);
        }
        
        // Vertical lines with perspective
        const centerX = this.app.screen.width / 2;
        for (let x = -10; x <= 10; x++) {
            const startX = centerX + x * 40;
            const endX = centerX + x * 200;
            grid.moveTo(startX, this.app.screen.height * 0.5);
            grid.lineTo(endX, this.app.screen.height);
        }
        
        this.backgroundContainer.addChild(gradient);
        this.backgroundContainer.addChild(grid);
        this.backgroundContainer.addChild(sun);
        
        // Store references
        this.sun = sun;
        this.grid = grid;
    }
    
    // Update terrain from canvas
    updateTerrain(terrainCanvas) {
        // Remove old terrain sprite
        this.terrainContainer.removeChildren();
        
        // Create texture from terrain canvas
        const texture = PIXI.Texture.from(terrainCanvas);
        const terrain = new PIXI.Sprite(texture);
        
        // Add slight glow to terrain edges
        terrain.filters = [new PIXI.filters.OutlineFilter(2, 0x00ffff, 0.5)];
        
        this.terrainContainer.addChild(terrain);
        this.terrainSprite = terrain;
    }
    
    // Create or update tank
    createTank(id, x, y, color, angle) {
        let tankContainer = this.sprites.get(`tank_${id}`);
        
        if (!tankContainer) {
            tankContainer = new PIXI.Container();
            
            // Tank body
            const body = new PIXI.Graphics();
            body.beginFill(parseInt(color.replace('#', '0x')));
            body.drawRect(-CONSTANTS.TANK_WIDTH/2, -CONSTANTS.TANK_HEIGHT, 
                         CONSTANTS.TANK_WIDTH, CONSTANTS.TANK_HEIGHT);
            body.endFill();
            
            // Tank dome
            body.beginFill(parseInt(color.replace('#', '0x')));
            body.drawCircle(0, -CONSTANTS.TANK_HEIGHT, CONSTANTS.TANK_WIDTH/3);
            body.endFill();
            
            // Turret
            const turret = new PIXI.Graphics();
            turret.lineStyle(4, parseInt(color.replace('#', '0x')));
            turret.moveTo(0, 0);
            turret.lineTo(20, 0);
            turret.position.y = -CONSTANTS.TANK_HEIGHT;
            
            // Add glow effect
            body.filters = [this.filters.glow];
            
            tankContainer.addChild(body);
            tankContainer.addChild(turret);
            
            // Store references
            tankContainer.body = body;
            tankContainer.turret = turret;
            
            this.tanksContainer.addChild(tankContainer);
            this.sprites.set(`tank_${id}`, tankContainer);
        }
        
        // Update position
        tankContainer.position.set(x, y);
        
        // Update turret angle
        tankContainer.turret.rotation = (angle - 90) * Math.PI / 180;
        
        return tankContainer;
    }
    
    // Animate tank damage
    damageTank(id) {
        const tank = this.sprites.get(`tank_${id}`);
        if (!tank) return;
        
        // Flash red
        gsap.to(tank, {
            tint: 0xff0000,
            duration: 0.1,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                tank.tint = 0xffffff;
            }
        });
        
        // Shake
        gsap.to(tank.position, {
            x: tank.position.x + (Math.random() - 0.5) * 10,
            y: tank.position.y + (Math.random() - 0.5) * 10,
            duration: 0.05,
            repeat: 5,
            yoyo: true
        });
    }
    
    // Destroy tank with animation
    destroyTank(id) {
        const tank = this.sprites.get(`tank_${id}`);
        if (!tank) return;
        
        // Create explosion particles
        this.createExplosion(tank.position.x, tank.position.y, 'large');
        
        // Animate destruction
        gsap.to(tank.scale, {
            x: 0,
            y: 0,
            duration: 0.5,
            ease: "back.in",
            onComplete: () => {
                this.tanksContainer.removeChild(tank);
                this.sprites.delete(`tank_${id}`);
            }
        });
        
        gsap.to(tank, {
            rotation: Math.random() * Math.PI * 2,
            duration: 0.5
        });
    }
    
    // Create projectile
    createProjectile(id, x, y, type = 'standard') {
        const projectile = new PIXI.Container();
        
        // Main projectile body
        const body = new PIXI.Graphics();
        const color = type === 'nuke' ? 0xff0000 : 0xffff00;
        const size = type === 'nuke' ? 8 : 4;
        
        body.beginFill(color);
        body.drawCircle(0, 0, size);
        body.endFill();
        
        // Inner core
        body.beginFill(0xffffff);
        body.drawCircle(0, 0, size/2);
        body.endFill();
        
        // Trail effect
        const trail = new PIXI.Graphics();
        projectile.trail = trail;
        projectile.trailPoints = [];
        
        // Add glow
        body.filters = [this.filters.glow];
        
        projectile.addChild(trail);
        projectile.addChild(body);
        projectile.position.set(x, y);
        
        this.projectilesContainer.addChild(projectile);
        this.sprites.set(`projectile_${id}`, projectile);
        
        return projectile;
    }
    
    // Update projectile with trail
    updateProjectile(id, x, y) {
        const projectile = this.sprites.get(`projectile_${id}`);
        if (!projectile) return;
        
        // Update position
        projectile.position.set(x, y);
        
        // Update trail
        projectile.trailPoints.push({ x, y });
        if (projectile.trailPoints.length > 20) {
            projectile.trailPoints.shift();
        }
        
        // Redraw trail
        const trail = projectile.trail;
        trail.clear();
        
        if (projectile.trailPoints.length > 1) {
            for (let i = 1; i < projectile.trailPoints.length; i++) {
                const alpha = i / projectile.trailPoints.length;
                trail.lineStyle(2 + alpha * 2, 0xffff00, alpha * 0.8);
                trail.moveTo(
                    projectile.trailPoints[i-1].x - x,
                    projectile.trailPoints[i-1].y - y
                );
                trail.lineTo(
                    projectile.trailPoints[i].x - x,
                    projectile.trailPoints[i].y - y
                );
            }
        }
    }
    
    // Remove projectile
    removeProjectile(id) {
        const projectile = this.sprites.get(`projectile_${id}`);
        if (projectile) {
            this.projectilesContainer.removeChild(projectile);
            this.sprites.delete(`projectile_${id}`);
        }
    }
    
    // Create explosion effect
    createExplosion(x, y, size = 'medium') {
        const explosion = new PIXI.Container();
        explosion.position.set(x, y);
        
        // Shockwave effect
        const shockwave = new PIXI.Graphics();
        shockwave.beginFill(0xffffff, 0.3);
        shockwave.drawCircle(0, 0, 1);
        shockwave.endFill();
        
        explosion.addChild(shockwave);
        
        // Animate shockwave
        const maxRadius = size === 'large' ? 150 : size === 'medium' ? 80 : 40;
        gsap.to(shockwave.scale, {
            x: maxRadius,
            y: maxRadius,
            duration: 0.5,
            ease: "power2.out"
        });
        
        gsap.to(shockwave, {
            alpha: 0,
            duration: 0.5,
            onComplete: () => {
                this.effectsContainer.removeChild(explosion);
            }
        });
        
        // Particle burst
        const particleCount = size === 'large' ? 50 : size === 'medium' ? 30 : 15;
        for (let i = 0; i < particleCount; i++) {
            const particle = new PIXI.Graphics();
            const particleSize = Math.random() * 4 + 2;
            const color = Math.random() > 0.5 ? 0xff0066 : 0xffcc00;
            
            particle.beginFill(color);
            particle.drawRect(-particleSize/2, -particleSize/2, particleSize, particleSize);
            particle.endFill();
            
            const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
            const speed = Math.random() * 5 + 2;
            const distance = Math.random() * maxRadius + 20;
            
            explosion.addChild(particle);
            
            // Animate particle
            gsap.to(particle, {
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                rotation: Math.random() * Math.PI * 2,
                duration: 0.8,
                ease: "power2.out"
            });
            
            gsap.to(particle, {
                alpha: 0,
                duration: 0.8,
                delay: 0.2
            });
        }
        
        // Flash effect
        const flash = new PIXI.Graphics();
        flash.beginFill(0xffffff);
        flash.drawCircle(0, 0, maxRadius);
        flash.endFill();
        flash.alpha = 0.8;
        flash.blendMode = PIXI.BLEND_MODES.ADD;
        
        explosion.addChild(flash);
        
        gsap.to(flash, {
            alpha: 0,
            duration: 0.2
        });
        
        // Screen shake for large explosions
        if (size === 'large') {
            this.shakeScreen(10, 0.5);
        }
        
        this.effectsContainer.addChild(explosion);
    }
    
    // Screen shake effect
    shakeScreen(intensity = 5, duration = 0.3) {
        const originalX = this.stage.position.x;
        const originalY = this.stage.position.y;
        
        gsap.to(this.stage.position, {
            x: originalX + (Math.random() - 0.5) * intensity,
            y: originalY + (Math.random() - 0.5) * intensity,
            duration: 0.02,
            repeat: duration / 0.02,
            yoyo: true,
            onUpdate: () => {
                this.stage.position.x = originalX + (Math.random() - 0.5) * intensity;
                this.stage.position.y = originalY + (Math.random() - 0.5) * intensity;
            },
            onComplete: () => {
                this.stage.position.x = originalX;
                this.stage.position.y = originalY;
            }
        });
    }
    
    // Create shield effect
    createShield(tankId, type = 'standard') {
        const tank = this.sprites.get(`tank_${tankId}`);
        if (!tank) return;
        
        const shield = new PIXI.Graphics();
        const color = type === 'supermag' ? 0xff00ff : type === 'deflector' ? 0x00ffff : 0x00ff00;
        
        shield.lineStyle(2, color, 0.8);
        shield.beginFill(color, 0.2);
        shield.drawCircle(0, -CONSTANTS.TANK_HEIGHT/2, 40);
        shield.endFill();
        
        // Add electric effect
        shield.filters = [
            new PIXI.filters.GlowFilter({
                distance: 20,
                outerStrength: 3,
                color: color
            })
        ];
        
        // Animate shield
        gsap.to(shield, {
            rotation: Math.PI * 2,
            duration: 3,
            repeat: -1,
            ease: "none"
        });
        
        gsap.to(shield.scale, {
            x: 1.1,
            y: 1.1,
            duration: 1,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });
        
        tank.shield = shield;
        tank.addChild(shield);
    }
    
    // Remove shield
    removeShield(tankId) {
        const tank = this.sprites.get(`tank_${tankId}`);
        if (tank && tank.shield) {
            tank.removeChild(tank.shield);
            tank.shield = null;
        }
    }
    
    // Update debug graphics
    updateDebug(spatialGrid, dirtyRects) {
        if (!this.debugMode) {
            this.debugGraphics.clear();
            return;
        }
        
        this.debugGraphics.clear();
        this.debugGraphics.lineStyle(1, 0x00ff00, 0.5);
        
        // Draw spatial grid
        if (spatialGrid) {
            const cellSize = spatialGrid.cellSize;
            for (let x = 0; x < spatialGrid.cols; x++) {
                for (let y = 0; y < spatialGrid.rows; y++) {
                    this.debugGraphics.drawRect(
                        x * cellSize, 
                        y * cellSize, 
                        cellSize, 
                        cellSize
                    );
                }
            }
        }
        
        // Draw dirty rects
        if (dirtyRects) {
            this.debugGraphics.lineStyle(2, 0xff0000, 0.8);
            dirtyRects.rects.forEach(rect => {
                this.debugGraphics.drawRect(rect.x, rect.y, rect.width, rect.height);
            });
        }
    }
    
    // Set debug mode
    setDebugMode(enabled) {
        this.debugMode = enabled;
        if (!enabled) {
            this.debugGraphics.clear();
        }
    }
    
    // Render frame
    render() {
        // PIXI automatically renders with its ticker
        // This method is for compatibility with existing game loop
    }
    
    // Resize handler
    resize(width, height) {
        this.app.renderer.resize(width, height);
        
        // Update background
        this.backgroundContainer.removeChildren();
        this.initBackground();
    }
    
    // Destroy renderer
    destroy() {
        this.app.destroy(true);
    }
}

// Export as global
if (typeof window !== 'undefined') {
    window.PIXIRenderer = PIXIRenderer;
}