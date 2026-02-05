/**
 * Scorched Earth: Tank Forge (dev-only)
 *
 * URL: ?scene=tank-editor[&tank=<skinId>&family=<familyId>]
 */

import { COLORS, GAME_STATES, UI } from './constants.js';
import * as Renderer from './renderer.js';
import * as Game from './game.js';
import * as Input from './input.js';
import * as Sound from './sound.js';
import * as Music from './music.js';
import { getAllTanks, getTank, RARITY_ORDER } from './tank-skins.js';
import {
    TANK_EFFECT_TYPES,
    TANK_EDITOR_FAMILIES,
    cloneTankDesign,
    normalizeTankDesign
} from './tank-design-schema.js';
import {
    PLAYER_RUNTIME_OVERRIDE_KEY,
    buildTankDesignExportPack,
    getDraftOrDefaultTankDesign,
    importTankDesignPack,
    initTankDesignStore,
    serializeTankDesignExportPack,
    setDraftTankDesign
} from './tank-design-store.js';
import {
    enforceTurretAnchorGuardrail,
    TURRET_ANCHOR_BOUNDS
} from './tank-turret-constraints.js';
import {
    compileTankDesignToCanvas,
    setRuntimeTankDesign
} from './tank-design-runtime.js';
import { renderTankEffectsPreview } from './tank-effect-renderer.js';

const TOOL_TABS = {
    PARTS: 'parts',
    PAINT: 'paint',
    EFFECTS: 'effects',
    AGENTS: 'agents'
};

const PANEL_LAYOUT = {
    LEFT_WIDTH: 320,
    RIGHT_WIDTH: 320,
    MARGIN: 16,
    BUTTON_HEIGHT: 32,
    SMALL_BUTTON_WIDTH: 46
};

const EDITOR_CANVAS = {
    WIDTH: 64,
    HEIGHT: 32
};

const HULL_PRESETS = ['standard', 'wedge', 'heavy', 'scout'];
const TREAD_PRESETS = ['classic', 'segmented', 'hover', 'spiked'];
const WHEEL_PRESETS = ['dual', 'heavy', 'micro', null];
const BARREL_PRESETS = ['standard', 'heavy', 'needle', 'split'];

const PALETTE_LIBRARY = [
    '#1f2937',
    '#10b981',
    '#60a5fa',
    '#f59e0b',
    '#f43f5e',
    '#22d3ee',
    '#a78bfa',
    '#eab308',
    '#ef4444',
    '#14b8a6'
];

const AGENTS = [
    { id: 'retro-commander', label: 'RETRO COMMANDER' },
    { id: 'arcade-chaos', label: 'ARCADE CHAOS' },
    { id: 'legend-lab', label: 'LEGEND LAB' }
];

const state = {
    initialized: false,
    sceneEntrySkinId: null,
    sceneEntryFamilyId: null,
    selectedSkinId: 'standard',
    selectedFamilyId: TANK_EDITOR_FAMILIES.RETRO_COMMANDER,
    activeTab: TOOL_TABS.PARTS,
    design: null,
    paintColor: '#10b981',
    brushRadius: 1,
    isPainting: false,
    pointerX: 0,
    pointerY: 0,
    status: '',
    statusKind: 'info',
    statusUntil: 0,
    agentVariantIndex: 0,
    importInput: null,
    currentSpriteRect: null,
    resumeSnapshot: null
};

function getSortedSkins() {
    const all = getAllTanks();
    return all.sort((a, b) => {
        const rarityDiff = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
        if (rarityDiff !== 0) return rarityDiff;
        return a.name.localeCompare(b.name);
    });
}

function setStatus(message, kind = 'info', durationMs = 2500) {
    state.status = message;
    state.statusKind = kind;
    state.statusUntil = performance.now() + durationMs;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function ensurePaintLayer() {
    const existing = state.design.layers.find((layer) => layer.id === 'paint-layer');
    if (existing) return existing;

    const layer = {
        id: 'paint-layer',
        type: 'paint',
        blend: 'normal',
        visible: true,
        pixels: '[]'
    };
    state.design.layers.push(layer);
    return layer;
}

function decodeLayerPixels(layer) {
    if (!layer?.pixels) return [];

    try {
        const parsed = JSON.parse(layer.pixels);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function encodeLayerPixels(layer, pixels) {
    layer.pixels = JSON.stringify(pixels);
}

function paintAtPixel(px, py) {
    if (!state.design) return;
    if (px < 0 || px >= EDITOR_CANVAS.WIDTH || py < 0 || py >= EDITOR_CANVAS.HEIGHT) return;

    const layer = ensurePaintLayer();
    const pixels = decodeLayerPixels(layer);

    for (let oy = -state.brushRadius + 1; oy <= state.brushRadius - 1; oy++) {
        for (let ox = -state.brushRadius + 1; ox <= state.brushRadius - 1; ox++) {
            const x = px + ox;
            const y = py + oy;
            if (x < 0 || x >= EDITOR_CANVAS.WIDTH || y < 0 || y >= EDITOR_CANVAS.HEIGHT) continue;

            const index = pixels.findIndex((entry) => entry.x === x && entry.y === y);
            const next = { x, y, color: state.paintColor };

            if (index >= 0) {
                pixels[index] = next;
            } else {
                pixels.push(next);
            }
        }
    }

    encodeLayerPixels(layer, pixels);
    state.design.meta.updatedAt = Date.now();
}

function getSkinLabel() {
    const skin = getTank(state.selectedSkinId);
    if (!skin) return 'Unknown';
    return `${skin.name} (${skin.rarity})`;
}

function loadDesignForSelectedSkin() {
    const skin = getTank(state.selectedSkinId);
    if (!skin) return;

    const base = getDraftOrDefaultTankDesign({
        skinId: skin.id,
        rarity: skin.rarity,
        familyId: state.selectedFamilyId
    });

    state.design = normalizeTankDesign(base, {
        skinId: skin.id,
        rarity: skin.rarity,
        familyId: state.selectedFamilyId
    });

    state.selectedFamilyId = state.design.familyId;
}

function cycleSkin(direction) {
    const skins = getSortedSkins();
    const index = skins.findIndex((skin) => skin.id === state.selectedSkinId);
    if (index === -1) return;

    const nextIndex = clamp(index + direction, 0, skins.length - 1);
    state.selectedSkinId = skins[nextIndex].id;
    loadDesignForSelectedSkin();
}

function cyclePreset(key, presets) {
    const current = state.design.parts[key];
    const index = presets.findIndex((preset) => preset === current);
    const nextIndex = index === -1 ? 0 : (index + 1) % presets.length;
    state.design.parts[key] = presets[nextIndex];
    state.design.meta.updatedAt = Date.now();
}

function toggleEffect(effectType) {
    const existingIndex = state.design.effects.findIndex((effect) => effect.type === effectType);
    if (existingIndex >= 0) {
        state.design.effects.splice(existingIndex, 1);
    } else {
        state.design.effects.push({
            type: effectType,
            color: state.paintColor,
            intensity: 0.6,
            speed: 1.5
        });
    }
    state.design.meta.updatedAt = Date.now();
}

function setFamilyPreset(familyId) {
    state.selectedFamilyId = familyId;
    state.design.familyId = familyId;

    if (familyId === TANK_EDITOR_FAMILIES.RETRO_COMMANDER) {
        state.design.palette = ['#1f2937', '#22d3ee', '#64748b', '#f59e0b', '#ef4444'];
        state.design.effects = [{ type: 'scanline', color: '#22d3ee', intensity: 0.4, speed: 1.1 }];
        state.design.parts.hullPreset = 'standard';
        state.design.parts.treadPreset = 'classic';
        state.design.parts.barrelPreset = 'standard';
    } else if (familyId === TANK_EDITOR_FAMILIES.ARCADE_CHAOS) {
        state.design.palette = ['#7c3aed', '#f43f5e', '#f59e0b', '#22d3ee', '#f8fafc'];
        state.design.effects = [
            { type: 'neonPulse', color: '#f43f5e', intensity: 0.7, speed: 2.2 },
            { type: 'laserStripe', color: '#22d3ee', intensity: 0.6, speed: 1.8 }
        ];
        state.design.parts.hullPreset = 'wedge';
        state.design.parts.treadPreset = 'segmented';
        state.design.parts.barrelPreset = 'split';
    } else {
        state.design.palette = ['#111827', '#facc15', '#ec4899', '#22d3ee', '#f8fafc'];
        state.design.effects = [
            { type: 'neonPulse', color: '#facc15', intensity: 0.9, speed: 1.8 },
            { type: 'plasmaVent', color: '#ec4899', intensity: 0.8, speed: 2.4 },
            { type: 'sparkArc', color: '#22d3ee', intensity: 0.7, speed: 2.1 }
        ];
        state.design.parts.hullPreset = 'heavy';
        state.design.parts.treadPreset = 'spiked';
        state.design.parts.barrelPreset = 'heavy';
    }

    state.design.meta.updatedAt = Date.now();
}

function hashString(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function applyAgentVariant(agentId) {
    const seed = hashString(`${agentId}:${state.selectedSkinId}:${state.agentVariantIndex}`);
    state.agentVariantIndex = (state.agentVariantIndex + 1) % 3;

    const paletteOffset = seed % (PALETTE_LIBRARY.length - 5);
    state.design.palette = PALETTE_LIBRARY.slice(paletteOffset, paletteOffset + 5);

    state.design.parts.hullPreset = HULL_PRESETS[seed % HULL_PRESETS.length];
    state.design.parts.treadPreset = TREAD_PRESETS[(seed >> 2) % TREAD_PRESETS.length];
    state.design.parts.wheelPreset = WHEEL_PRESETS[(seed >> 4) % WHEEL_PRESETS.length];
    state.design.parts.barrelPreset = BARREL_PRESETS[(seed >> 6) % BARREL_PRESETS.length];

    const variantsByAgent = {
        'retro-commander': ['scanline', 'laserStripe'],
        'arcade-chaos': ['neonPulse', 'laserStripe', 'sparkArc'],
        'legend-lab': ['neonPulse', 'plasmaVent', 'sparkArc']
    };

    const effectTypes = variantsByAgent[agentId] || ['neonPulse'];
    state.design.effects = effectTypes.map((type, index) => ({
        type,
        color: state.design.palette[(index + 1) % state.design.palette.length],
        intensity: 0.5 + ((seed + index) % 5) * 0.1,
        speed: 1 + ((seed + index * 3) % 4) * 0.4
    }));

    state.design.familyId = agentId;
    state.design.meta.updatedAt = Date.now();
    setStatus(`Applied ${agentId} concept variant`, 'success', 1800);
}

function saveCurrentDesign() {
    if (!state.design) return;

    const guardrail = enforceTurretAnchorGuardrail(state.design);
    state.design = guardrail.design;

    const result = setDraftTankDesign(state.design);
    if (!result.success) {
        setStatus(`Save failed: ${result.errors?.[0] || 'Unknown error'}`, 'error', 3500);
        return;
    }

    if (guardrail.modified) {
        setStatus('Draft saved (turret anchor auto-corrected)', 'warn', 2600);
    } else {
        setStatus('Draft saved', 'success', 1800);
    }

    Sound.playClickSound();
}

function revertCurrentDesign() {
    loadDesignForSelectedSkin();
    setStatus('Reverted to saved draft/default', 'info', 1800);
    Sound.playClickSound();
}

function exportDesignPack() {
    const json = serializeTankDesignExportPack();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'tank-design-pack.v1.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    window.dispatchEvent(new CustomEvent('tankEditorExportRequested', {
        detail: buildTankDesignExportPack()
    }));

    setStatus('Exported tank-design-pack.v1.json', 'success', 2200);
    Sound.playClickSound();
}

function ensureImportInput() {
    if (state.importInput) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.addEventListener('change', async (event) => {
        const target = /** @type {HTMLInputElement} */ (event.target);
        const file = target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const result = importTankDesignPack(text, { merge: true });
            if (result.success) {
                loadDesignForSelectedSkin();
                setStatus(`Imported ${result.imported} designs`, 'success', 2600);
            } else {
                setStatus(`Import failed: ${result.errors[0] || 'Invalid pack'}`, 'error', 4200);
            }
        } catch (error) {
            setStatus(`Import failed: ${error.message}`, 'error', 4200);
        } finally {
            target.value = '';
        }
    });

    document.body.appendChild(input);
    state.importInput = input;
}

function triggerImport() {
    ensureImportInput();
    state.importInput?.click();
}

function playtestCurrentDesign() {
    const guardrail = enforceTurretAnchorGuardrail(state.design);
    state.design = guardrail.design;

    const runtimeResult = setRuntimeTankDesign(PLAYER_RUNTIME_OVERRIDE_KEY, state.design);
    if (!runtimeResult.success) {
        setStatus(`Playtest failed: ${runtimeResult.errors?.[0] || 'runtime error'}`, 'error', 3000);
        return;
    }

    state.resumeSnapshot = {
        skinId: state.selectedSkinId,
        familyId: state.selectedFamilyId,
        design: cloneTankDesign(state.design),
        tab: state.activeTab,
        paintColor: state.paintColor,
        brushRadius: state.brushRadius
    };

    window.dispatchEvent(new CustomEvent('tankEditorPlaytestRequested', {
        detail: {
            skinId: state.selectedSkinId,
            design: cloneTankDesign(state.design)
        }
    }));

    setStatus('Launching playtest...', 'info', 1400);
    Sound.playClickSound();
}

function getUiRects() {
    const width = Renderer.getWidth();
    const height = Renderer.getHeight();

    const leftPanel = {
        x: PANEL_LAYOUT.MARGIN,
        y: PANEL_LAYOUT.MARGIN,
        width: PANEL_LAYOUT.LEFT_WIDTH,
        height: height - PANEL_LAYOUT.MARGIN * 2
    };

    const rightPanel = {
        x: width - PANEL_LAYOUT.RIGHT_WIDTH - PANEL_LAYOUT.MARGIN,
        y: PANEL_LAYOUT.MARGIN,
        width: PANEL_LAYOUT.RIGHT_WIDTH,
        height: height - PANEL_LAYOUT.MARGIN * 2
    };

    const center = {
        x: leftPanel.x + leftPanel.width + PANEL_LAYOUT.MARGIN,
        y: PANEL_LAYOUT.MARGIN,
        width: width - leftPanel.width - rightPanel.width - PANEL_LAYOUT.MARGIN * 4,
        height: height - PANEL_LAYOUT.MARGIN * 2
    };

    const spriteScale = Math.max(8, Math.floor(Math.min(center.width / EDITOR_CANVAS.WIDTH, (center.height - 120) / EDITOR_CANVAS.HEIGHT)));
    const spriteWidth = EDITOR_CANVAS.WIDTH * spriteScale;
    const spriteHeight = EDITOR_CANVAS.HEIGHT * spriteScale;

    const spriteRect = {
        x: Math.round(center.x + (center.width - spriteWidth) / 2),
        y: Math.round(center.y + 72 + (center.height - 120 - spriteHeight) / 2),
        width: spriteWidth,
        height: spriteHeight,
        scale: spriteScale
    };

    state.currentSpriteRect = spriteRect;

    return {
        leftPanel,
        center,
        rightPanel,
        spriteRect
    };
}

function addButton(buttons, id, label, rect, action, active = false, color = COLORS.NEON_CYAN) {
    buttons.push({ id, label, rect, action, active, color });
}

function buildButtons(rects) {
    const buttons = [];

    let y = rects.leftPanel.y + 14;

    addButton(buttons, 'skin-prev', '<', {
        x: rects.leftPanel.x + 10,
        y,
        width: PANEL_LAYOUT.SMALL_BUTTON_WIDTH,
        height: PANEL_LAYOUT.BUTTON_HEIGHT
    }, () => cycleSkin(-1));

    addButton(buttons, 'skin-next', '>', {
        x: rects.leftPanel.x + rects.leftPanel.width - PANEL_LAYOUT.SMALL_BUTTON_WIDTH - 10,
        y,
        width: PANEL_LAYOUT.SMALL_BUTTON_WIDTH,
        height: PANEL_LAYOUT.BUTTON_HEIGHT
    }, () => cycleSkin(1));

    y += 46;

    AGENTS.forEach((family) => {
        const rect = {
            x: rects.leftPanel.x + 10,
            y,
            width: rects.leftPanel.width - 20,
            height: PANEL_LAYOUT.BUTTON_HEIGHT
        };
        addButton(buttons, `family-${family.id}`, family.label, rect, () => setFamilyPreset(family.id), state.selectedFamilyId === family.id, '#a78bfa');
        y += 38;
    });

    y += 6;

    Object.values(TOOL_TABS).forEach((tab) => {
        const rect = {
            x: rects.leftPanel.x + 10,
            y,
            width: rects.leftPanel.width - 20,
            height: PANEL_LAYOUT.BUTTON_HEIGHT
        };
        addButton(buttons, `tab-${tab}`, `TAB: ${tab.toUpperCase()}`, rect, () => {
            state.activeTab = tab;
            Sound.playClickSound();
        }, state.activeTab === tab, '#22d3ee');
        y += 36;
    });

    y += 8;

    if (state.activeTab === TOOL_TABS.PARTS) {
        addButton(buttons, 'parts-hull', `HULL: ${state.design.parts.hullPreset}`, {
            x: rects.leftPanel.x + 10,
            y,
            width: rects.leftPanel.width - 20,
            height: PANEL_LAYOUT.BUTTON_HEIGHT
        }, () => cyclePreset('hullPreset', HULL_PRESETS));
        y += 36;

        addButton(buttons, 'parts-tread', `TREAD: ${state.design.parts.treadPreset}`, {
            x: rects.leftPanel.x + 10,
            y,
            width: rects.leftPanel.width - 20,
            height: PANEL_LAYOUT.BUTTON_HEIGHT
        }, () => cyclePreset('treadPreset', TREAD_PRESETS));
        y += 36;

        addButton(buttons, 'parts-wheel', `WHEEL: ${state.design.parts.wheelPreset || 'none'}`, {
            x: rects.leftPanel.x + 10,
            y,
            width: rects.leftPanel.width - 20,
            height: PANEL_LAYOUT.BUTTON_HEIGHT
        }, () => cyclePreset('wheelPreset', WHEEL_PRESETS));
        y += 36;

        addButton(buttons, 'parts-barrel', `BARREL: ${state.design.parts.barrelPreset}`, {
            x: rects.leftPanel.x + 10,
            y,
            width: rects.leftPanel.width - 20,
            height: PANEL_LAYOUT.BUTTON_HEIGHT
        }, () => cyclePreset('barrelPreset', BARREL_PRESETS));
    }

    if (state.activeTab === TOOL_TABS.PAINT) {
        const swatchWidth = 28;
        const swatchGap = 6;
        PALETTE_LIBRARY.slice(0, 10).forEach((color, index) => {
            const col = index % 5;
            const row = Math.floor(index / 5);
            const rect = {
                x: rects.leftPanel.x + 10 + col * (swatchWidth + swatchGap),
                y: y + row * (swatchWidth + swatchGap),
                width: swatchWidth,
                height: swatchWidth
            };
            addButton(buttons, `swatch-${color}`, '', rect, () => {
                state.paintColor = color;
                Sound.playClickSound();
            }, state.paintColor === color, color);
        });

        y += 70;
        addButton(buttons, 'paint-brush', `BRUSH: ${state.brushRadius}px`, {
            x: rects.leftPanel.x + 10,
            y,
            width: rects.leftPanel.width - 20,
            height: PANEL_LAYOUT.BUTTON_HEIGHT
        }, () => {
            state.brushRadius = state.brushRadius === 1 ? 2 : 1;
            Sound.playClickSound();
        });
    }

    if (state.activeTab === TOOL_TABS.EFFECTS) {
        TANK_EFFECT_TYPES.forEach((effectType) => {
            const isEnabled = state.design.effects.some((effect) => effect.type === effectType);
            addButton(buttons, `effect-${effectType}`, `${isEnabled ? '[ON] ' : '[OFF] '}${effectType}`, {
                x: rects.leftPanel.x + 10,
                y,
                width: rects.leftPanel.width - 20,
                height: PANEL_LAYOUT.BUTTON_HEIGHT
            }, () => toggleEffect(effectType), isEnabled, '#f59e0b');
            y += 36;
        });
    }

    if (state.activeTab === TOOL_TABS.AGENTS) {
        AGENTS.forEach((agent) => {
            addButton(buttons, `agent-${agent.id}`, `SPIN: ${agent.label}`, {
                x: rects.leftPanel.x + 10,
                y,
                width: rects.leftPanel.width - 20,
                height: PANEL_LAYOUT.BUTTON_HEIGHT
            }, () => applyAgentVariant(agent.id), false, '#f472b6');
            y += 36;
        });
    }

    // Turret controls.
    const turretY = rects.leftPanel.y + rects.leftPanel.height - 172;
    addButton(buttons, 'turret-x-minus', 'X-', {
        x: rects.leftPanel.x + 10,
        y: turretY,
        width: 50,
        height: PANEL_LAYOUT.BUTTON_HEIGHT
    }, () => {
        state.design.turret.anchorX--;
    });
    addButton(buttons, 'turret-x-plus', 'X+', {
        x: rects.leftPanel.x + 64,
        y: turretY,
        width: 50,
        height: PANEL_LAYOUT.BUTTON_HEIGHT
    }, () => {
        state.design.turret.anchorX++;
    });
    addButton(buttons, 'turret-y-minus', 'Y-', {
        x: rects.leftPanel.x + 118,
        y: turretY,
        width: 50,
        height: PANEL_LAYOUT.BUTTON_HEIGHT
    }, () => {
        state.design.turret.anchorY--;
    });
    addButton(buttons, 'turret-y-plus', 'Y+', {
        x: rects.leftPanel.x + 172,
        y: turretY,
        width: 50,
        height: PANEL_LAYOUT.BUTTON_HEIGHT
    }, () => {
        state.design.turret.anchorY++;
    });

    // Action row.
    const actions = [
        { id: 'save', label: 'SAVE DRAFT', fn: saveCurrentDesign, color: '#10b981' },
        { id: 'revert', label: 'REVERT', fn: revertCurrentDesign, color: '#f59e0b' },
        { id: 'export', label: 'EXPORT PACK', fn: exportDesignPack, color: '#22d3ee' },
        { id: 'import', label: 'IMPORT PACK', fn: triggerImport, color: '#a78bfa' },
        { id: 'playtest', label: 'PLAYTEST', fn: playtestCurrentDesign, color: '#f43f5e' },
        { id: 'back', label: 'BACK TO MENU', fn: () => Game.setState(GAME_STATES.MENU), color: '#94a3b8' }
    ];

    const actionWidth = rects.center.width / actions.length - 8;
    const actionY = rects.center.y + rects.center.height - 44;
    actions.forEach((action, index) => {
        addButton(buttons, action.id, action.label, {
            x: rects.center.x + index * (actionWidth + 8),
            y: actionY,
            width: actionWidth,
            height: PANEL_LAYOUT.BUTTON_HEIGHT
        }, action.fn, false, action.color);
    });

    return buttons;
}

function isInsideRect(pos, rect) {
    return (
        pos.x >= rect.x &&
        pos.x <= rect.x + rect.width &&
        pos.y >= rect.y &&
        pos.y <= rect.y + rect.height
    );
}

function spriteCoordFromPointer(pos) {
    const rect = state.currentSpriteRect;
    if (!rect || !isInsideRect(pos, rect)) return null;

    const x = Math.floor((pos.x - rect.x) / rect.scale);
    const y = Math.floor((pos.y - rect.y) / rect.scale);

    return {
        x: clamp(x, 0, EDITOR_CANVAS.WIDTH - 1),
        y: clamp(y, 0, EDITOR_CANVAS.HEIGHT - 1)
    };
}

function handlePointerDown(pos) {
    state.pointerX = pos.x;
    state.pointerY = pos.y;

    const rects = getUiRects();
    const buttons = buildButtons(rects);

    const hit = buttons.find((button) => isInsideRect(pos, button.rect));
    if (hit) {
        hit.action();

        if (hit.id.startsWith('turret-')) {
            const guardrail = enforceTurretAnchorGuardrail(state.design);
            state.design = guardrail.design;
            if (guardrail.modified) {
                setStatus('Turret anchor constrained by guardrail', 'warn', 1400);
            }
        }

        return;
    }

    const spriteCoord = spriteCoordFromPointer(pos);
    if (!spriteCoord) return;

    if (state.activeTab === TOOL_TABS.PAINT) {
        state.isPainting = true;
        paintAtPixel(spriteCoord.x, spriteCoord.y);
        return;
    }

    // Outside paint tab, clicking canvas adjusts turret anchor.
    state.design.turret.anchorX = spriteCoord.x;
    state.design.turret.anchorY = spriteCoord.y;
    const guardrail = enforceTurretAnchorGuardrail(state.design);
    state.design = guardrail.design;
    if (guardrail.modified) {
        setStatus('Turret anchor auto-corrected to safe range', 'warn', 1800);
    }
}

function handlePointerMove(pos) {
    state.pointerX = pos.x;
    state.pointerY = pos.y;

    if (!state.isPainting || state.activeTab !== TOOL_TABS.PAINT) return;

    const spriteCoord = spriteCoordFromPointer(pos);
    if (!spriteCoord) return;

    paintAtPixel(spriteCoord.x, spriteCoord.y);
}

function handlePointerUp() {
    state.isPainting = false;
}

function handleKeyDown(keyCode) {
    if (Game.getState() !== GAME_STATES.TANK_EDITOR) return;

    // ESC
    if (keyCode === 27) {
        Game.setState(GAME_STATES.MENU);
        return;
    }

    // S
    if (keyCode === 83) {
        saveCurrentDesign();
        return;
    }

    // P
    if (keyCode === 80) {
        playtestCurrentDesign();
    }
}

function renderButton(ctx, button) {
    ctx.save();

    if (button.id.startsWith('swatch-')) {
        ctx.fillStyle = button.color;
    } else {
        ctx.fillStyle = button.active
            ? 'rgba(31, 41, 55, 0.95)'
            : 'rgba(15, 23, 42, 0.8)';
    }

    ctx.beginPath();
    ctx.roundRect(button.rect.x, button.rect.y, button.rect.width, button.rect.height, 6);
    ctx.fill();

    ctx.strokeStyle = button.color || COLORS.NEON_CYAN;
    ctx.lineWidth = button.active ? 2.5 : 1.5;
    ctx.stroke();

    if (button.label) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = `11px ${UI.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(button.label, button.rect.x + button.rect.width / 2, button.rect.y + button.rect.height / 2);
    }

    ctx.restore();
}

function renderLeftPanel(ctx, rects, buttons) {
    ctx.save();

    ctx.fillStyle = 'rgba(2, 6, 23, 0.86)';
    ctx.fillRect(rects.leftPanel.x, rects.leftPanel.y, rects.leftPanel.width, rects.leftPanel.height);

    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2;
    ctx.strokeRect(rects.leftPanel.x, rects.leftPanel.y, rects.leftPanel.width, rects.leftPanel.height);

    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold 16px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('TANK FORGE', rects.leftPanel.x + 10, rects.leftPanel.y + 6);

    ctx.font = `12px ${UI.FONT_FAMILY}`;
    ctx.fillStyle = '#93c5fd';
    ctx.fillText(getSkinLabel(), rects.leftPanel.x + 64, rects.leftPanel.y + 21);

    buttons.forEach((button) => {
        renderButton(ctx, button);
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = `11px ${UI.FONT_FAMILY}`;
    ctx.fillText(
        `Anchor X:${state.design.turret.anchorX} Y:${state.design.turret.anchorY} (bounds ${TURRET_ANCHOR_BOUNDS.minX}-${TURRET_ANCHOR_BOUNDS.maxX}, ${TURRET_ANCHOR_BOUNDS.minY}-${TURRET_ANCHOR_BOUNDS.maxY})`,
        rects.leftPanel.x + 10,
        rects.leftPanel.y + rects.leftPanel.height - 130
    );

    ctx.fillText('Paint tab: click-drag on sprite grid.', rects.leftPanel.x + 10, rects.leftPanel.y + rects.leftPanel.height - 110);
    ctx.fillText('Other tabs: click sprite to move turret anchor.', rects.leftPanel.x + 10, rects.leftPanel.y + rects.leftPanel.height - 94);

    ctx.restore();
}

function renderCenterPanel(ctx, rects) {
    ctx.save();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.fillRect(rects.center.x, rects.center.y, rects.center.width, rects.center.height);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(rects.center.x, rects.center.y, rects.center.width, rects.center.height);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = `bold 14px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PIXEL EDITOR (64x32)', rects.center.x + 12, rects.center.y + 10);

    const spriteCanvas = compileTankDesignToCanvas(state.design, performance.now());
    if (spriteCanvas) {
        const prevSmoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(spriteCanvas, rects.spriteRect.x, rects.spriteRect.y, rects.spriteRect.width, rects.spriteRect.height);
        ctx.imageSmoothingEnabled = prevSmoothing;
    }

    // Onion guide (silhouette)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1;
    const guideX = rects.spriteRect.x + 8 * rects.spriteRect.scale;
    const guideY = rects.spriteRect.y + 12 * rects.spriteRect.scale;
    ctx.strokeRect(guideX, guideY, 48 * rects.spriteRect.scale, 10 * rects.spriteRect.scale);

    // Pixel grid
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= EDITOR_CANVAS.WIDTH; x++) {
        const gx = rects.spriteRect.x + x * rects.spriteRect.scale;
        ctx.beginPath();
        ctx.moveTo(gx, rects.spriteRect.y);
        ctx.lineTo(gx, rects.spriteRect.y + rects.spriteRect.height);
        ctx.stroke();
    }
    for (let y = 0; y <= EDITOR_CANVAS.HEIGHT; y++) {
        const gy = rects.spriteRect.y + y * rects.spriteRect.scale;
        ctx.beginPath();
        ctx.moveTo(rects.spriteRect.x, gy);
        ctx.lineTo(rects.spriteRect.x + rects.spriteRect.width, gy);
        ctx.stroke();
    }

    // Turret anchor marker
    const anchorX = rects.spriteRect.x + (state.design.turret.anchorX + 0.5) * rects.spriteRect.scale;
    const anchorY = rects.spriteRect.y + (state.design.turret.anchorY + 0.5) * rects.spriteRect.scale;

    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(anchorX, anchorY, Math.max(5, rects.spriteRect.scale * 0.8), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(anchorX - 8, anchorY);
    ctx.lineTo(anchorX + 8, anchorY);
    ctx.moveTo(anchorX, anchorY - 8);
    ctx.lineTo(anchorX, anchorY + 8);
    ctx.stroke();

    ctx.restore();
}

function renderRightPanel(ctx, rects) {
    ctx.save();

    ctx.fillStyle = 'rgba(2, 6, 23, 0.86)';
    ctx.fillRect(rects.rightPanel.x, rects.rightPanel.y, rects.rightPanel.width, rects.rightPanel.height);

    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2;
    ctx.strokeRect(rects.rightPanel.x, rects.rightPanel.y, rects.rightPanel.width, rects.rightPanel.height);

    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold 14px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('LIVE PREVIEW', rects.rightPanel.x + 10, rects.rightPanel.y + 8);

    const previewRect = {
        x: rects.rightPanel.x + 22,
        y: rects.rightPanel.y + 50,
        width: rects.rightPanel.width - 44,
        height: 200
    };

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(previewRect.x, previewRect.y, previewRect.width, previewRect.height);

    const sprite = compileTankDesignToCanvas(state.design, performance.now());
    if (sprite) {
        const spriteW = 192;
        const spriteH = 96;
        const drawX = previewRect.x + (previewRect.width - spriteW) / 2;
        const drawY = previewRect.y + 58;

        const prevSmoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, drawX, drawY, spriteW, spriteH);
        ctx.imageSmoothingEnabled = prevSmoothing;

        const pivotX = drawX + (state.design.turret.anchorX / EDITOR_CANVAS.WIDTH) * spriteW;
        const pivotY = drawY + (state.design.turret.anchorY / EDITOR_CANVAS.HEIGHT) * spriteH;

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;

        for (let angle = 0; angle <= 180; angle += 45) {
            const radians = angle * (Math.PI / 180);
            const tipX = pivotX + Math.cos(radians) * 54;
            const tipY = pivotY - Math.sin(radians) * 54;
            ctx.globalAlpha = angle === 90 ? 0.85 : 0.35;
            ctx.beginPath();
            ctx.moveTo(pivotX, pivotY);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    renderTankEffectsPreview(ctx, {
        x: previewRect.x + 20,
        y: previewRect.y + 34,
        width: previewRect.width - 40,
        height: previewRect.height - 40
    }, state.design.effects, performance.now());

    ctx.fillStyle = '#94a3b8';
    ctx.font = `12px ${UI.FONT_FAMILY}`;
    ctx.fillText(`Family: ${state.design.familyId}`, rects.rightPanel.x + 10, rects.rightPanel.y + 274);
    ctx.fillText(`Effects: ${state.design.effects.length}`, rects.rightPanel.x + 10, rects.rightPanel.y + 294);
    ctx.fillText(`Palette: ${state.design.palette.join(', ')}`, rects.rightPanel.x + 10, rects.rightPanel.y + 314);

    if (state.status && performance.now() <= state.statusUntil) {
        const kindColor = state.statusKind === 'error'
            ? '#ef4444'
            : state.statusKind === 'warn'
                ? '#f59e0b'
                : state.statusKind === 'success'
                    ? '#10b981'
                    : '#38bdf8';
        ctx.fillStyle = kindColor;
        ctx.font = `bold 12px ${UI.FONT_FAMILY}`;
        ctx.fillText(state.status, rects.rightPanel.x + 10, rects.rightPanel.y + rects.rightPanel.height - 24);
    }

    ctx.restore();
}

export function render(ctx) {
    if (!state.design) return;

    const rects = getUiRects();
    const buttons = buildButtons(rects);

    ctx.save();
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, Renderer.getWidth(), Renderer.getHeight());

    renderLeftPanel(ctx, rects, buttons);
    renderCenterPanel(ctx, rects);
    renderRightPanel(ctx, rects);

    ctx.restore();
}

export function update() {
    if (state.status && performance.now() > state.statusUntil) {
        state.status = '';
    }
}

/**
 * Configure requested skin/family before entering scene.
 * @param {{skinId?:string|null,familyId?:string|null}|null} entry
 */
export function configureSceneEntry(entry) {
    state.sceneEntrySkinId = entry?.skinId || null;
    state.sceneEntryFamilyId = entry?.familyId || null;
}

function onEnter() {
    initTankDesignStore();

    if (state.resumeSnapshot) {
        state.selectedSkinId = state.resumeSnapshot.skinId;
        state.selectedFamilyId = state.resumeSnapshot.familyId;
        state.design = normalizeTankDesign(state.resumeSnapshot.design, {
            skinId: state.resumeSnapshot.skinId
        });
        state.activeTab = state.resumeSnapshot.tab || TOOL_TABS.PARTS;
        state.paintColor = state.resumeSnapshot.paintColor || '#10b981';
        state.brushRadius = state.resumeSnapshot.brushRadius || 1;
        state.resumeSnapshot = null;
        ensureImportInput();
        Music.playForState(GAME_STATES.MENU);
        setStatus('Returned from playtest with unsaved edits restored.', 'success', 1800);
        return;
    }

    const sortedSkins = getSortedSkins();
    const initialSkin = state.sceneEntrySkinId && getTank(state.sceneEntrySkinId)
        ? state.sceneEntrySkinId
        : sortedSkins[0]?.id || 'standard';

    state.selectedSkinId = initialSkin;

    if (state.sceneEntryFamilyId && Object.values(TANK_EDITOR_FAMILIES).includes(state.sceneEntryFamilyId)) {
        state.selectedFamilyId = state.sceneEntryFamilyId;
    }

    loadDesignForSelectedSkin();
    ensureImportInput();

    state.sceneEntrySkinId = null;
    state.sceneEntryFamilyId = null;

    Music.playForState(GAME_STATES.MENU);
    setStatus('Tank Forge ready. Save drafts and playtest from here.', 'info', 2200);
}

function onExit(toState) {
    state.isPainting = false;
    if (toState !== GAME_STATES.PLAYING) {
        state.resumeSnapshot = null;
    }
}

export function setup() {
    if (state.initialized) return;

    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.TANK_EDITOR) {
            handlePointerDown({ x, y });
        }
    });

    Input.onMouseMove((x, y) => {
        if (Game.getState() === GAME_STATES.TANK_EDITOR) {
            handlePointerMove({ x, y });
        }
    });

    Input.onMouseUp((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.TANK_EDITOR) {
            handlePointerUp();
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.TANK_EDITOR) {
            handlePointerDown({ x, y });
        }
    });

    Input.onTouchMove((x, y) => {
        if (Game.getState() === GAME_STATES.TANK_EDITOR) {
            handlePointerMove({ x, y });
        }
    });

    Input.onTouchEnd(() => {
        if (Game.getState() === GAME_STATES.TANK_EDITOR) {
            handlePointerUp();
        }
    });

    Input.onKeyDown((keyCode) => {
        handleKeyDown(keyCode);
    });

    Game.registerStateHandlers(GAME_STATES.TANK_EDITOR, {
        onEnter,
        onExit,
        update,
        render
    });

    state.initialized = true;
}
