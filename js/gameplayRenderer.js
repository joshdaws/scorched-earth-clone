/**
 * Render the active gameplay scene.
 *
 * This module owns visual ordering for the playing screen so main.js can stay
 * focused on state, input, and orchestration.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} config
 */
import { recordMeasure } from './performanceMetrics.js';

function measureRenderSection(name, renderFn) {
    const start = performance.now();
    try {
        return renderFn();
    } finally {
        recordMeasure(`render.${name}`, performance.now() - start);
    }
}

export function renderGameplayScene(ctx, config) {
    const {
        width,
        height,
        playerTank,
        enemyTank,
        playerAim,
        currentTerrain,
        currentRound,
        money,
        difficultyName,
        phase,
        isPlayerTurn,
        shooter,
        canFire,
        crtParams,
        getScreenShakeOffset,
        renderBackground,
        renderTerrain,
        renderTerrainDerezEffects,
        renderPuzzleObjects,
        renderFalloutZones,
        renderFireZones,
        renderTanks,
        renderTankShields,
        renderActiveProjectile,
        renderHud,
        renderPauseButton,
        renderLevelEditorReturnButton,
        setTouchAimingEnabled,
        renderTouchAiming,
        renderAimingControls,
        renderScreenFlash,
        renderDebugOverlays,
        renderCrtEffects
    } = config;

    const shakeOffset = getScreenShakeOffset();
    const hasShake = shakeOffset.x !== 0 || shakeOffset.y !== 0;
    if (hasShake) {
        ctx.save();
        ctx.translate(shakeOffset.x, shakeOffset.y);
    }

    measureRenderSection('background', () => renderBackground(ctx, width, height));
    measureRenderSection('terrain', () => renderTerrain(ctx));
    measureRenderSection('terrainDerezEffects', () => renderTerrainDerezEffects(ctx));
    if (renderPuzzleObjects) {
        measureRenderSection('puzzleObjects', () => renderPuzzleObjects(ctx));
    }
    measureRenderSection('falloutZones', () => renderFalloutZones(ctx));
    measureRenderSection('fireZones', () => renderFireZones(ctx));
    measureRenderSection('tanks', () => renderTanks(ctx));
    measureRenderSection('tankShields', () => renderTankShields(ctx));
    measureRenderSection('activeProjectile', () => renderActiveProjectile(ctx));

    if (playerTank) {
        playerTank.angle = playerAim.angle;
        playerTank.power = playerAim.power;
    }

    measureRenderSection('hud', () => renderHud(ctx, {
        playerTank,
        enemyTank,
        money,
        isPlayerTurn,
        phase,
        shooter,
        currentRound,
        difficulty: difficultyName
    }));

    measureRenderSection('pauseButton', () => renderPauseButton(ctx));
    measureRenderSection('levelEditorReturnButton', () => renderLevelEditorReturnButton(ctx));

    setTouchAimingEnabled(isPlayerTurn);
    if (isPlayerTurn) {
        measureRenderSection('touchAiming', () => renderTouchAiming(ctx, playerTank, currentTerrain));
    }

    measureRenderSection('aimingControls', () => renderAimingControls(ctx, {
        playerTank,
        angle: playerAim.angle,
        power: playerAim.power,
        canFire,
        isPlayerTurn,
        terrain: currentTerrain
    }));

    if (hasShake) {
        ctx.restore();
    }

    measureRenderSection('screenFlash', () => renderScreenFlash(ctx, width, height));
    measureRenderSection('debugOverlays', () => renderDebugOverlays(ctx));
    measureRenderSection('crtEffects', () => renderCrtEffects(ctx, width, height, crtParams));
}
