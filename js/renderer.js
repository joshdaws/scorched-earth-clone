// Renderer abstraction layer - supports both Canvas2D and WebGL
class Renderer {
    constructor(canvas, preferWebGL = true) {
        this.canvas = canvas;
        this.type = 'canvas2d';
        this.renderer = null;
        this.debugMode = false;
        
        // Try to initialize WebGL if preferred
        if (preferWebGL) {
            try {
                this.renderer = new WebGLRenderer(canvas);
                this.type = 'webgl';
                console.log('Using WebGL renderer');
            } catch (e) {
                console.warn('WebGL not available, falling back to Canvas2D:', e.message);
            }
        }
        
        // Fallback to Canvas2D
        if (!this.renderer) {
            this.ctx = canvas.getContext('2d');
            this.type = 'canvas2d';
            console.log('Using Canvas2D renderer');
        }
        
        // Cache for rendered elements
        this.cache = new Map();
    }
    
    // Get renderer type
    getType() {
        return this.type;
    }
    
    // Clear the canvas
    clear() {
        if (this.type === 'webgl') {
            this.renderer.clear();
        } else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    // Draw background gradient
    drawBackground(gradient) {
        if (this.type === 'webgl') {
            // For WebGL, we'd need to create a gradient texture
            // For now, just clear with a solid color
            this.renderer.clear();
        } else {
            const canvasGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            for (let i = 0; i < gradient.length; i++) {
                canvasGradient.addColorStop(gradient[i].offset, gradient[i].color);
            }
            this.ctx.fillStyle = canvasGradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    // Draw terrain (from pre-rendered canvas)
    drawTerrain(terrainCanvas) {
        if (this.type === 'webgl') {
            // Create or update terrain texture
            let texture = this.cache.get('terrain');
            if (!texture) {
                texture = this.renderer.createTexture(terrainCanvas, 'terrain');
                this.cache.set('terrain', texture);
            } else {
                this.renderer.updateTexture(texture, terrainCanvas);
            }
            
            // Draw as a sprite
            this.renderer.drawSprite(texture, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.drawImage(terrainCanvas, 0, 0);
        }
    }
    
    // Draw a tank
    drawTank(x, y, color, angle, state) {
        if (this.type === 'webgl') {
            // For WebGL, we'd need tank sprites or generate them
            // For now, create a simple colored square
            const size = CONSTANTS.TANK_WIDTH;
            const r = parseInt(color.substr(1, 2), 16) / 255;
            const g = parseInt(color.substr(3, 2), 16) / 255;
            const b = parseInt(color.substr(5, 2), 16) / 255;
            
            // Draw with glow effect
            this.renderer.drawGlow(
                this.getOrCreateColorTexture(color),
                x - size/2, y - CONSTANTS.TANK_HEIGHT,
                size, CONSTANTS.TANK_HEIGHT,
                [r, g, b, 1], 10
            );
        } else {
            // Canvas2D implementation
            this.ctx.save();
            this.ctx.translate(x, y);
            
            // Draw tank body with glow
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            this.ctx.fillStyle = color;
            
            if (state === CONSTANTS.TANK_STATES.DAMAGED) {
                this.ctx.globalAlpha = 0.7;
            }
            
            // Tank body
            this.ctx.fillRect(-CONSTANTS.TANK_WIDTH/2, -CONSTANTS.TANK_HEIGHT, 
                            CONSTANTS.TANK_WIDTH, CONSTANTS.TANK_HEIGHT);
            
            // Tank dome
            this.ctx.beginPath();
            this.ctx.arc(0, -CONSTANTS.TANK_HEIGHT, CONSTANTS.TANK_WIDTH/3, Math.PI, 0);
            this.ctx.fill();
            
            this.ctx.shadowBlur = 0;
            
            // Draw turret
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            
            const turretLength = 20;
            const angleRad = angle * Math.PI / 180;
            const turretEndX = Math.cos(angleRad) * turretLength;
            const turretEndY = -CONSTANTS.TANK_HEIGHT - Math.sin(angleRad) * turretLength;
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, -CONSTANTS.TANK_HEIGHT);
            this.ctx.lineTo(turretEndX, turretEndY);
            this.ctx.stroke();
            
            this.ctx.restore();
        }
    }
    
    // Draw a projectile with trail
    drawProjectile(x, y, trail, color) {
        if (this.type === 'webgl') {
            // Draw trail as lines
            // For now, just draw the projectile
            const r = parseInt(color.substr(1, 2), 16) / 255;
            const g = parseInt(color.substr(3, 2), 16) / 255;
            const b = parseInt(color.substr(5, 2), 16) / 255;
            
            this.renderer.drawGlow(
                this.getOrCreateColorTexture(color),
                x - 4, y - 4, 8, 8,
                [r, g, b, 1], 10
            );
        } else {
            // Draw trail
            if (trail.length > 1) {
                for (let i = 1; i < trail.length; i++) {
                    const alpha = i / trail.length * 0.8;
                    this.ctx.globalAlpha = alpha;
                    this.ctx.strokeStyle = color;
                    this.ctx.lineWidth = 2 + alpha * 2;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(trail[i-1].x, trail[i-1].y);
                    this.ctx.lineTo(trail[i].x, trail[i].y);
                    this.ctx.stroke();
                }
                this.ctx.globalAlpha = 1;
            }
            
            // Draw projectile
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Inner core
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
    }
    
    // Draw particle
    drawParticle(x, y, size, color, alpha) {
        if (this.type === 'webgl') {
            // Convert color to rgba
            let r, g, b;
            if (color.startsWith('#')) {
                r = parseInt(color.substr(1, 2), 16) / 255;
                g = parseInt(color.substr(3, 2), 16) / 255;
                b = parseInt(color.substr(5, 2), 16) / 255;
            } else {
                // Handle hsl or other formats
                r = g = b = 1;
            }
            
            this.renderer.drawSprite(
                this.getOrCreateColorTexture('#ffffff'),
                x - size/2, y - size/2, size, size,
                [r, g, b, alpha]
            );
        } else {
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x - size/2, y - size/2, size, size);
            this.ctx.globalAlpha = 1;
        }
    }
    
    // Get or create a solid color texture for WebGL
    getOrCreateColorTexture(color) {
        if (this.type !== 'webgl') return null;
        
        let texture = this.cache.get(color);
        if (!texture) {
            // Create a small canvas with the solid color
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 1;
            tempCanvas.height = 1;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.fillStyle = color;
            tempCtx.fillRect(0, 0, 1, 1);
            
            texture = this.renderer.createTexture(tempCanvas);
            this.cache.set(color, texture);
        }
        
        return texture;
    }
    
    // Save current state
    save() {
        if (this.type === 'canvas2d') {
            this.ctx.save();
        }
    }
    
    // Restore state
    restore() {
        if (this.type === 'canvas2d') {
            this.ctx.restore();
        }
    }
    
    // Enable debug mode
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
    
    // Draw debug info
    drawDebug(spatialGrid, dirtyRects) {
        if (!this.debugMode) return;
        
        if (this.type === 'canvas2d') {
            // Draw spatial grid
            if (spatialGrid) {
                spatialGrid.draw(this.ctx);
            }
            
            // Draw dirty rectangles
            if (dirtyRects) {
                dirtyRects.drawDebug(this.ctx);
            }
        }
    }
}

// Export as global
window.Renderer = Renderer;