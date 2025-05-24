// Tank Class
class Tank {
    constructor(x, y, color, playerName, isAI = false, aiType = null) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.playerName = playerName;
        this.isAI = isAI;
        this.aiType = aiType;
        
        // Tank properties
        this.angle = 90; // Straight up
        this.power = 50;
        this.maxPower = 100;
        this.health = 100;
        this.maxHealth = 100;
        
        // State
        this.state = CONSTANTS.TANK_STATES.NORMAL;
        this.shield = null;
        this.hasParachute = false;
        this.fallHeight = 0;
        this.velocity = { x: 0, y: 0 };
        
        // Inventory and economy
        this.money = 0;
        this.inventory = {
            weapons: {
                'MISSILE': -1 // Unlimited missiles
            },
            items: {}
        };
        this.selectedWeapon = 'MISSILE';
        this.tracerActive = false;
        
        // Stats
        this.kills = 0;
        this.damageDealt = 0;
        this.roundsSurvived = 0;
        
        // Visual
        this.turretLength = 15;
        this.lastMessage = null;
        this.messageTimer = 0;
    }
    
    update(deltaTime, terrain, physics) {
        // Update message timer
        if (this.messageTimer > 0) {
            this.messageTimer -= deltaTime;
            if (this.messageTimer <= 0) {
                this.lastMessage = null;
            }
        }
        
        // Handle falling
        if (this.state === CONSTANTS.TANK_STATES.FALLING) {
            this.velocity.y += physics.gravity * deltaTime;
            this.y += this.velocity.y * deltaTime;
            this.fallHeight += Math.abs(this.velocity.y * deltaTime);
            
            // Check if landed
            const groundY = terrain.getHeightAt(this.x);
            if (this.y >= groundY - CONSTANTS.TANK_HEIGHT) {
                this.y = groundY - CONSTANTS.TANK_HEIGHT;
                this.land(physics);
            }
        } else {
            // Check if ground exists beneath tank
            const groundY = terrain.getHeightAt(this.x);
            if (this.y < groundY - CONSTANTS.TANK_HEIGHT - 5) {
                // Start falling
                this.state = CONSTANTS.TANK_STATES.FALLING;
                this.fallHeight = 0;
                this.velocity.y = 0;
                
                if (this.hasParachute) {
                    this.showMessage("Deploying parachute!");
                } else if (window.game && window.game.soundSystem) {
                    // Play falling sound
                    window.game.soundSystem.play('tankFalling');
                }
            } else {
                // Ensure tank stays on ground
                this.y = groundY - CONSTANTS.TANK_HEIGHT;
            }
        }
        
        // Check if buried
        this.checkIfBuried(terrain);
    }
    
    checkIfBuried(terrain) {
        if (this.state === CONSTANTS.TANK_STATES.DESTROYED) return;
        
        // Check multiple points around the tank
        let buriedPoints = 0;
        const checkPoints = 5;
        
        for (let i = 0; i < checkPoints; i++) {
            const checkX = this.x + (i - 2) * 5;
            const checkY = this.y;
            
            if (terrain.checkCollision(checkX, checkY)) {
                buriedPoints++;
            }
        }
        
        if (buriedPoints >= 3 && this.state !== CONSTANTS.TANK_STATES.BURIED) {
            this.state = CONSTANTS.TANK_STATES.BURIED;
            this.showMessage("I'm buried!");
        } else if (buriedPoints < 3 && this.state === CONSTANTS.TANK_STATES.BURIED) {
            this.state = CONSTANTS.TANK_STATES.NORMAL;
            this.showMessage("Free at last!");
        }
    }
    
    land(physics) {
        if (this.hasParachute) {
            // Parachute prevents all fall damage
            this.state = CONSTANTS.TANK_STATES.NORMAL;
            this.hasParachute = false; // Parachute is consumed
            this.showMessage("Safe landing!");
        } else {
            // Calculate fall damage
            const damage = physics.calculateFallDamage(this.velocity.y, this.fallHeight);
            
            if (damage > 0) {
                this.takeDamage(damage);
                this.showMessage(`Ouch! -${damage} HP`);
            }
            
            if (this.state !== CONSTANTS.TANK_STATES.DESTROYED) {
                this.state = CONSTANTS.TANK_STATES.NORMAL;
            }
        }
        
        this.velocity = { x: 0, y: 0 };
        this.fallHeight = 0;
    }
    
    takeDamage(amount) {
        if (this.state === CONSTANTS.TANK_STATES.DESTROYED) return;
        
        // Check shield first
        if (this.shield) {
            const shieldDamage = Math.min(amount, this.shield.health);
            this.shield.health -= shieldDamage;
            amount -= shieldDamage;
            
            if (this.shield.health <= 0) {
                this.shield = null;
                this.showMessage("Shield destroyed!");
            }
        }
        
        // Apply remaining damage to tank
        if (amount > 0) {
            this.health -= amount;
            
            // Reduce max power based on damage
            const healthPercent = this.health / this.maxHealth;
            this.maxPower = Math.floor(100 * healthPercent);
            this.power = Math.min(this.power, this.maxPower);
            
            if (this.health <= 0) {
                this.destroy();
            } else {
                this.state = CONSTANTS.TANK_STATES.DAMAGED;
            }
        }
    }
    
    destroy() {
        this.state = CONSTANTS.TANK_STATES.DESTROYED;
        this.health = 0;
        
        if (this.isAI && this.aiType) {
            const taunts = CONSTANTS.AI_TYPES[this.aiType].taunts.dying;
            const taunt = taunts[Math.floor(Math.random() * taunts.length)];
            this.showMessage(taunt);
        }
    }
    
    fire() {
        if (this.state === CONSTANTS.TANK_STATES.DESTROYED) return null;
        
        if (this.state === CONSTANTS.TANK_STATES.BURIED) {
            // Firing while buried can cause self-damage
            const selfDamage = Math.floor(Math.random() * 50) + 25;
            this.takeDamage(selfDamage);
            this.showMessage(`Self damage! -${selfDamage} HP`);
            return null;
        }
        
        // Check if we have the weapon
        const weaponKey = this.selectedWeapon;
        if (!this.inventory.weapons[weaponKey] || this.inventory.weapons[weaponKey] === 0) {
            return null;
        }
        
        // Consume ammo (except for unlimited weapons)
        if (this.inventory.weapons[weaponKey] > 0) {
            this.inventory.weapons[weaponKey]--;
        }
        
        // Show AI taunt
        if (this.isAI && this.aiType && Math.random() < 0.7) {
            const taunts = CONSTANTS.AI_TYPES[this.aiType].taunts.firing;
            const taunt = taunts[Math.floor(Math.random() * taunts.length)];
            this.showMessage(taunt);
        }
        
        // Calculate firing position (end of turret)
        const angleRad = this.angle * Math.PI / 180;
        const turretStartY = this.y - CONSTANTS.TANK_HEIGHT;
        const fireX = this.x + Math.cos(angleRad) * this.turretLength;
        const fireY = turretStartY - Math.sin(angleRad) * this.turretLength;
        
        return {
            x: fireX,
            y: fireY,
            angle: this.angle,
            power: this.power,
            weapon: weaponKey,
            owner: this,
            tracer: this.tracerActive
        };
    }
    
    adjustAngle(delta) {
        this.angle = Math.max(0, Math.min(180, this.angle + delta));
    }
    
    adjustPower(delta) {
        this.power = Math.max(0, Math.min(this.maxPower, this.power + delta));
    }
    
    selectWeapon(weaponKey) {
        if (this.inventory.weapons[weaponKey]) {
            this.selectedWeapon = weaponKey;
        }
    }
    
    addWeapon(weaponKey, quantity) {
        if (!this.inventory.weapons[weaponKey]) {
            this.inventory.weapons[weaponKey] = 0;
        }
        if (this.inventory.weapons[weaponKey] !== -1) { // Not unlimited
            this.inventory.weapons[weaponKey] += quantity;
        }
    }
    
    addItem(itemKey, quantity = 1) {
        if (!this.inventory.items[itemKey]) {
            this.inventory.items[itemKey] = 0;
        }
        this.inventory.items[itemKey] += quantity;
    }
    
    useItem(itemKey) {
        if (!this.inventory.items[itemKey] || this.inventory.items[itemKey] <= 0) {
            return false;
        }
        
        const item = CONSTANTS.ITEMS[itemKey];
        
        switch(item.type) {
            case 'shield':
                this.shield = {
                    type: itemKey,
                    health: item.health,
                    deflects: item.deflects || false,
                    repels: item.repels || false
                };
                this.inventory.items[itemKey]--;
                this.showMessage(`${item.name} activated!`);
                return true;
                
            case 'utility':
                if (itemKey === 'PARACHUTE') {
                    this.hasParachute = true;
                    this.inventory.items[itemKey]--;
                    this.showMessage("Parachute equipped!");
                    return true;
                } else if (itemKey === 'BATTERY') {
                    const restored = Math.min(item.restorePower, 100 - this.maxPower);
                    this.maxPower += restored;
                    this.power = Math.min(this.power + restored, this.maxPower);
                    this.inventory.items[itemKey]--;
                    this.showMessage(`Power restored! +${restored}`);
                    return true;
                }
                break;
                
            case 'upgrade':
                if (itemKey === 'TRACER') {
                    this.tracerActive = true;
                    this.inventory.items[itemKey]--;
                    this.showMessage("Tracer activated!");
                    return true;
                }
                break;
        }
        
        return false;
    }
    
    applyForce(fx, fy) {
        // This could be used for explosion knockback
        // For now, just check if the force is strong enough to make the tank fall
        if (Math.abs(fx) > 20 || fy < -20) {
            this.state = CONSTANTS.TANK_STATES.FALLING;
            this.velocity.x = fx;
            this.velocity.y = fy;
        }
    }
    
    showMessage(text) {
        this.lastMessage = text;
        this.messageTimer = 3000; // Show for 3 seconds
    }
    
    draw(ctx) {
        if (this.state === CONSTANTS.TANK_STATES.DESTROYED) {
            // Draw destroyed tank
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.fillStyle = '#333';
            ctx.fillRect(-CONSTANTS.TANK_WIDTH/2, -5, CONSTANTS.TANK_WIDTH, 5);
            ctx.restore();
            return;
        }
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw tank body with glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        if (this.state === CONSTANTS.TANK_STATES.DAMAGED) {
            ctx.globalAlpha = 0.7;
        }
        
        // Tank body (simple rectangle with rounded top)
        ctx.fillRect(-CONSTANTS.TANK_WIDTH/2, -CONSTANTS.TANK_HEIGHT, CONSTANTS.TANK_WIDTH, CONSTANTS.TANK_HEIGHT);
        
        // Draw tank dome/turret base
        ctx.beginPath();
        ctx.arc(0, -CONSTANTS.TANK_HEIGHT, CONSTANTS.TANK_WIDTH/3, Math.PI, 0);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Draw turret
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        // Draw turret from center of dome
        const turretStartY = -CONSTANTS.TANK_HEIGHT;
        const angleRad = this.angle * Math.PI / 180;
        const turretEndX = Math.cos(angleRad) * this.turretLength;
        const turretEndY = turretStartY - Math.sin(angleRad) * this.turretLength;
        
        ctx.beginPath();
        ctx.moveTo(0, turretStartY);
        ctx.lineTo(turretEndX, turretEndY);
        ctx.stroke();
        
        // Draw aiming line (faint preview)
        if (!this.isAI && this.state === CONSTANTS.TANK_STATES.NORMAL) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(turretEndX, turretEndY);
            const extendedX = Math.cos(angleRad) * 100;
            const extendedY = turretStartY - Math.sin(angleRad) * 100;
            ctx.lineTo(extendedX, extendedY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Draw shield if active
        if (this.shield) {
            ctx.strokeStyle = '#0ff';
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -CONSTANTS.TANK_HEIGHT/2, CONSTANTS.TANK_WIDTH, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        // Draw message if any
        if (this.lastMessage) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.lastMessage, 0, -30);
        }
        
        // Draw player name
        ctx.fillStyle = this.color;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.playerName, 0, 15);
        
        ctx.restore();
    }
}