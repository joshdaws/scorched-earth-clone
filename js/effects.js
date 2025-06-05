// Visual Effects System
class EffectsSystem {
    constructor() {
        this.particles = [];
        this.animations = [];
    }
    
    createExplosion(x, y, radius, type = 'standard') {
        // Create multiple layers of particles for more dramatic effect
        const layers = 3;

        for (let layer = 0; layer < layers; layer++) {
            const numParticles = Math.floor(radius * (3 - layer));
            const layerDelay = layer * 50; // Stagger particle creation

            setTimeout(() => {
                for (let i = 0; i < numParticles; i++) {
                    const angle = (Math.PI * 2 * i) / numParticles + (Math.random() - 0.5) * 0.5;
                    const speed = radius * (0.3 + Math.random() * 0.7) * (1 + layer * 0.3);
                    const size = (4 - layer) + Math.random() * 6;

                    let color;
                    switch(type) {
                        case 'fire':
                            // Warmer fire palette
                            const fireColors = ['#ffb347', '#ff7747', '#ff9429'];
                            color = fireColors[Math.floor(Math.random() * fireColors.length)];
                            break;
                        case 'dirt':
                            // Earthy dirt
                            color = `hsl(30, ${40 + Math.random() * 20}%, ${30 + Math.random() * 20}%)`;
                            break;
                        case 'cluster':
                            // Rainbow neon colors
                            color = `hsl(${Math.random() * 360}, 100%, ${70 + Math.random() * 30}%)`;
                            break;
                        default:
                            // More natural explosion colors
                            if (layer === 0) {
                                color = '#ffffff';
                            } else if (layer === 1) {
                                const explosionColors = ['#fbdc65', '#f7a541', '#d96629'];
                                color = explosionColors[Math.floor(Math.random() * explosionColors.length)];
                            } else {
                                const smokeColors = ['#555', '#444', '#666'];
                                color = smokeColors[Math.floor(Math.random() * smokeColors.length)];
                            }
                    }

                    this.particles.push({
                        x: x + (Math.random() - 0.5) * radius * 0.2,
                        y: y + (Math.random() - 0.5) * radius * 0.2,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - Math.random() * radius / 2,
                        size: size,
                        color: color,
                        lifetime: 1500 + Math.random() * 1000 - layer * 200,
                        maxLifetime: 2500 - layer * 200,
                        gravity: type === 'dirt' ? 200 : 100,
                        glow: layer === 0 && type !== 'dirt'
                    });
                }
            }, layerDelay);
        }

        // Add central flash for big explosions
        if (radius > 30 && type !== 'dirt') {
            this.animations.push({
                type: 'flash',
                x: x,
                y: y,
                radius: radius * 2,
                lifetime: 200,
                maxLifetime: 200,
                color: type === 'fire' ? '#ffb347' : '#fbdc65'
            });
        }

        if (type === 'standard' || type === 'fire') {
            this.createSmoke(x, y, radius);
        }
    }
    
    createTankExplosion(x, y) {
        // Create a more dramatic explosion for tank destruction
        this.createExplosion(x, y, 40, 'standard');
        
        // Add some debris
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: -Math.abs(Math.sin(angle) * speed),
                size: 3 + Math.random() * 3,
                color: '#666',
                lifetime: 2000,
                maxLifetime: 2000,
                gravity: 300,
                isSolid: true
            });
        }
    }
    
    createShieldHit(x, y) {
        const numParticles = 20;
        
        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles;
            const speed = 30;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2,
                color: '#0ff',
                lifetime: 500,
                maxLifetime: 500,
                gravity: 0,
                fade: true
            });
        }
    }
    
    createDirtSpray(x, y, direction = 0) {
        const numParticles = 30;
        
        for (let i = 0; i < numParticles; i++) {
            const angle = direction + (Math.random() - 0.5) * Math.PI / 2;
            const speed = 20 + Math.random() * 40;
            
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                color: `hsl(30, 30%, ${20 + Math.random() * 20}%)`,
                lifetime: 1000 + Math.random() * 1000,
                maxLifetime: 2000,
                gravity: 200
            });
        }
    }
    
    createFallingDirt(x, y, fallSpeed) {
        // Create dirt particles that fall naturally
        const numParticles = 5 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < numParticles; i++) {
            const size = 1 + Math.random() * 3;
            const horizontalSpread = (Math.random() - 0.5) * 10;
            
            // Use terrain colors with some variation
            const hue = 280 + Math.random() * 20; // Purple-tinted
            const saturation = 20 + Math.random() * 30;
            const lightness = 20 + Math.random() * 20;
            
            this.particles.push({
                x: x + horizontalSpread,
                y: y,
                vx: horizontalSpread * 0.1,
                vy: fallSpeed + Math.random() * 5,
                size: size,
                color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                lifetime: 2000 + Math.random() * 1000,
                maxLifetime: 3000,
                gravity: 300,
                bounce: true, // New property for dirt particles
                bounceDamping: 0.3
            });
        }
    }
    
    createFireEffect(x, y, radius) {
        // Create lingering fire particles
        setInterval(() => {
            if (this.animations.find(a => a.type === 'fire' && a.x === x && a.y === y)) {
                for (let i = 0; i < 3; i++) {
                    const offsetX = (Math.random() - 0.5) * radius;
                    
                    this.particles.push({
                        x: x + offsetX,
                        y: y,
                        vx: (Math.random() - 0.5) * 10,
                        vy: -20 - Math.random() * 20,
                        size: 3 + Math.random() * 3,
                        color: `hsl(${Math.random() * 60}, 100%, 50%)`,
                        lifetime: 500 + Math.random() * 500,
                        maxLifetime: 1000,
                        gravity: -50, // Fire rises
                        fade: true
                    });
                }
            }
        }, 100);
        
        this.animations.push({
            type: 'fire',
            x: x,
            y: y,
            radius: radius,
            lifetime: 5000,
            maxLifetime: 5000
        });
    }

    createSmoke(x, y, radius) {
        const numParticles = Math.floor(radius * 1.5);
        for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 20;

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed * 0.3,
                vy: Math.sin(angle) * speed * 0.3 - Math.random() * 20,
                size: 6 + Math.random() * 8,
                color: `rgba(80,80,80,${0.5 + Math.random() * 0.3})`,
                lifetime: 2000 + Math.random() * 2000,
                maxLifetime: 4000,
                gravity: -20,
                fade: true
            });
        }
    }
    
    update(deltaTime, terrain = null) {
        // Update particles
        for (let particle of this.particles) {
            // Update position
            particle.x += particle.vx * deltaTime / 1000;
            particle.y += particle.vy * deltaTime / 1000;
            particle.vy += particle.gravity * deltaTime / 1000;
            particle.lifetime -= deltaTime;
            
            // Apply fade effect
            if (particle.fade) {
                particle.size *= 0.98;
            }
            
            // Handle bouncing dirt particles
            if (particle.bounce && terrain) {
                const groundY = terrain.getHeightAt(particle.x);
                if (particle.y >= groundY) {
                    // Particle hit the ground
                    particle.y = groundY;
                    particle.vy = -particle.vy * particle.bounceDamping;
                    particle.vx *= 0.8; // Friction on bounce
                    
                    // Stop bouncing if velocity is too low
                    if (Math.abs(particle.vy) < 10) {
                        particle.bounce = false;
                        particle.vy = 0;
                        particle.vx = 0;
                        particle.lifetime = Math.min(particle.lifetime, 500); // Fade out quickly once settled
                    }
                }
            }
        }
        
        // Remove dead particles
        this.particles = this.particles.filter(p => p.lifetime > 0 && p.size > 0.1);
        
        // Update animations
        for (let anim of this.animations) {
            anim.lifetime -= deltaTime;
        }
        this.animations = this.animations.filter(a => a.lifetime > 0);
    }
    
    draw(ctx) {
        // Draw particles
        for (let particle of this.particles) {
            const alpha = particle.lifetime / particle.maxLifetime;
            
            ctx.save();
            ctx.globalAlpha = particle.fade ? alpha : 1;
            
            // Add glow effect for bright particles
            if (particle.glow) {
                ctx.shadowBlur = particle.size * 2;
                ctx.shadowColor = particle.color;
            }
            
            ctx.fillStyle = particle.color;
            
            if (particle.isSolid) {
                ctx.fillRect(particle.x - particle.size/2, particle.y - particle.size/2, 
                           particle.size, particle.size);
            } else {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }
        
        // Draw animation effects
        for (let anim of this.animations) {
            const alpha = anim.lifetime / anim.maxLifetime;
            
            switch(anim.type) {
                case 'flash':
                    // Draw explosion flash
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    
                    // Create radial gradient
                    const gradient = ctx.createRadialGradient(
                        anim.x, anim.y, 0,
                        anim.x, anim.y, anim.radius
                    );
                    gradient.addColorStop(0, anim.color);
                    gradient.addColorStop(0.4, anim.color);
                    gradient.addColorStop(1, 'transparent');
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(
                        anim.x - anim.radius,
                        anim.y - anim.radius,
                        anim.radius * 2,
                        anim.radius * 2
                    );
                    ctx.restore();
                    break;
                    
                case 'fire':
                    // Draw fire glow
                    ctx.save();
                    ctx.globalAlpha = alpha * 0.3;
                    ctx.fillStyle = '#f80';
                    ctx.beginPath();
                    ctx.arc(anim.x, anim.y, anim.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    break;
            }
        }
    }
    
    clear() {
        this.particles = [];
        this.animations = [];
    }
}