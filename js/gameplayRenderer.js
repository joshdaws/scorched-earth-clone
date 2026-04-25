/**
 * Render the active gameplay scene.
 *
 * This module owns visual ordering for the playing screen so main.js can stay
 * focused on state, input, and orchestration.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} config
 */
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

    renderBackground(ctx, width, height);
    renderTerrain(ctx);
    renderTerrainDerezEffects(ctx);
    renderFalloutZones(ctx);
    renderFireZones(ctx);
    renderTanks(ctx);
    renderTankShields(ctx);
    renderActiveProjectile(ctx);

    if (playerTank) {
        playerTank.angle = playerAim.angle;
        playerTank.power = playerAim.power;
    }

    renderHud(ctx, {
        playerTank,
        enemyTank,
        money,
        isPlayerTurn,
        phase,
        shooter,
        currentRound,
        difficulty: difficultyName
    });

    renderPauseButton(ctx);
    renderLevelEditorReturnButton(ctx);

    setTouchAimingEnabled(isPlayerTurn);
    if (isPlayerTurn) {
        renderTouchAiming(ctx, playerTank, currentTerrain);
    }

    renderAimingControls(ctx, {
        playerTank,
        angle: playerAim.angle,
        power: playerAim.power,
        canFire,
        isPlayerTurn,
        terrain: currentTerrain
    });

    if (hasShake) {
        ctx.restore();
    }

    renderScreenFlash(ctx, width, height);
    renderDebugOverlays(ctx);
    renderCrtEffects(ctx, width, height, crtParams);
}
