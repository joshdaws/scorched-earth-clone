/**
 * Shared tank visual helpers.
 * Centralizes sprite key selection and turret pivot math.
 */

import * as Assets from './assets.js';
import * as TankCollection from './tank-collection.js';
import { TANK } from './constants.js';

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
 * Canonical turret pivot shared by render and projectile spawning.
 * @param {{x: number, y: number}} tank
 * @returns {{x: number, y: number}}
 */
export function getTurretPivot(tank) {
    return {
        x: tank.x,
        y: tank.y - TANK.BODY_HEIGHT
    };
}
