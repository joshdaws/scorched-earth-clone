// Enhanced Physics Engine using Matter.js
// Assumes Matter.js is loaded globally

class EnhancedPhysics {
    constructor() {
        // Create Matter.js engine
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;
        
        // Configure gravity
        this.engine.gravity.scale = 0.001; // Scale down for pixel-based game
        this.setGravity(CONSTANTS.GRAVITY_DEFAULT);
        
        // Wind properties
        this.wind = 0;
        this.windType = 'random';
        this.wallBehavior = 'wrap';
        this.ceilingBehavior = 'wrap';
        
        // Collision categories
        this.categories = {
            terrain: 0x0001,
            tank: 0x0002,
            projectile: 0x0004,
            particle: 0x0008
        };
        
        // Terrain body (will be updated dynamically)
        this.terrainBody = null;
        
        // Active bodies
        this.projectiles = new Map();
        this.particles = new Map();
        this.tanks = new Map();
        
        // Performance optimization
        this.spatialGrid = null;
        
        // Configure engine for better performance
        this.engine.constraintIterations = 2;
        this.engine.positionIterations = 6;
        this.engine.velocityIterations = 4;
    }
    
    // Initialize spatial grid with canvas dimensions
    initSpatialGrid(width, height) {
        this.spatialGrid = new SpatialGrid(width, height, 50);
    }
    
    setGravity(value) {
        // Matter.js uses gravity.y (positive is down)
        this.engine.gravity.y = value * 0.001;
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
                const change = (Math.random() - 0.5) * 2;
                this.wind = Math.max(-CONSTANTS.WIND_MAX, 
                    Math.min(CONSTANTS.WIND_MAX, this.wind + change));
                break;
            case 'random':
                this.wind = (Math.random() - 0.5) * CONSTANTS.WIND_MAX * 2;
                break;
        }
    }
    
    // Create terrain body from height data
    updateTerrain(terrainHeights, width, height) {
        // Remove old terrain body
        if (this.terrainBody) {
            Matter.World.remove(this.world, this.terrainBody);
        }
        
        // Create vertices for terrain outline
        const vertices = [];
        const step = 2; // Sample every 2 pixels for performance
        
        // Top edge of terrain
        for (let x = 0; x < width; x += step) {
            vertices.push({ x: x, y: terrainHeights[x] });
        }
        
        // Bottom and sides to close the shape
        vertices.push({ x: width, y: height });
        vertices.push({ x: 0, y: height });
        
        // Create static body for terrain
        this.terrainBody = Matter.Bodies.fromVertices(
            width / 2, height / 2, 
            [vertices], 
            {
                isStatic: true,
                friction: 0.8,
                restitution: 0.2,
                collisionFilter: {
                    category: this.categories.terrain
                }
            }
        );
        
        Matter.World.add(this.world, this.terrainBody);
    }
    
    // Create a tank body
    createTank(id, x, y) {
        const tankBody = Matter.Bodies.rectangle(
            x, y - CONSTANTS.TANK_HEIGHT / 2,
            CONSTANTS.TANK_WIDTH, CONSTANTS.TANK_HEIGHT,
            {
                friction: 0.8,
                restitution: 0.1,
                density: 0.01,
                collisionFilter: {
                    category: this.categories.tank,
                    mask: this.categories.terrain | this.categories.tank
                },
                label: 'tank',
                tankId: id
            }
        );
        
        this.tanks.set(id, tankBody);
        Matter.World.add(this.world, tankBody);
        
        return tankBody;
    }
    
    // Update tank position (for sliding/falling)
    updateTankPhysics(tank, terrain, deltaTime) {
        const tankBody = this.tanks.get(tank.id);
        if (!tankBody) return;
        
        // Update Matter.js body position to match tank
        Matter.Body.setPosition(tankBody, {
            x: tank.x,
            y: tank.y - CONSTANTS.TANK_HEIGHT / 2
        });
        
        // Let Matter.js handle the physics
        Matter.Engine.update(this.engine, deltaTime);
        
        // Update tank position from Matter.js body
        tank.x = tankBody.position.x;
        tank.y = tankBody.position.y + CONSTANTS.TANK_HEIGHT / 2;
        
        // Check if tank is on ground
        const groundY = terrain.getHeight(Math.floor(tank.x));
        tank.onGround = Math.abs(tank.y - groundY) < 2;
        
        // Apply sliding physics if on slope
        if (tank.onGround && !tank.buried) {
            const slope = terrain.getSlope(Math.floor(tank.x));
            if (Math.abs(slope) > 0.3) {
                Matter.Body.applyForce(tankBody, tankBody.position, {
                    x: slope * 0.0001,
                    y: 0
                });
            }
        }
    }
    
    // Create a projectile body
    createProjectile(x, y, velocityX, velocityY, type = 'standard') {
        const radius = type === 'nuke' ? 8 : 4;
        
        const projectileBody = Matter.Bodies.circle(x, y, radius, {
            friction: 0.001,
            restitution: 0.8,
            density: 0.001,
            collisionFilter: {
                category: this.categories.projectile,
                mask: this.categories.terrain | this.categories.tank
            },
            label: 'projectile',
            projectileType: type
        });
        
        // Set initial velocity
        Matter.Body.setVelocity(projectileBody, {
            x: velocityX * 0.01,
            y: velocityY * 0.01
        });
        
        const id = Date.now() + Math.random();
        this.projectiles.set(id, projectileBody);
        Matter.World.add(this.world, projectileBody);
        
        return { id, body: projectileBody };
    }
    
    // Update projectile with wind
    updateProjectile(projectileId, deltaTime) {
        const body = this.projectiles.get(projectileId);
        if (!body) return null;
        
        // Apply wind force
        if (this.wind !== 0) {
            Matter.Body.applyForce(body, body.position, {
                x: this.wind * 0.00001,
                y: 0
            });
        }
        
        // Handle screen boundaries
        const result = this.handleBoundaries(body);
        if (result.destroyed) {
            this.removeProjectile(projectileId);
            return null;
        }
        
        return {
            x: body.position.x,
            y: body.position.y,
            vx: body.velocity.x * 100,
            vy: body.velocity.y * 100
        };
    }
    
    // Handle screen boundary behaviors
    handleBoundaries(body) {
        const pos = body.position;
        const vel = body.velocity;
        let destroyed = false;
        
        // Handle walls
        if (pos.x < 0 || pos.x > this.world.bounds.max.x) {
            switch(this.wallBehavior) {
                case 'bounce':
                    Matter.Body.setVelocity(body, { x: -vel.x, y: vel.y });
                    Matter.Body.setPosition(body, {
                        x: pos.x < 0 ? 0 : this.world.bounds.max.x,
                        y: pos.y
                    });
                    break;
                case 'wrap':
                    Matter.Body.setPosition(body, {
                        x: pos.x < 0 ? this.world.bounds.max.x : 0,
                        y: pos.y
                    });
                    break;
                case 'absorb':
                    destroyed = true;
                    break;
            }
        }
        
        // Handle ceiling
        if (pos.y < 0) {
            switch(this.ceilingBehavior) {
                case 'bounce':
                    Matter.Body.setVelocity(body, { x: vel.x, y: -vel.y });
                    Matter.Body.setPosition(body, { x: pos.x, y: 0 });
                    break;
                case 'wrap':
                    Matter.Body.setPosition(body, { x: pos.x, y: 0 });
                    break;
                case 'absorb':
                    destroyed = true;
                    break;
            }
        }
        
        return { destroyed };
    }
    
    // Remove projectile
    removeProjectile(id) {
        const body = this.projectiles.get(id);
        if (body) {
            Matter.World.remove(this.world, body);
            this.projectiles.delete(id);
        }
    }
    
    // Create particle system for explosions
    createParticles(x, y, count, type = 'explosion') {
        const particles = [];
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = Math.random() * 5 + 2;
            
            const particle = Matter.Bodies.circle(x, y, 2, {
                friction: 0.1,
                restitution: 0.5,
                density: 0.0001,
                collisionFilter: {
                    category: this.categories.particle,
                    mask: this.categories.terrain
                },
                label: 'particle'
            });
            
            Matter.Body.setVelocity(particle, {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            });
            
            const id = Date.now() + Math.random() + i;
            this.particles.set(id, { body: particle, life: 1.0, type });
            Matter.World.add(this.world, particle);
            
            particles.push(id);
        }
        
        return particles;
    }
    
    // Update particles
    updateParticles(deltaTime) {
        const toRemove = [];
        
        this.particles.forEach((particle, id) => {
            particle.life -= deltaTime * 0.002;
            
            if (particle.life <= 0) {
                toRemove.push(id);
            }
        });
        
        // Remove dead particles
        toRemove.forEach(id => {
            const particle = this.particles.get(id);
            if (particle) {
                Matter.World.remove(this.world, particle.body);
                this.particles.delete(id);
            }
        });
    }
    
    // Update physics engine
    update(deltaTime) {
        Matter.Engine.update(this.engine, deltaTime);
        this.updateParticles(deltaTime);
    }
    
    // Calculate optimal shot (for AI)
    calculateOptimalShot(fromX, fromY, targetX, targetY, weapon = 'missile') {
        // This remains largely the same as the original implementation
        // but could be enhanced with Matter.js trajectory prediction
        const dx = targetX - fromX;
        const dy = targetY - fromY;
        
        // Try different power levels
        for (let power = 30; power <= 100; power += 5) {
            // Try different angles
            for (let angle = 0; angle <= 180; angle += 1) {
                const angleRad = angle * Math.PI / 180;
                const vx = Math.cos(angleRad) * power;
                const vy = -Math.sin(angleRad) * power;
                
                // Simulate trajectory
                let x = fromX;
                let y = fromY;
                let pvx = vx;
                let pvy = vy;
                
                for (let t = 0; t < 500; t++) {
                    pvx += this.wind * 0.1;
                    pvy += this.engine.gravity.y * 1000;
                    x += pvx * 0.016;
                    y += pvy * 0.016;
                    
                    // Check if we hit near target
                    if (Math.abs(x - targetX) < 20 && Math.abs(y - targetY) < 20) {
                        return { angle, power, confidence: 0.9 };
                    }
                    
                    // Stop if we go off screen or underground
                    if (x < 0 || x > 800 || y > 600) break;
                }
            }
        }
        
        // Fallback to simple calculation
        const angle = Math.atan2(-dy, dx) * 180 / Math.PI;
        const power = Math.min(100, Math.sqrt(dx * dx + dy * dy) * 0.2);
        
        return { 
            angle: angle < 0 ? 180 + angle : angle, 
            power: power,
            confidence: 0.5
        };
    }
    
    // Get collision events
    getCollisionEvents() {
        return Matter.Events.on(this.engine, 'collisionStart', (event) => {
            // Handle collision events
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                
                // Projectile hit terrain
                if ((bodyA.label === 'projectile' && bodyB.label === 'terrain') ||
                    (bodyA.label === 'terrain' && bodyB.label === 'projectile')) {
                    const projectile = bodyA.label === 'projectile' ? bodyA : bodyB;
                    // Trigger explosion at collision point
                    const contact = pair.contacts[0];
                    if (contact) {
                        this.onProjectileHitTerrain?.(projectile, contact.vertex);
                    }
                }
                
                // Projectile hit tank
                if ((bodyA.label === 'projectile' && bodyB.label === 'tank') ||
                    (bodyA.label === 'tank' && bodyB.label === 'projectile')) {
                    const projectile = bodyA.label === 'projectile' ? bodyA : bodyB;
                    const tank = bodyA.label === 'tank' ? bodyA : bodyB;
                    this.onProjectileHitTank?.(projectile, tank);
                }
            });
        });
    }
    
    // Clean up
    destroy() {
        Matter.World.clear(this.world);
        Matter.Engine.clear(this.engine);
    }
}

// Export as global
if (typeof window !== 'undefined') {
    window.EnhancedPhysics = EnhancedPhysics;
}