// AI System
class AIController {
    constructor(tank, aiType) {
        this.tank = tank;
        this.aiType = aiType;
        this.config = CONSTANTS.AI_TYPES[aiType];
        this.targetTank = null;
        this.lastShotAngle = null;
        this.lastShotPower = null;
        this.lastShotResult = null;
    }
    
    takeTurn(allTanks, physics, terrain) {
        if (this.tank.state === CONSTANTS.TANK_STATES.DESTROYED) return null;
        
        // Select target
        this.selectTarget(allTanks, physics, terrain);
        
        if (!this.targetTank) return null;
        
        // Calculate shot
        const shot = this.calculateShot(physics, terrain);
        
        if (shot) {
            // Apply accuracy modifier based on AI type
            const accuracyError = (1 - this.config.accuracy) * 10;
            shot.angle += (Math.random() - 0.5) * accuracyError;
            shot.power += (Math.random() - 0.5) * accuracyError;
            
            // Clamp values
            shot.angle = Math.max(0, Math.min(180, shot.angle));
            shot.power = Math.max(0, Math.min(this.tank.maxPower, shot.power));
            
            // Store for learning
            this.lastShotAngle = shot.angle;
            this.lastShotPower = shot.power;
            
            // Select weapon
            this.selectWeapon();
            
            // Apply shot parameters
            this.tank.angle = shot.angle;
            this.tank.power = shot.power;
            
            return {
                action: 'fire',
                angle: shot.angle,
                power: shot.power,
                weapon: this.tank.selectedWeapon
            };
        }
        
        return null;
    }
    
    selectTarget(allTanks, physics, terrain) {
        const enemies = allTanks.filter(t => 
            t !== this.tank && 
            t.state !== CONSTANTS.TANK_STATES.DESTROYED
        );
        
        if (enemies.length === 0) {
            this.targetTank = null;
            return;
        }
        
        // Sort by priority
        enemies.sort((a, b) => {
            // Prefer human players (Cyborgs prefer humans)
            if (!a.isAI && b.isAI) return -1;
            if (a.isAI && !b.isAI) return 1;
            
            // Prefer damaged enemies
            const aHealthRatio = a.health / a.maxHealth;
            const bHealthRatio = b.health / b.maxHealth;
            if (aHealthRatio < bHealthRatio) return -1;
            if (aHealthRatio > bHealthRatio) return 1;
            
            // Prefer closer enemies
            const aDist = Math.abs(a.x - this.tank.x);
            const bDist = Math.abs(b.x - this.tank.x);
            return aDist - bDist;
        });
        
        // Higher skill AIs might check line of sight
        if (this.config.accuracy > 0.8) {
            for (let enemy of enemies) {
                if (physics.hasLineOfSight(this.tank.x, this.tank.y - 10, 
                                         enemy.x, enemy.y - 10, terrain)) {
                    this.targetTank = enemy;
                    return;
                }
            }
        }
        
        // Otherwise pick the highest priority target
        this.targetTank = enemies[0];
    }
    
    calculateShot(physics, terrain) {
        if (!this.targetTank) return null;
        
        // Use different strategies based on AI skill
        if (this.config.accuracy > 0.9) {
            // Advanced AI - use physics calculation
            return this.calculateAdvancedShot(physics, terrain);
        } else if (this.config.accuracy > 0.7) {
            // Medium AI - use simplified calculation with some error
            return this.calculateMediumShot(physics, terrain);
        } else {
            // Basic AI - use very simple estimation
            return this.calculateBasicShot(physics, terrain);
        }
    }
    
    calculateAdvancedShot(physics, terrain) {
        const fromX = this.tank.x;
        const fromY = this.tank.y - 10;
        const toX = this.targetTank.x;
        const toY = this.targetTank.y - 10;
        
        // If we have a previous shot, try to adjust based on result
        if (this.lastShotAngle !== null && this.lastShotResult) {
            return this.adjustFromLastShot(fromX, fromY, toX, toY);
        }
        
        // Otherwise calculate optimal shot
        return physics.calculateOptimalShot(fromX, fromY, toX, toY);
    }
    
    calculateMediumShot(physics, terrain) {
        const dx = this.targetTank.x - this.tank.x;
        const dy = this.targetTank.y - this.tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Simple trajectory estimation
        let angle = Math.atan2(-dy - distance * 0.5, dx) * 180 / Math.PI;
        if (angle < 0) angle += 180;
        
        // Estimate power based on distance
        let power = Math.min(distance / 5, this.tank.maxPower);
        
        // Add wind compensation (partial)
        const windCompensation = physics.wind * 0.5;
        angle -= windCompensation * (distance / 500);
        
        return { angle, power };
    }
    
    calculateBasicShot(physics, terrain) {
        const dx = this.targetTank.x - this.tank.x;
        const dy = this.targetTank.y - this.tank.y;
        
        // Very basic angle calculation
        let angle = 45; // Default angle
        if (dx > 0) {
            angle = 45;
        } else {
            angle = 135;
        }
        
        // Random power
        const power = 40 + Math.random() * 40;
        
        return { angle, power };
    }
    
    adjustFromLastShot(fromX, fromY, toX, toY) {
        // Adjust based on where the last shot landed
        const missDistance = this.lastShotResult.missDistance || 100;
        const missDx = this.lastShotResult.missDx || 0;
        const missDy = this.lastShotResult.missDy || 0;
        
        let angleAdjust = 0;
        let powerAdjust = 0;
        
        if (Math.abs(missDx) > 10) {
            // Missed horizontally
            angleAdjust = missDx > 0 ? -2 : 2;
        }
        
        if (Math.abs(missDy) > 10) {
            // Missed vertically
            powerAdjust = missDy > 0 ? 5 : -5;
        }
        
        return {
            angle: this.lastShotAngle + angleAdjust,
            power: this.lastShotPower + powerAdjust
        };
    }
    
    selectWeapon() {
        const preference = this.config.weaponPreference;
        const availableWeapons = Object.keys(this.tank.inventory.weapons)
            .filter(w => this.tank.inventory.weapons[w] !== 0);
        
        if (availableWeapons.length === 1) {
            this.tank.selectedWeapon = availableWeapons[0];
            return;
        }
        
        // Select based on preference and situation
        switch(preference) {
            case 'basic':
                // Prefer simple weapons
                this.tank.selectedWeapon = 'MISSILE';
                break;
                
            case 'balanced':
                // Use stronger weapons for closer/damaged targets
                const distance = Math.abs(this.targetTank.x - this.tank.x);
                if (distance < 200 && availableWeapons.includes('BABY_NUKE')) {
                    this.tank.selectedWeapon = 'BABY_NUKE';
                } else if (this.targetTank.health < 50 && availableWeapons.includes('NUKE')) {
                    this.tank.selectedWeapon = 'NUKE';
                } else {
                    this.tank.selectedWeapon = 'MISSILE';
                }
                break;
                
            case 'advanced':
                // Use best available weapon strategically
                if (this.targetTank.shield && availableWeapons.includes('LASER')) {
                    this.tank.selectedWeapon = 'LASER';
                } else if (availableWeapons.includes('FUNKY_BOMB') && 
                          Math.abs(this.targetTank.x - this.tank.x) > 300) {
                    this.tank.selectedWeapon = 'FUNKY_BOMB';
                } else if (availableWeapons.includes('NUKE')) {
                    this.tank.selectedWeapon = 'NUKE';
                } else {
                    // Find most powerful available
                    let bestWeapon = 'MISSILE';
                    let bestDamage = 0;
                    
                    for (let w of availableWeapons) {
                        const weapon = CONSTANTS.WEAPONS[w];
                        if (weapon && weapon.damage > bestDamage) {
                            bestDamage = weapon.damage;
                            bestWeapon = w;
                        }
                    }
                    
                    this.tank.selectedWeapon = bestWeapon;
                }
                break;
        }
    }
    
    handleShopPhase(currentMoney) {
        if (!this.config.economySkill || Math.random() > this.config.economySkill) {
            return []; // No purchases
        }
        
        const purchases = [];
        let money = currentMoney;
        
        // Priority list based on AI type
        const priorities = this.getShoppingPriorities();
        
        for (let priority of priorities) {
            if (money < priority.cost) continue;
            
            // Random chance to skip based on economy skill
            if (Math.random() > this.config.economySkill) continue;
            
            purchases.push({
                type: priority.type,
                item: priority.item,
                quantity: priority.quantity || 1
            });
            
            money -= priority.cost * (priority.quantity || 1);
        }
        
        return purchases;
    }
    
    getShoppingPriorities() {
        const priorities = [];
        
        switch(this.config.weaponPreference) {
            case 'basic':
                priorities.push(
                    { type: 'weapon', item: 'BABY_NUKE', cost: 500, quantity: 2 },
                    { type: 'item', item: 'SHIELD', cost: 500 },
                    { type: 'item', item: 'PARACHUTE', cost: 200 }
                );
                break;
                
            case 'balanced':
                priorities.push(
                    { type: 'weapon', item: 'NUKE', cost: 1000 },
                    { type: 'weapon', item: 'NAPALM', cost: 800 },
                    { type: 'item', item: 'DEFLECTOR_SHIELD', cost: 1000 },
                    { type: 'weapon', item: 'BABY_NUKE', cost: 500, quantity: 3 },
                    { type: 'item', item: 'PARACHUTE', cost: 200, quantity: 2 }
                );
                break;
                
            case 'advanced':
                priorities.push(
                    { type: 'item', item: 'SUPER_MAG', cost: 2500 },
                    { type: 'weapon', item: 'LASER', cost: 2000 },
                    { type: 'weapon', item: 'FUNKY_BOMB', cost: 1500 },
                    { type: 'weapon', item: 'NUKE', cost: 1000, quantity: 2 },
                    { type: 'item', item: 'BATTERY', cost: 400 },
                    { type: 'item', item: 'TRACER', cost: 100, quantity: 3 }
                );
                break;
        }
        
        return priorities;
    }
    
    recordShotResult(impactX, impactY, hit) {
        if (this.targetTank) {
            this.lastShotResult = {
                hit: hit,
                missDx: impactX - this.targetTank.x,
                missDy: impactY - this.targetTank.y,
                missDistance: Math.sqrt(
                    Math.pow(impactX - this.targetTank.x, 2) + 
                    Math.pow(impactY - this.targetTank.y, 2)
                )
            };
        }
    }
}