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
    this.maxPower = 500; // Increased from 100
    this.health = 100;
    this.maxHealth = 100;

    // State
    this.state = CONSTANTS.TANK_STATES.NORMAL;
    this.shield = null;
    this.hasParachute = false;
    this.fallHeight = 0;
    this.velocity = { x: 0, y: 0 };
    this.slideResistance = 0.995; // Extremely high friction for very slow sliding

    // Inventory and economy
    this.money = 0;
    this.inventory = {
      weapons: {
        MISSILE: -1, // Unlimited missiles
      },
      items: {},
    };
    this.selectedWeapon = "MISSILE";
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

    // Get terrain height at tank position
    const tankBottom = this.y; // this.y IS the bottom of the tank
    const groundY = terrain.getHeightAt(this.x);

    // Handle different states
    if (this.state === CONSTANTS.TANK_STATES.FALLING) {
      // Apply gravity (with parachute effect if equipped)
      const gravityMultiplier = this.hasParachute ? 0.2 : 1.0;
      this.velocity.y += physics.gravity * gravityMultiplier * deltaTime * 0.01;

      // Update position
      this.y += this.velocity.y * deltaTime;
      this.fallHeight += Math.abs(this.velocity.y * deltaTime);

      // Check if landed
      if (tankBottom >= groundY) {
        this.y = groundY;
        this.land(physics);
      }
    } else if (this.state === CONSTANTS.TANK_STATES.SLIDING) {
      // Handle sliding on slopes
      this.handleSliding(deltaTime, terrain, physics);
    } else {
      // Normal state - check if we should start falling or sliding
      const gap = groundY - tankBottom;

      if (gap > 2) {
        // Tank is in the air, start falling
        this.state = CONSTANTS.TANK_STATES.FALLING;
        this.fallHeight = 0;
        this.velocity.y = 0;

        if (this.hasParachute) {
          this.showMessage("Deploying parachute!");
        } else if (window.game && window.game.soundSystem) {
          window.game.soundSystem.play("tankFalling");
        }
      } else if (gap < -1) {
        // Tank is below ground, push it up
        this.y = groundY;
        this.velocity.y = 0;
      } else {
        // Tank is on ground, check for slope
        const slope = this.calculateSlope(terrain);
        if (Math.abs(slope) > 0.8) {
          // Only slide on very steep slopes
          this.state = CONSTANTS.TANK_STATES.SLIDING;
          this.velocity.x = slope > 0 ? 0.2 : -0.2; // Start with low velocity
          this.velocity.y = 0;
        } else {
          // Stable on ground
          this.y = groundY;
          this.velocity.x = 0;
          this.velocity.y = 0;
        }
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
      const checkY = this.y - CONSTANTS.TANK_HEIGHT/2; // Check at tank center

      if (terrain.checkCollision(checkX, checkY)) {
        buriedPoints++;
      }
    }

    if (buriedPoints >= 3 && this.state !== CONSTANTS.TANK_STATES.BURIED) {
      this.state = CONSTANTS.TANK_STATES.BURIED;
      this.showMessage("I'm buried!");
    } else if (
      buriedPoints < 3 &&
      this.state === CONSTANTS.TANK_STATES.BURIED
    ) {
      this.state = CONSTANTS.TANK_STATES.NORMAL;
      this.showMessage("Free at last!");
    }
  }

  calculateSlope(terrain) {
    // Sample terrain points around the tank
    const sampleDistance = 10;
    const leftHeight = terrain.getHeightAt(this.x - sampleDistance);
    const rightHeight = terrain.getHeightAt(this.x + sampleDistance);

    // Calculate slope (positive = downhill to right, negative = downhill to left)
    const slope = (rightHeight - leftHeight) / (sampleDistance * 2);
    return slope;
  }

  handleSliding(deltaTime, terrain, physics) {
    // Apply gravity component along slope
    const slope = this.calculateSlope(terrain);
    const slopeAngle = Math.atan(slope);

    // Gravity component along slope (much slower sliding)
    const gravityAlongSlope = physics.gravity * Math.sin(slopeAngle) * 0.0005; // Very slow

    // Update velocity with very low max speed limit
    this.velocity.x += gravityAlongSlope * deltaTime;
    this.velocity.x = Math.max(-0.5, Math.min(0.5, this.velocity.x)); // Very low cap

    // Apply friction
    this.velocity.x *= this.slideResistance;

    // Update position
    this.x += this.velocity.x * deltaTime;

    // Keep tank on terrain surface while sliding
    const groundY = terrain.getHeightAt(this.x);
    this.y = groundY;

    // Check if we've stopped sliding
    if (Math.abs(this.velocity.x) < 0.1 && Math.abs(slope) < 0.5) {
      this.state = CONSTANTS.TANK_STATES.NORMAL;
      this.velocity.x = 0;
    }

    // Check screen boundaries
    if (this.x < 0 || this.x > terrain.width) {
      // Handle based on wall behavior
      if (physics.wallBehavior === "wrap") {
        this.x = (this.x + terrain.width) % terrain.width;
      } else if (physics.wallBehavior === "bounce") {
        this.velocity.x = -this.velocity.x * 0.5;
        this.x = Math.max(0, Math.min(terrain.width, this.x));
      } else {
        // Absorb
        this.velocity.x = 0;
        this.x = Math.max(0, Math.min(terrain.width, this.x));
        this.state = CONSTANTS.TANK_STATES.NORMAL;
      }
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
      const damage = physics.calculateFallDamage(
        this.velocity.y,
        this.fallHeight
      );

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
    if (
      !this.inventory.weapons[weaponKey] ||
      this.inventory.weapons[weaponKey] === 0
    ) {
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
    const angleRad = (this.angle * Math.PI) / 180;
    const turretStartY = this.y - CONSTANTS.TANK_HEIGHT + 4; // Turret on top of tank
    const fireX = this.x + Math.cos(angleRad) * this.turretLength;
    const fireY = turretStartY - Math.sin(angleRad) * this.turretLength;

    return {
      x: fireX,
      y: fireY,
      angle: this.angle,
      power: this.power,
      weapon: weaponKey,
      owner: this,
      tracer: this.tracerActive,
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
    if (this.inventory.weapons[weaponKey] !== -1) {
      // Not unlimited
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

    switch (item.type) {
      case "shield":
        this.shield = {
          type: itemKey,
          health: item.health,
          deflects: item.deflects || false,
          repels: item.repels || false,
        };
        this.inventory.items[itemKey]--;
        this.showMessage(`${item.name} activated!`);
        return true;

      case "utility":
        if (itemKey === "PARACHUTE") {
          this.hasParachute = true;
          this.inventory.items[itemKey]--;
          this.showMessage("Parachute equipped!");
          return true;
        } else if (itemKey === "BATTERY") {
          const restored = Math.min(item.restorePower, 100 - this.maxPower);
          this.maxPower += restored;
          this.power = Math.min(this.power + restored, this.maxPower);
          this.inventory.items[itemKey]--;
          this.showMessage(`Power restored! +${restored}`);
          return true;
        }
        break;

      case "upgrade":
        if (itemKey === "TRACER") {
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

  drawPixelTank(ctx, x, y, color) {
    // Simple, clean tank design like in the image
    // y is where the bottom of the tank sits on the ground
    const tankWidth = 24;
    const tankHeight = 12;
    const baseX = Math.floor(x - tankWidth / 2);
    const baseY = Math.floor(y - tankHeight);

    // Main tank body - simple rectangle
    ctx.fillStyle = color;
    ctx.fillRect(baseX, baseY, tankWidth, tankHeight);

    // Dark bottom edge (treads)
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(baseX, baseY + tankHeight - 3, tankWidth, 3);
  }

  draw(ctx) {
    if (this.state === CONSTANTS.TANK_STATES.DESTROYED) {
      // Draw destroyed tank (burnt debris)
      ctx.save();
      ctx.fillStyle = "#333";
      ctx.globalAlpha = 0.6;

      // Simple debris pile
      const debrisWidth = 20;
      const debrisHeight = 8;
      ctx.fillRect(
        this.x - debrisWidth / 2,
        this.y - debrisHeight,
        debrisWidth,
        debrisHeight
      );

      // Some smoke particles
      ctx.fillStyle = "#555";
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 3; i++) {
        const smokeX = this.x + (Math.random() - 0.5) * 15;
        const smokeY = this.y - debrisHeight - 5 - i * 5;
        ctx.beginPath();
        ctx.arc(smokeX, smokeY, 3 + i, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      return;
    }

    ctx.save();

    // No glow effect - keep it clean like the original

    // Now draw the actual tank without shadow
    if (this.state === CONSTANTS.TANK_STATES.DAMAGED) {
      ctx.globalAlpha = 0.7;
    }
    this.drawPixelTank(ctx, this.x, this.y, this.color);

    // Draw turret
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2; // Thinner turret
    ctx.lineCap = "round"; // Round end
    ctx.shadowBlur = 0; // No blur on turret

    // Draw turret from top center of tank body
    const turretStartX = this.x;
    const turretStartY = this.y - CONSTANTS.TANK_HEIGHT + 4; // Turret pivots from top of tank
    const angleRad = (this.angle * Math.PI) / 180;
    const turretEndX = turretStartX + Math.cos(angleRad) * this.turretLength;
    const turretEndY = turretStartY - Math.sin(angleRad) * this.turretLength;

    ctx.beginPath();
    ctx.moveTo(turretStartX, turretStartY);
    ctx.lineTo(turretEndX, turretEndY);
    ctx.stroke();

    // Draw aiming line (faint preview)
    if (!this.isAI && this.state === CONSTANTS.TANK_STATES.NORMAL) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(turretEndX, turretEndY);
      const extendedX = this.x + Math.cos(angleRad) * 100;
      const extendedY = turretStartY - Math.sin(angleRad) * 100;
      ctx.lineTo(extendedX, extendedY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw shield if active
    if (this.shield) {
      ctx.strokeStyle = "#0ff";
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#0ff";
      ctx.beginPath();
      ctx.arc(this.x, this.y - CONSTANTS.TANK_HEIGHT/2, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // Draw message if any
    if (this.lastMessage) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.shadowBlur = 2;
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.fillText(this.lastMessage, this.x, this.y - CONSTANTS.TANK_HEIGHT - 20);
      ctx.shadowBlur = 0;
    }

    // Draw player name above tank (clean, no shadow)
    ctx.fillStyle = this.color;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(this.playerName, this.x, this.y - CONSTANTS.TANK_HEIGHT - 10);

    ctx.restore();
  }
}
