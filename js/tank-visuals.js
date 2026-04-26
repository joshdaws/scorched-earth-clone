/**
 * Shared tank visual helpers.
 * Centralizes sprite key selection and turret pivot math.
 */

import * as Assets from './assets.js';
import * as TankCollection from './tank-collection.js';
import { getTurretAnchorForSkin } from './tank-design-runtime.js';

export const DEFAULT_PLAYER_TANK_SKIN_ID = 'standard';
export const DEFAULT_ENEMY_TANK_SKIN_ID = 'enemy';

/**
 * Build the manifest asset key for a tank skin.
 * @param {{rarity?: string, id?: string}|null} skin
 * @returns {string|null}
 */
export function getEquippedSkinAssetKey(skin) {
    if (!skin || !skin.rarity || !skin.id) return null;
    return `tankSkins.${skin.rarity}-${skin.id}`;
}

/**
 * Check whether an image is a fully loaded real sprite.
 * @param {HTMLImageElement|null} sprite
 * @returns {boolean}
 */
export function isRealSprite(sprite) {
    if (!sprite || !sprite.complete || sprite.naturalWidth <= 0) {
        return false;
    }
    // Generated placeholders use data URLs in assets.js
    return !sprite.src.startsWith('data:');
}

/**
 * Resolve the player sprite key from equipped skin, falling back to default.
 * @returns {string}
 */
export function getPlayerSpriteKey() {
    const equippedSkin = TankCollection.getEquippedTank();
    const equippedSpriteKey = getEquippedSkinAssetKey(equippedSkin);

    if (equippedSpriteKey && isRealSprite(Assets.get(equippedSpriteKey))) {
        return equippedSpriteKey;
    }

    return 'tanks.player';
}

/**
 * Resolve the visual skin ID used by shared tank render and turret pivot logic.
 * @param {{team?: string, skinId?: string}|null} tank
 * @param {{playerSkinId?: string|null}} [options]
 * @returns {string}
 */
export function getTankSkinId(tank, options = {}) {
    if (tank?.team === 'enemy') {
        return tank.skinId || DEFAULT_ENEMY_TANK_SKIN_ID;
    }

    if (options.playerSkinId) {
        return options.playerSkinId;
    }

    const equippedSkin = TankCollection.getEquippedTank();
    return equippedSkin?.id || DEFAULT_PLAYER_TANK_SKIN_ID;
}

/**
 * Resolve the base sprite asset key for a tank team.
 * @param {{team?: string}|null} tank
 * @returns {string}
 */
export function getTankSpriteKey(tank) {
    if (tank?.team === 'enemy') {
        return 'tanks.enemy';
    }

    return getPlayerSpriteKey();
}

/**
 * Canonical turret pivot shared by render and projectile spawning.
 * @param {{x: number, y: number, team?: string, skinId?: string}} tank
 * @param {{playerSkinId?: string|null}} [options]
 * @returns {{x: number, y: number}}
 */
export function getTurretPivot(tank, options = {}) {
    const skinId = getTankSkinId(tank, options);
    const anchor = getTurretAnchorForSkin(skinId, {
        allowPlayerRuntimeFallback: tank?.team !== 'enemy'
    });

    return {
        x: tank.x + (anchor.anchorX - 32),
        y: (tank.y - 32) + anchor.anchorY
    };
}
