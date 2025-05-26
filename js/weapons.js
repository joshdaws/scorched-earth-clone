// Weapon System
class WeaponSystem {
    static createProjectile(weaponKey, x, y, angle, power, owner, tracer = false) {
        const weapon = CONSTANTS.WEAPONS[weaponKey];
        if (!weapon) return null;
        
        const projectile = {
            x: x,
            y: y,
            startX: x,
            startY: y,
            angle: angle,
            power: power,
            weapon: weapon,
            weaponKey: weaponKey,
            owner: owner,
            tracer: tracer,
            trail: [],
            active: true,
            subMunitions: []
        };
        
        // Initialize velocity based on weapon type
        const angleRad = angle * Math.PI / 180;
        const initialVelocity = power * 8; // Same scaling as in physics - increased for better range
        projectile.vx = initialVelocity * Math.cos(angleRad);
        projectile.vy = -initialVelocity * Math.sin(angleRad);
        
        // Special initialization for different weapon types
        switch(weapon.projectileType) {
            case 'beam':
                projectile.beamLength = 0;
                projectile.maxBeamLength = 500;
                projectile.beamPoints = [];
                break;
            case 'cluster':
                projectile.exploded = false;
                break;
        }
        
        return projectile;
    }
    
    static updateProjectile(projectile, deltaTime, physics, terrain, tanks, effectsSystem, soundSystem) {
        if (!projectile.active) return;
        
        const weapon = projectile.weapon;
        
        // Always add to trail for visual effect (limit trail length)
        if (projectile.trail.length < 100) {
            projectile.trail.push({ x: projectile.x, y: projectile.y });
        } else {
            // Keep trail at constant length by removing old points
            projectile.trail.shift();
            projectile.trail.push({ x: projectile.x, y: projectile.y });
        }
        
        switch(weapon.projectileType) {
            case 'ballistic':
            case 'dirt':
            case 'fire':
                this.updateBallisticProjectile(projectile, deltaTime, physics, terrain, tanks, effectsSystem, soundSystem);
                break;
            case 'beam':
                this.updateBeamProjectile(projectile, deltaTime, terrain, tanks, effectsSystem, soundSystem);
                break;
            case 'cluster':
                this.updateClusterProjectile(projectile, deltaTime, physics, terrain, tanks, effectsSystem, soundSystem);
                break;
        }
        
        // Update sub-munitions
        for (let sub of projectile.subMunitions) {
            this.updateProjectile(sub, deltaTime, physics, terrain, tanks, effectsSystem, soundSystem);
        }
        projectile.subMunitions = projectile.subMunitions.filter(sub => sub.active);
    }
    
    static updateBallisticProjectile(projectile, deltaTime, physics, terrain, tanks, effectsSystem, soundSystem) {
        // Convert deltaTime to seconds
        const dt = deltaTime / 1000;
        
        // Apply gravity to vertical velocity
        projectile.vy += physics.gravity * dt * 120; // Increased gravity scaling to match higher velocities
        
        // Apply wind to horizontal velocity (gradual effect)
        projectile.vx += physics.wind * dt * 2;
        
        // Update position based on velocity
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
        
        // Check boundaries
        const boundary = physics.handleBoundaryCollision(
            projectile.x, projectile.y, 
            projectile.vx, projectile.vy,
            CONSTANTS.CANVAS_WIDTH, CONSTANTS.CANVAS_HEIGHT
        );
        
        if (boundary.absorbed) {
            projectile.active = false;
            return;
        }
        
        projectile.x = boundary.x;
        projectile.y = boundary.y;
        projectile.vx = boundary.vx;
        projectile.vy = boundary.vy;
        
        // Check terrain collision
        if (terrain.checkCollision(projectile.x, projectile.y)) {
            this.explodeProjectile(projectile, terrain, tanks, null, effectsSystem, soundSystem);
            return;
        }
        
        // Check tank collision
        const hitTank = physics.checkTankCollision(projectile.x, projectile.y, tanks);
        if (hitTank) {
            this.explodeProjectile(projectile, terrain, tanks, hitTank, effectsSystem, soundSystem);
            return;
        }
        
        // Check if projectile is too far off screen
        if (projectile.y > CONSTANTS.CANVAS_HEIGHT + 100) {
            projectile.active = false;
        }
    }
    
    static updateBeamProjectile(projectile, deltaTime, terrain, tanks, effectsSystem, soundSystem) {
        // Laser beam extends instantly in the direction fired
        if (projectile.beamLength < projectile.maxBeamLength) {
            const step = 10;
            const angleRad = projectile.angle * Math.PI / 180;
            
            for (let i = 0; i < step; i++) {
                projectile.beamLength += 5;
                
                const x = projectile.x + Math.cos(angleRad) * projectile.beamLength;
                const y = projectile.y - Math.sin(angleRad) * projectile.beamLength;
                
                projectile.beamPoints.push({ x, y });
                
                // Check collision along the beam
                if (terrain.checkCollision(x, y)) {
                    // Create small explosion at each point
                    terrain.deformTerrain(x, y, projectile.weapon.radius, 'explosion');
                    
                    // Check for tank damage along the beam
                    for (let tank of tanks) {
                        if (tank.state === CONSTANTS.TANK_STATES.DESTROYED) continue;
                        
                        const dist = Math.sqrt((tank.x - x) ** 2 + (tank.y - y) ** 2);
                        if (dist < CONSTANTS.TANK_WIDTH) {
                            this.damageTarget(tank, projectile, false, null, effectsSystem);
                        }
                    }
                    
                    projectile.active = false;
                    return;
                }
                
                // Check tank collision
                const hitTank = physics.checkTankCollision(x, y, tanks);
                if (hitTank) {
                    this.damageTarget(hitTank, projectile, true, null, effectsSystem);
                    projectile.active = false;
                    return;
                }
            }
        } else {
            projectile.active = false;
        }
    }
    
    static updateClusterProjectile(projectile, deltaTime, physics, terrain, tanks, effectsSystem, soundSystem) {
        // Update like a normal ballistic projectile first
        this.updateBallisticProjectile(projectile, deltaTime, physics, terrain, tanks, effectsSystem, soundSystem);
        
        // Check if it should split
        if (!projectile.exploded && projectile.vy > 0 && projectile.y > projectile.startY) {
            // Split into sub-munitions
            projectile.exploded = true;
            
            const numSubs = projectile.weapon.subMunitions || 8;
            for (let i = 0; i < numSubs; i++) {
                const angle = (360 / numSubs) * i + Math.random() * 30 - 15;
                const power = 20 + Math.random() * 20;
                
                const sub = this.createProjectile(
                    'MISSILE', // Sub-munitions use basic missile stats
                    projectile.x, projectile.y,
                    angle, power,
                    projectile.owner,
                    false
                );
                
                if (sub) {
                    sub.weapon = {
                        ...CONSTANTS.WEAPONS.MISSILE,
                        damage: projectile.weapon.damage / 2,
                        radius: projectile.weapon.radius / 2
                    };
                    projectile.subMunitions.push(sub);
                }
            }
            
            projectile.active = false;
        }
    }
    
    static explodeProjectile(projectile, terrain, tanks, directHitTank = null, effectsSystem = null, soundSystem = null) {
        projectile.active = false;
        
        const weapon = projectile.weapon;
        const x = projectile.x;
        const y = projectile.y;
        
        // Create explosion visual effects
        if (effectsSystem) {
            effectsSystem.createExplosion(x, y, weapon.radius, weapon.projectileType);
            
            // Add screen shake for big explosions
            if (weapon.radius > 50) {
                // This will be handled by the game canvas
            }
        }
        
        // Play explosion sound based on weapon type and size
        if (soundSystem) {
            switch(weapon.projectileType) {
                case 'dirt':
                    soundSystem.play('dirtThud');
                    break;
                case 'fire':
                    soundSystem.play('mediumExplosion');
                    setTimeout(() => soundSystem.play('fire'), 100);
                    break;
                default:
                    // Scale explosion sound to weapon power
                    if (weapon.radius >= 100) {
                        soundSystem.play('nukeExplosion');
                    } else if (weapon.radius >= 50) {
                        soundSystem.play('largeExplosion');
                    } else if (weapon.radius >= 30) {
                        soundSystem.play('mediumExplosion');
                    } else {
                        soundSystem.play('smallExplosion');
                    }
                    break;
            }
        }
        
        // Handle different explosion types
        switch(weapon.projectileType) {
            case 'dirt':
                // Add dirt instead of creating crater
                terrain.deformTerrain(x, y, weapon.radius, 'dirt');
                if (effectsSystem) {
                    effectsSystem.createDirtSpray(x, y, -Math.PI/2);
                }
                break;
                
            case 'fire':
                // Create burning area
                terrain.deformTerrain(x, y, weapon.radius, 'explosion');
                if (effectsSystem) {
                    effectsSystem.createFireEffect(x, y, weapon.radius);
                }
                break;
                
            default:
                // Standard explosion
                terrain.deformTerrain(x, y, weapon.radius, 'explosion');
                break;
        }
        
        // Apply damage to tanks
        for (let tank of tanks) {
            if (tank.state === CONSTANTS.TANK_STATES.DESTROYED) continue;
            
            // Calculate distance from explosion center to tank center
            // tank.y is the bottom of the tank, so tank center is at y - TANK_HEIGHT/2
            const tankCenterY = tank.y - CONSTANTS.TANK_HEIGHT / 2;
            const dist = Math.sqrt((tank.x - x) ** 2 + (tankCenterY - y) ** 2);
            
            if (tank === directHitTank) {
                // Direct hit
                this.damageTarget(tank, projectile, true, null, effectsSystem, soundSystem);
            } else if (dist < weapon.radius) {
                // Splash damage
                const damageFactor = 1 - (dist / weapon.radius);
                const damage = Math.max(1, Math.floor(weapon.damage * damageFactor * 0.75)); // Increased multiplier and minimum 1 damage
                this.damageTarget(tank, projectile, false, damage, effectsSystem, soundSystem);
            }
        }
        
        // Award money for damage/kills
        if (projectile.owner) {
            // This will be handled by the game logic
        }
    }
    
    static damageTarget(tank, projectile, directHit = false, overrideDamage = null, effectsSystem = null, soundSystem = null) {
        if (tank === projectile.owner && !directHit) {
            // Full self-damage from splash to ensure self-kills work properly
            overrideDamage = overrideDamage || projectile.weapon.damage;
        }
        
        const damage = overrideDamage || projectile.weapon.damage;
        
        // Check for shield deflection
        if (tank.shield && tank.shield.deflects && Math.random() < 0.3) {
            tank.showMessage("Deflected!");
            // TODO: Create deflected projectile
            return;
        }
        
        // Apply damage
        const healthBefore = tank.health;
        tank.takeDamage(damage);
        const actualDamage = healthBefore - tank.health;
        
        // Track stats
        if (projectile.owner) {
            if (projectile.owner !== tank) {
                // Damage to other tanks
                projectile.owner.damageDealt += actualDamage;
                
                if (tank.state === CONSTANTS.TANK_STATES.DESTROYED) {
                    projectile.owner.kills++;
                    projectile.owner.money += CONSTANTS.KILL_REWARD;
                    projectile.owner.showMessage(`Kill! +$${CONSTANTS.KILL_REWARD}`);
                } else {
                    projectile.owner.money += Math.floor(actualDamage * CONSTANTS.DAMAGE_REWARD);
                }
            } else if (tank.state === CONSTANTS.TANK_STATES.DESTROYED) {
                // Self-kill - ensure tank is destroyed, not buried
                tank.showMessage("Self-destruct!");
            }
            
            // Play sounds and effects for all tank destructions
            if (tank.state === CONSTANTS.TANK_STATES.DESTROYED) {
                if (effectsSystem) {
                    effectsSystem.createTankExplosion(tank.x, tank.y);
                }
                if (soundSystem) {
                    soundSystem.play('tankDestroyed');
                }
            } else if (soundSystem && actualDamage > 0) {
                soundSystem.play('tankHit');
            }
        }
    }
    
    static drawProjectile(ctx, projectile) {
        if (!projectile.active) return;
        
        const weapon = projectile.weapon;
        
        // Always draw colorful trails for all projectiles
        if (projectile.trail.length > 1) {
            // Create gradient trail effect
            for (let i = 1; i < projectile.trail.length; i++) {
                const alpha = i / projectile.trail.length;
                const prevPoint = projectile.trail[i - 1];
                const point = projectile.trail[i];
                
                // Use weapon color or create rainbow effect
                if (weapon.projectileType === 'fire') {
                    // Fire trail - bright pink to orange gradient
                    const fireHue = 330 + (i % 60);
                    ctx.strokeStyle = `hsla(${fireHue}, 100%, 60%, ${alpha})`;
                } else if (weapon.projectileType === 'cluster') {
                    // Funky bomb - rainbow neon
                    ctx.strokeStyle = `hsla(${(i * 15) % 360}, 100%, 70%, ${alpha})`;
                } else {
                    // Regular trail - neon glow effect
                    const trailColors = ['#ff00ff', '#00ffff', '#ffff00', '#ff0066', '#66ff00'];
                    const colorIndex = Math.floor(i / 5) % trailColors.length;
                    ctx.strokeStyle = trailColors[colorIndex];
                    ctx.globalAlpha = alpha;
                }
                
                ctx.lineWidth = 2 + alpha * 2;
                ctx.beginPath();
                ctx.moveTo(prevPoint.x, prevPoint.y);
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
            }
        }
        
        // Draw projectile based on type
        switch(weapon.projectileType) {
            case 'ballistic':
            case 'dirt':
            case 'fire':
            case 'cluster':
                // Draw as a glowing circle
                ctx.shadowBlur = 10;
                ctx.shadowColor = weapon.color;
                ctx.fillStyle = weapon.color;
                ctx.beginPath();
                ctx.arc(projectile.x, projectile.y, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Inner bright core
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(projectile.x, projectile.y, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                break;
                
            case 'beam':
                // Draw laser beam
                ctx.strokeStyle = weapon.color;
                ctx.lineWidth = 3;
                ctx.shadowBlur = 10;
                ctx.shadowColor = weapon.color;
                
                if (projectile.beamPoints.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(projectile.x, projectile.y);
                    for (let point of projectile.beamPoints) {
                        ctx.lineTo(point.x, point.y);
                    }
                    ctx.stroke();
                }
                
                ctx.shadowBlur = 0;
                break;
        }
        
        // Draw sub-munitions
        for (let sub of projectile.subMunitions) {
            this.drawProjectile(ctx, sub);
        }
    }
}