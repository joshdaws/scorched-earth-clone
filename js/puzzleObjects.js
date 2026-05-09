/**
 * Data-driven puzzle objects for handcrafted artillery levels.
 *
 * Objects use normalized level-layout coordinates at rest and are converted to
 * canvas pixels for runtime collision/rendering.
 */

import { COLORS } from './constants.js';

export const PUZZLE_OBJECT_TYPES = {
    SHIELD: 'shield',
    RICOCHET: 'ricochet',
    TELEPORT: 'teleport',
    BUNKER: 'bunker'
};

const DEFAULT_OBJECTS = [];
const DEFAULT_RADIUS_NORM = 0.05;
const DEFAULT_WIDTH_NORM = 0.12;
const DEFAULT_HEIGHT_NORM = 0.08;
const TELEPORT_COOLDOWN_FRAMES = 12;

function clamp01(value, fallback = 0) {
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

function normalizeAngle(angleDeg) {
    return Number.isFinite(angleDeg) ? angleDeg : 0;
}

function objectId(type, index) {
    return `${type}-${index + 1}`;
}

function normalizeObject(raw, index) {
    if (!raw || typeof raw !== 'object') return null;

    const type = Object.values(PUZZLE_OBJECT_TYPES).includes(raw.type) ? raw.type : null;
    if (!type) return null;

    const base = {
        id: typeof raw.id === 'string' && raw.id ? raw.id : objectId(type, index),
        type,
        label: typeof raw.label === 'string' ? raw.label : '',
        xNorm: clamp01(raw.xNorm, 0.5),
        yNorm: clamp01(raw.yNorm, 0.5),
        active: raw.active !== false
    };

    if (type === PUZZLE_OBJECT_TYPES.SHIELD) {
        return {
            ...base,
            radiusNorm: clamp01(raw.radiusNorm, DEFAULT_RADIUS_NORM),
            strength: Math.max(1, Math.floor(raw.strength || 1))
        };
    }

    if (type === PUZZLE_OBJECT_TYPES.RICOCHET) {
        return {
            ...base,
            widthNorm: clamp01(raw.widthNorm, DEFAULT_WIDTH_NORM),
            angleDeg: normalizeAngle(raw.angleDeg),
            retention: Number.isFinite(raw.retention) ? Math.max(0.4, Math.min(1.2, raw.retention)) : 0.88
        };
    }

    if (type === PUZZLE_OBJECT_TYPES.TELEPORT) {
        return {
            ...base,
            radiusNorm: clamp01(raw.radiusNorm, DEFAULT_RADIUS_NORM),
            targetId: typeof raw.targetId === 'string' ? raw.targetId : null,
            pairId: typeof raw.pairId === 'string' ? raw.pairId : null
        };
    }

    return {
        ...base,
        widthNorm: clamp01(raw.widthNorm, DEFAULT_WIDTH_NORM),
        heightNorm: clamp01(raw.heightNorm, DEFAULT_HEIGHT_NORM),
        strength: Math.max(1, Math.floor(raw.strength || 1))
    };
}

/**
 * Normalize authored level puzzle-object data.
 * @param {Array<object>} objects
 * @returns {Array<object>}
 */
export function normalizePuzzleObjects(objects = DEFAULT_OBJECTS) {
    if (!Array.isArray(objects)) return [];
    return objects.map(normalizeObject).filter(Boolean);
}

/**
 * Clone normalized puzzle-object data.
 * @param {Array<object>} objects
 * @returns {Array<object>}
 */
export function clonePuzzleObjects(objects = DEFAULT_OBJECTS) {
    return normalizePuzzleObjects(objects).map(object => ({ ...object }));
}

/**
 * Convert normalized puzzle objects to runtime canvas coordinates.
 * @param {Array<object>} objects
 * @param {number} width
 * @param {number} height
 * @returns {Array<object>}
 */
export function createPuzzleObjects(objects = DEFAULT_OBJECTS, width = 1200, height = 800) {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    const minDimension = Math.min(safeWidth, safeHeight);

    return clonePuzzleObjects(objects).map(object => ({
        ...object,
        x: object.xNorm * safeWidth,
        y: object.yNorm * safeHeight,
        radius: object.radiusNorm ? object.radiusNorm * minDimension : 0,
        width: object.widthNorm ? object.widthNorm * safeWidth : 0,
        height: object.heightNorm ? object.heightNorm * safeHeight : 0,
        maxStrength: object.strength || 1
    }));
}

function distance(aX, aY, bX, bY) {
    const dx = aX - bX;
    const dy = aY - bY;
    return Math.sqrt(dx * dx + dy * dy);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const lengthSq = abx * abx + aby * aby;
    if (lengthSq === 0) return distance(px, py, ax, ay);

    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lengthSq));
    const closestX = ax + abx * t;
    const closestY = ay + aby * t;
    return distance(px, py, closestX, closestY);
}

function getPanelSegment(panel) {
    const radians = panel.angleDeg * Math.PI / 180;
    const halfWidth = panel.width / 2;
    const dx = Math.cos(radians) * halfWidth;
    const dy = Math.sin(radians) * halfWidth;

    return {
        ax: panel.x - dx,
        ay: panel.y - dy,
        bx: panel.x + dx,
        by: panel.y + dy,
        angle: radians
    };
}

function getTeleportTarget(source, objects) {
    if (source.targetId) {
        return objects.find(object => object.active !== false && object.id === source.targetId) || null;
    }

    if (source.pairId) {
        return objects.find(object =>
            object.active !== false &&
            object.type === PUZZLE_OBJECT_TYPES.TELEPORT &&
            object.pairId === source.pairId &&
            object.id !== source.id
        ) || null;
    }

    return null;
}

function reflectProjectile(projectile, panel) {
    const segment = getPanelSegment(panel);
    const tangentX = Math.cos(segment.angle);
    const tangentY = Math.sin(segment.angle);
    const normalX = -tangentY;
    const normalY = tangentX;
    const dot = projectile.vx * normalX + projectile.vy * normalY;
    const retention = panel.retention || 0.88;

    projectile.capturePreviousPosition?.();
    projectile.vx = (projectile.vx - 2 * dot * normalX) * retention;
    projectile.vy = (projectile.vy - 2 * dot * normalY) * retention;
    projectile.x += normalX * 8;
    projectile.y += normalY * 8;
}

function damageObject(object, amount = 1) {
    object.strength = Math.max(0, (object.strength || 1) - amount);
    if (object.strength <= 0) {
        object.active = false;
    }
}

/**
 * Resolve projectile collision against active puzzle objects.
 * @param {import('./projectile.js').Projectile} projectile
 * @param {Array<object>} objects
 * @param {object|null} weapon
 * @returns {object|null}
 */
export function resolvePuzzleObjectCollision(projectile, objects = DEFAULT_OBJECTS, weapon = null) {
    if (!projectile?.isActive?.() || !Array.isArray(objects) || objects.length === 0) return null;

    projectile.puzzleTeleportCooldown = Math.max(0, (projectile.puzzleTeleportCooldown || 0) - 1);

    const x = projectile.x;
    const y = projectile.y;

    for (const object of objects) {
        if (!object.active) continue;

        if (object.type === PUZZLE_OBJECT_TYPES.TELEPORT) {
            if (projectile.puzzleTeleportCooldown > 0) continue;
            if (distance(x, y, object.x, object.y) > object.radius) continue;

            const target = getTeleportTarget(object, objects);
            if (!target) continue;

            projectile.capturePreviousPosition?.();
            projectile.x = target.x;
            projectile.y = target.y;
            projectile.puzzleTeleportCooldown = TELEPORT_COOLDOWN_FRAMES;
            return { type: 'teleport', object, target, continueFlight: true };
        }

        if (object.type === PUZZLE_OBJECT_TYPES.RICOCHET) {
            const segment = getPanelSegment(object);
            const currentDistance = distanceToSegment(x, y, segment.ax, segment.ay, segment.bx, segment.by);
            const previousDistance = distanceToSegment(
                projectile.previousX ?? x,
                projectile.previousY ?? y,
                segment.ax,
                segment.ay,
                segment.bx,
                segment.by
            );
            if (Math.min(currentDistance, previousDistance) > 12) continue;

            reflectProjectile(projectile, object);
            return { type: 'ricochet', object, continueFlight: true };
        }

        if (object.type === PUZZLE_OBJECT_TYPES.SHIELD) {
            if (distance(x, y, object.x, object.y) > object.radius) continue;

            if (weapon?.shieldBuster) {
                damageObject(object, object.strength || 1);
                return { type: 'shield-busted', object, continueFlight: true };
            }

            damageObject(object, 1);
            return { type: 'shield-block', object, block: true, pos: { x, y } };
        }

        if (object.type === PUZZLE_OBJECT_TYPES.BUNKER) {
            const left = object.x - object.width / 2;
            const right = object.x + object.width / 2;
            const top = object.y - object.height / 2;
            const bottom = object.y + object.height / 2;
            if (x < left || x > right || y < top || y > bottom) continue;

            damageObject(object, weapon?.shieldBuster ? 2 : 1);
            return { type: 'bunker-hit', object, block: true, pos: { x, y } };
        }
    }

    return null;
}

/**
 * Render puzzle objects between terrain and tanks.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<object>} objects
 * @param {number} time
 */
export function renderPuzzleObjects(ctx, objects = DEFAULT_OBJECTS, time = 0) {
    return renderPuzzleObjectsWithSprites(ctx, objects, time);
}

/**
 * Render puzzle objects with optional generated sprite art.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<object>} objects
 * @param {number} time
 * @param {Object} sprites
 */
export function renderPuzzleObjectsWithSprites(ctx, objects = DEFAULT_OBJECTS, time = 0, sprites = {}) {
    if (!Array.isArray(objects) || objects.length === 0) return;

    const pulse = (Math.sin(time * 0.006) + 1) / 2;

    for (const object of objects) {
        if (!object.active) continue;

        if (object.type === PUZZLE_OBJECT_TYPES.SHIELD) {
            renderShield(ctx, object, pulse, sprites.shieldGenerator);
        } else if (object.type === PUZZLE_OBJECT_TYPES.RICOCHET) {
            renderRicochet(ctx, object, pulse, sprites.ricochetPanel);
        } else if (object.type === PUZZLE_OBJECT_TYPES.TELEPORT) {
            renderTeleport(ctx, object, pulse, sprites.teleportGate);
        } else if (object.type === PUZZLE_OBJECT_TYPES.BUNKER) {
            renderBunker(ctx, object, pulse, sprites.hardlightBunker);
        }
    }
}

function drawSpriteCentered(ctx, sprite, x, y, width, height) {
    if (!sprite || !sprite.complete || sprite.naturalWidth <= 0) return false;
    ctx.drawImage(sprite, x - width / 2, y - height / 2, width, height);
    return true;
}

function renderShield(ctx, object, pulse, sprite = null) {
    ctx.save();
    const alpha = 0.18 + pulse * 0.12;
    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 18 + pulse * 18;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(object.x, object.y, object.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    drawSpriteCentered(ctx, sprite, object.x, object.y, object.radius * 2.05, object.radius * 1.92);
    ctx.restore();
}

function renderRicochet(ctx, object, pulse, sprite = null) {
    const segment = getPanelSegment(object);

    ctx.save();
    if (drawSpriteCentered(ctx, sprite, object.x, object.y, object.width * 1.08, object.width * 0.52)) {
        ctx.restore();
        return;
    }

    ctx.strokeStyle = COLORS.NEON_YELLOW;
    ctx.shadowColor = COLORS.NEON_YELLOW;
    ctx.shadowBlur = 12 + pulse * 14;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(segment.ax, segment.ay);
    ctx.lineTo(segment.bx, segment.by);
    ctx.stroke();

    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();
}

function renderTeleport(ctx, object, pulse, sprite = null) {
    ctx.save();
    ctx.strokeStyle = COLORS.NEON_PURPLE;
    ctx.shadowColor = COLORS.NEON_PURPLE;
    ctx.shadowBlur = 16 + pulse * 18;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(object.x, object.y, object.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(0);
    ctx.strokeStyle = COLORS.NEON_PINK;
    ctx.beginPath();
    ctx.arc(object.x, object.y, object.radius * (0.45 + pulse * 0.18), 0, Math.PI * 2);
    ctx.stroke();

    drawSpriteCentered(ctx, sprite, object.x, object.y, object.radius * 2.35, object.radius * 2.7);
    ctx.restore();
}

function renderBunker(ctx, object, pulse, sprite = null) {
    ctx.save();
    const x = object.x - object.width / 2;
    const y = object.y - object.height / 2;
    if (drawSpriteCentered(ctx, sprite, object.x, object.y, object.width * 1.18, object.height * 1.45)) {
        ctx.restore();
        return;
    }

    ctx.fillStyle = 'rgba(25, 26, 48, 0.92)';
    ctx.strokeStyle = COLORS.NEON_ORANGE;
    ctx.shadowColor = COLORS.NEON_ORANGE;
    ctx.shadowBlur = 8 + pulse * 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, object.width, object.height, 8);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.shadowBlur = 0;
    for (let i = 1; i < 4; i++) {
        const stripeY = y + (object.height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x + 8, stripeY);
        ctx.lineTo(x + object.width - 8, stripeY);
        ctx.stroke();
    }
    ctx.restore();
}
