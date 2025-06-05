// Projectile Manager
class ProjectileManager {
    constructor() {
        this.projectiles = [];
        this.effects = [];
    }
    
    fireWeapon(tank, physics) {
        const shotData = tank.fire();
        if (!shotData) return null;
        
        const projectile = WeaponSystem.createProjectile(
            shotData.weapon,
            shotData.x,
            shotData.y,
            shotData.angle,
            shotData.power,
            shotData.owner,
            shotData.tracer
        );
        
        if (projectile) {
            this.projectiles.push(projectile);
            
            // Deactivate tracer after use
            if (tank.tracerActive) {
                tank.tracerActive = false;
            }
        }
        
        return projectile;
    }
    
    update(deltaTime, physics, terrain, tanks, effectsSystem, soundSystem) {
        // Update all projectiles
        for (let projectile of this.projectiles) {
            WeaponSystem.updateProjectile(projectile, deltaTime, physics, terrain, tanks, effectsSystem, soundSystem);
        }
        
        // Remove inactive projectiles
        this.projectiles = this.projectiles.filter(p => p.active || p.subMunitions.length > 0);
        
        // Update effects
        for (let effect of this.effects) {
            effect.lifetime -= deltaTime;
        }
        this.effects = this.effects.filter(e => e.lifetime > 0);
    }
    
    draw(ctx) {
        // Draw all projectiles
        for (let projectile of this.projectiles) {
            WeaponSystem.drawProjectile(ctx, projectile);
        }
        
        // Draw effects
        for (let effect of this.effects) {
            this.drawEffect(ctx, effect);
        }
    }
    
    drawEffect(ctx, effect) {
        switch(effect.type) {
            case 'explosion':
                const alpha = effect.lifetime / effect.maxLifetime;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = effect.color || '#ff0';
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.radius * (1 - alpha), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                break;
                
            case 'smoke':
                const smokeAlpha = effect.lifetime / effect.maxLifetime * 0.5;
                ctx.save();
                ctx.globalAlpha = smokeAlpha;
                ctx.fillStyle = '#666';
                ctx.beginPath();
                ctx.arc(effect.x, effect.y - (1 - smokeAlpha) * 20, effect.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                break;
        }
    }
    
    addExplosionEffect(x, y, radius, color = '#ff0') {
        this.effects.push({
            type: 'explosion',
            x: x,
            y: y,
            radius: radius,
            color: color,
            lifetime: 500,
            maxLifetime: 500
        });
    }
    
    addSmokeEffect(x, y, radius) {
        for (let i = 0; i < 5; i++) {
            this.effects.push({
                type: 'smoke',
                x: x + (Math.random() - 0.5) * radius,
                y: y + (Math.random() - 0.5) * radius,
                radius: radius / 3,
                lifetime: 2000 + Math.random() * 1000,
                maxLifetime: 3000
            });
        }
    }
    
    hasActiveProjectiles() {
        return this.projectiles.length > 0;
    }
    
    clear() {
        this.projectiles = [];
        this.effects = [];
    }
}