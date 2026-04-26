/**
 * Render the main menu screen.
 *
 * The concrete drawing helpers remain injectable so main.js can keep existing
 * menu state ownership while the screen-level render flow lives in one module.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} config
 * @returns {{animationTime: number}}
 */
export function renderMenuScene(ctx, config) {
    const {
        animationTime,
        menuTransition,
        currentMenuLayout,
        updateMenuButtonPositions,
        width,
        height,
        calculateMenuLayout,
        titleSceneIsActive,
        clearTransparent,
        getViewportDimensions,
        getDevicePixelRatio,
        renderMenuBackground,
        drawSynthwaveText,
        drawNeonSubtitle,
        drawMenuMetricTile,
        menuButtons,
        getUnviewedCount,
        getNewTankCount,
        getDailyChallengeCompletionCounts,
        canClaimDailyReward,
        getTokenBalance,
        getBestRoundCount,
        getTotalStars,
        colors,
        setState,
        optionsOverlayVisible,
        renderOptionsOverlay,
        engagementUpdate,
        engagementRender,
        renderCrtEffects,
        getCrtFullscreenParams
    } = config;

    updateMenuButtonPositions();

    const nextAnimationTime = animationTime + 16;
    const pulseIntensity = (Math.sin(nextAnimationTime * 0.003) + 1) / 2;

    ctx.save();

    if (menuTransition.active) {
        const elapsed = performance.now() - menuTransition.startTime;
        const progress = Math.min(elapsed / menuTransition.duration, 1);

        if (menuTransition.fadeOut) {
            menuTransition.alpha = 1 - progress;
        } else {
            menuTransition.alpha = progress;
        }

        ctx.globalAlpha = menuTransition.alpha;

        if (progress >= 1 && menuTransition.fadeOut && menuTransition.targetState) {
            menuTransition.active = false;
            menuTransition.alpha = 1;
            setState(menuTransition.targetState);
            ctx.restore();
            return { animationTime: nextAnimationTime };
        }
    }

    if (titleSceneIsActive()) {
        clearTransparent();
    } else {
        renderMenuBackground(ctx);
    }

    const viewport = getViewportDimensions();
    const dpr = getDevicePixelRatio();

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const vignetteGradient = ctx.createRadialGradient(
        viewport.width / 2, viewport.height / 2, 0,
        viewport.width / 2, viewport.height / 2, Math.max(viewport.width, viewport.height) * 0.7
    );
    vignetteGradient.addColorStop(0, 'rgba(10, 10, 26, 0)');
    vignetteGradient.addColorStop(0.7, 'rgba(10, 10, 26, 0.2)');
    vignetteGradient.addColorStop(1, 'rgba(10, 10, 26, 0.5)');
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    ctx.restore();

    const layout = currentMenuLayout || calculateMenuLayout(height, width);
    const isCompact = layout.isCompact;
    const titleScale = layout.titleScale;

    const baseScorchedY = isCompact ? 100 : 120;
    const baseEarthY = isCompact ? 190 : 220;
    const baseSubtitleY = isCompact ? 260 : 300;

    const scorchedY = Math.round(baseScorchedY * titleScale);
    const earthY = Math.round(baseEarthY * titleScale);
    const subtitleY = Math.round(baseSubtitleY * titleScale);

    const scorchedFontSize = Math.round(120 * titleScale);
    const earthFontSize = Math.round(100 * titleScale);
    const subtitleFontSize = Math.round(44 * titleScale);

    drawSynthwaveText(ctx, 'SCORCHED', width / 2, scorchedY, scorchedFontSize, pulseIntensity);
    drawSynthwaveText(ctx, 'EARTH', width / 2, earthY, earthFontSize, pulseIntensity);
    drawNeonSubtitle(ctx, 'SYNTHWAVE EDITION', width / 2, subtitleY, subtitleFontSize, pulseIntensity);

    const unviewedAchievements = getUnviewedCount();
    const newTanks = getNewTankCount();

    menuButtons.start.render(ctx, pulseIntensity);
    menuButtons.highScores.render(ctx, pulseIntensity);
    menuButtons.achievements.renderWithBadge(ctx, pulseIntensity, unviewedAchievements);
    menuButtons.collection.renderWithBadge(ctx, pulseIntensity, newTanks);
    menuButtons.supplyDrop.render(ctx, pulseIntensity);
    menuButtons.options.render(ctx, pulseIntensity);

    const challengeCounts = getDailyChallengeCompletionCounts();
    const incompleteChallenges = challengeCounts.total - challengeCounts.completed;
    menuButtons.dailyChallenges.renderWithBadge(ctx, pulseIntensity, incompleteChallenges);

    const rewardClaimable = canClaimDailyReward();
    menuButtons.dailyRewards.renderWithDot(ctx, pulseIntensity, rewardClaimable);

    const tokenPadding = isCompact ? 15 : 25;
    const tokenCardWidth = isCompact ? 75 : 90;
    const tokenCardHeight = isCompact ? 50 : 60;

    drawMenuMetricTile(ctx, {
        x: width - tokenPadding - tokenCardWidth,
        y: height - tokenPadding - tokenCardHeight,
        width: tokenCardWidth,
        height: tokenCardHeight,
        accent: colors.NEON_CYAN,
        label: 'TOKENS',
        value: `${getTokenBalance()}`,
        icon: 'coin',
        pulseIntensity
    });

    const bestCardPadding = isCompact ? 15 : 25;
    const bestCardHeight = isCompact ? 40 : 50;
    const bestCardWidth = isCompact ? 90 : 110;
    const bestRound = getBestRoundCount();

    drawMenuMetricTile(ctx, {
        x: bestCardPadding,
        y: height - bestCardPadding - bestCardHeight,
        width: bestCardWidth,
        height: bestCardHeight,
        accent: colors.NEON_YELLOW,
        label: 'BEST RUN',
        value: bestRound > 0 ? `${bestRound} rounds` : '--',
        pulseIntensity
    });

    const starsCardWidth = isCompact ? 85 : 100;
    const starsCardHeight = isCompact ? 50 : 60;

    drawMenuMetricTile(ctx, {
        x: (width - starsCardWidth) / 2,
        y: height - tokenPadding - starsCardHeight,
        width: starsCardWidth,
        height: starsCardHeight,
        accent: colors.NEON_PINK,
        label: 'STARS',
        value: `${getTotalStars()}`,
        icon: 'star',
        pulseIntensity
    });

    ctx.restore();

    if (optionsOverlayVisible) {
        renderOptionsOverlay(ctx);
    }

    engagementUpdate(0.016);
    engagementRender(ctx);
    renderCrtEffects(ctx, width, height, getCrtFullscreenParams());

    return { animationTime: nextAnimationTime };
}
