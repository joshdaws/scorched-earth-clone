/**
 * Tank effect overlay renderer used by gameplay and Tank Forge preview.
 */

import { TANK } from './constants.js';

function hexToRgba(hex, alpha = 1) {
    if (typeof hex !== 'string') {
        return `rgba(0, 255, 255, ${alpha})`;
    }

    const sanitized = hex.replace('#', '');
    if (sanitized.length !== 6) {
        return `rgba(0, 255, 255, ${alpha})`;
    }

    const r = parseInt(sanitized.slice(0, 2), 16);
    const g = parseInt(sanitized.slice(2, 4), 16);
    const b = parseInt(sanitized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function nowMs() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }
    return Date.now();
}

/**
 * Render active effects around a world-space tank.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number}} tank
 * @param {Array<{type:string,color:string,intensity:number,speed:number}>} effects
 * @param {number} [timeMs]
 */
export function renderTankEffects(ctx, tank, effects, timeMs = nowMs()) {
    if (!ctx || !tank || !Array.isArray(effects) || effects.length === 0) return;

    const centerX = tank.x;
    const centerY = tank.y - TANK.BODY_HEIGHT / 2;
    const pulseT = timeMs / 1000;

    ctx.save();

    for (const effect of effects) {
        const intensity = Math.max(0, Math.min(1.5, Number(effect.intensity ?? 0.5)));
        const speed = Math.max(0.1, Math.min(8, Number(effect.speed ?? 1)));
        const color = hexToRgba(effect.color || '#00ffff', 0.3 + intensity * 0.5);
        const wave = 0.5 + 0.5 * Math.sin(pulseT * speed * Math.PI * 2);

        switch (effect.type) {
            case 'neonPulse': {
                const radius = TANK.WIDTH * (0.56 + wave * 0.12);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1 + intensity * 2;
                ctx.shadowColor = color;
                ctx.shadowBlur = 8 + wave * 12;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
                break;
            }

            case 'laserStripe': {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1 + intensity;
                ctx.setLineDash([4, 3]);
                const stripeY = centerY - 6 + wave * 8;
                ctx.beginPath();
                ctx.moveTo(centerX - TANK.WIDTH / 2 - 6, stripeY);
                ctx.lineTo(centerX + TANK.WIDTH / 2 + 6, stripeY);
                ctx.stroke();
                ctx.setLineDash([]);
                break;
            }

            case 'plasmaVent': {
                ctx.fillStyle = color;
                for (let i = 0; i < 4; i++) {
                    const angle = pulseT * speed * 2 + i * (Math.PI / 2);
                    const px = centerX + Math.cos(angle) * (TANK.WIDTH * 0.35);
                    const py = centerY + Math.sin(angle) * (TANK.BODY_HEIGHT * 0.55);
                    ctx.beginPath();
                    ctx.arc(px, py, 1 + intensity * 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }

            case 'scanline': {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                for (let y = -10; y <= 10; y += 4) {
                    const offset = (wave * 2) - 1;
                    ctx.beginPath();
                    ctx.moveTo(centerX - TANK.WIDTH / 2 - 4, centerY + y + offset);
                    ctx.lineTo(centerX + TANK.WIDTH / 2 + 4, centerY + y + offset);
                    ctx.stroke();
                }
                break;
            }

            case 'sparkArc': {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1 + intensity;
                ctx.beginPath();
                const startAngle = Math.PI * (0.2 + wave * 0.2);
                const endAngle = Math.PI * (0.8 + wave * 0.2);
                ctx.arc(centerX, centerY - 2, TANK.WIDTH * 0.6, startAngle, endAngle);
                ctx.stroke();
                break;
            }

            default:
                break;
        }
    }

    ctx.restore();
}

/**
 * Render effect overlays for a sprite preview area.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number,width:number,height:number}} rect
 * @param {Array<{type:string,color:string,intensity:number,speed:number}>} effects
 * @param {number} [timeMs]
 */
export function renderTankEffectsPreview(ctx, rect, effects, timeMs = nowMs()) {
    if (!ctx || !rect) return;

    const fakeTank = {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height
    };
    renderTankEffects(ctx, fakeTank, effects, timeMs);
}
