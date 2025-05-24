// Physics Engine
class Physics {
    constructor() {
        this.gravity = CONSTANTS.GRAVITY_DEFAULT;
        this.wind = 0;
        this.windType = 'random';
        this.wallBehavior = 'wrap';
        this.ceilingBehavior = 'wrap';
        
        // Initialize spatial grid for collision detection
        this.spatialGrid = null;
    }
    
    // Initialize spatial grid with canvas dimensions
    initSpatialGrid(width, height) {
        this.spatialGrid = new SpatialGrid(width, height, 50);
    }
    
    setGravity(value) {
        this.gravity = value;
    }
    
    setWindType(type) {
        this.windType = type;
        this.updateWind();
    }
    
    updateWind() {
        switch(this.windType) {
            case 'none':
                this.wind = 0;
                break;
            case 'constant':
                if (this.wind === 0) {
                    this.wind = (Math.random() - 0.5) * CONSTANTS.WIND_MAX * 2;
                }
                break;
            case 'changing':
                // Change wind slightly each turn
                const change = (Math.random() - 0.5) * 2;
                this.wind = Math.max(-CONSTANTS.WIND_MAX, 
                    Math.min(CONSTANTS.WIND_MAX, this.wind + change));
                break;
            case 'random':
                this.wind = (Math.random() - 0.5) * CONSTANTS.WIND_MAX * 2;
                break;
        }
    }
    
    calculateTrajectory(x, y, angle, power, deltaTime) {
        // Convert angle to radians
        const angleRad = angle * Math.PI / 180;
        
        // Scale power to reasonable velocity (power is 0-100, convert to pixels/second)
        // At power 100, projectile should be able to cross most of the screen
        const initialVelocity = power * 8; // Increased from 3 to 8 for better range
        
        // Calculate velocity components
        const vx = initialVelocity * Math.cos(angleRad);
        const vy = -initialVelocity * Math.sin(angleRad);
        
        // Wind is applied to horizontal velocity
        const windEffect = this.wind * 0.5; // Scale down wind effect
        
        return {
            vx: vx + windEffect,
            vy: vy
        };
    }
    
    handleBoundaryCollision(x, y, vx, vy, width, height) {
        let newX = x;
        let newY = y;
        let newVx = vx;
        let newVy = vy;
        let hit = false;
        
        // Handle walls
        if (x < 0 || x > width) {
            hit = true;
            switch(this.wallBehavior) {
                case 'bounce':
                    newVx = -vx * 0.8; // Some energy loss
                    newX = x < 0 ? 0 : width;
                    break;
                case 'wrap':
                    newX = x < 0 ? width : 0;
                    break;
                case 'absorb':
                    return { absorbed: true };
            }
        }
        
        // Handle ceiling
        if (y < 0) {
            hit = true;
            switch(this.ceilingBehavior) {
                case 'bounce':
                    newVy = -vy * 0.8;
                    newY = 0;
                    break;
                case 'wrap':
                    // For ceiling wrap, maintain horizontal position but reset from top
                    newY = 0;
                    newVy = Math.abs(vy) * 0.5; // Reduce speed when wrapping
                    break;
                case 'absorb':
                    return { absorbed: true };
            }
        }
        
        return {
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            hit: hit,
            absorbed: false
        };
    }
    
    // Calculate fall damage based on velocity
    calculateFallDamage(velocity, height) {
        if (height < CONSTANTS.TANK_FALL_DAMAGE_HEIGHT) {
            return 0;
        }
        
        // Damage scales with fall height
        const heightFactor = (height - CONSTANTS.TANK_FALL_DAMAGE_HEIGHT) / 50;
        return Math.floor(heightFactor * 25);
    }
    
    // Check if a projectile would hit a tank
    checkTankCollision(x, y, tanks) {
        // Use spatial grid if available for better performance
        if (this.spatialGrid) {
            const nearbyObjects = this.spatialGrid.getNearby(x, y, CONSTANTS.TANK_WIDTH);
            
            for (let obj of nearbyObjects) {
                if (obj.type === 'tank' && obj.tank.state !== CONSTANTS.TANK_STATES.DESTROYED) {
                    const dx = x - obj.tank.x;
                    const dy = y - obj.tank.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < CONSTANTS.TANK_WIDTH / 2) {
                        return obj.tank;
                    }
                }
            }
            return null;
        }
        
        // Fallback to brute force if no spatial grid
        for (let tank of tanks) {
            if (tank.state === CONSTANTS.TANK_STATES.DESTROYED) continue;
            
            const dx = x - tank.x;
            const dy = y - tank.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < CONSTANTS.TANK_WIDTH / 2) {
                return tank;
            }
        }
        return null;
    }
    
    // Apply explosion force to nearby objects
    applyExplosionForce(x, y, radius, force, tanks) {
        // Use spatial grid if available
        if (this.spatialGrid) {
            const nearbyObjects = this.spatialGrid.getNearby(x, y, radius);
            
            for (let obj of nearbyObjects) {
                if (obj.type === 'tank' && obj.tank.state !== CONSTANTS.TANK_STATES.DESTROYED) {
                    const tank = obj.tank;
                    const dx = tank.x - x;
                    const dy = tank.y - y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < radius && distance > 0) {
                        const forceMagnitude = force * (1 - distance / radius);
                        const forceX = (dx / distance) * forceMagnitude;
                        const forceY = (dy / distance) * forceMagnitude;
                        
                        tank.applyForce(forceX, forceY);
                    }
                }
            }
            return;
        }
        
        // Fallback to brute force
        for (let tank of tanks) {
            if (tank.state === CONSTANTS.TANK_STATES.DESTROYED) continue;
            
            const dx = tank.x - x;
            const dy = tank.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < radius && distance > 0) {
                const forceMagnitude = force * (1 - distance / radius);
                const forceX = (dx / distance) * forceMagnitude;
                const forceY = (dy / distance) * forceMagnitude;
                
                // Apply force to tank (could cause it to move/fall)
                tank.applyForce(forceX, forceY);
            }
        }
    }
    
    // Helper function to check line of sight between two points
    hasLineOfSight(x1, y1, x2, y2, terrain) {
        const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const steps = Math.ceil(distance / 5);
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            
            if (terrain.checkCollision(x, y)) {
                return false;
            }
        }
        
        return true;
    }
    
    // Calculate optimal angle and power for AI
    calculateOptimalShot(fromX, fromY, toX, toY, iterations = 10) {
        let bestAngle = 45;
        let bestPower = 50;
        let bestDistance = Infinity;
        
        // Try different angles and powers
        for (let angle = 15; angle <= 165; angle += 5) {
            for (let power = 20; power <= 100; power += 10) {
                // Simulate trajectory with proper scaling
                let x = fromX;
                let y = fromY;
                const initialVelocity = power * 8; // Same scaling as actual projectiles
                let vx = initialVelocity * Math.cos(angle * Math.PI / 180);
                let vy = -initialVelocity * Math.sin(angle * Math.PI / 180);
                
                for (let t = 0; t < 100; t += 0.1) {
                    const dt = 0.1;
                    x += vx * dt;
                    y += vy * dt;
                    vy += this.gravity * dt * 120; // Same gravity scaling as projectiles
                    vx += this.wind * dt * 2; // Include wind effect
                    
                    const distance = Math.sqrt((x - toX) ** 2 + (y - toY) ** 2);
                    
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestAngle = angle;
                        bestPower = power;
                    }
                    
                    if (y > CONSTANTS.CANVAS_HEIGHT) break;
                }
            }
        }
        
        return { angle: bestAngle, power: bestPower };
    }
}