// PixiJS-powered particle effects system
class PixiEffectsSystem extends EffectsSystem {
    constructor(canvas) {
        super();
        this.app = new PIXI.Application({
            view: canvas,
            width: canvas.width,
            height: canvas.height,
            transparent: true,
            autoStart: false,
            antialias: true
        });
        this.graphics = new PIXI.Graphics();
        this.app.stage.addChild(this.graphics);
        if (PIXI.filters && PIXI.filters.AdvancedBloomFilter) {
            this.app.stage.filters = [new PIXI.filters.AdvancedBloomFilter({
                threshold: 0.5,
                bloomScale: 1.2,
                brightness: 1.1
            })];
        }
    }

    draw() {
        this.graphics.clear();
        for (const p of this.particles) {
            const alpha = p.fade ? (p.lifetime / p.maxLifetime) : 1;
            const color = PIXI.utils.string2hex(p.color);
            this.graphics.beginFill(color, alpha);
            if (p.isSolid) {
                this.graphics.drawRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            } else {
                this.graphics.drawCircle(p.x, p.y, p.size / 2);
            }
            this.graphics.endFill();
        }
        this.app.renderer.render(this.app.stage);
    }
}

// Export globally
window.PixiEffectsSystem = PixiEffectsSystem;
