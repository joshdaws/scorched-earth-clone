/**
 * Scorched Earth: Synthwave Edition
 * Level Editor Screen (dev/internal route)
 *
 * URL: ?scene=level-editor[&slot=worldX-levelY]
 */

import { COLORS, GAME_STATES, UI } from './constants.js';
import * as Renderer from './renderer.js';
import * as Game from './game.js';
import * as Input from './input.js';
import * as Sound from './sound.js';
import * as Music from './music.js';
import { LevelRegistry, LEVEL_CONSTANTS } from './levels.js';
import * as TitleScene from './titleScene/titleScene.js';
import {
    LEVEL_LAYOUT_DRAFT_STORAGE_KEY,
    LEVEL_LAYOUT_VERSION,
    createLayoutsExportPayload,
    enforcePlayerSlingGuardrail,
    getAllLevelIds,
    getCommittedLayoutsPayload,
    getGlobalLayoutConfig,
    getLayoutSampleCount,
    getSlotLayout,
    parseAndValidateLayoutsJson,
    serializeLayoutsPayload
} from './level-layouts.js';

const TOOL_IDS = {
    RAISE: 'raise',
    LOWER: 'lower',
    SMOOTH: 'smooth',
    FLATTEN: 'flatten'
};

const TOOL_LABELS = {
    [TOOL_IDS.RAISE]: 'RAISE',
    [TOOL_IDS.LOWER]: 'LOWER',
    [TOOL_IDS.SMOOTH]: 'SMOOTH',
    [TOOL_IDS.FLATTEN]: 'FLATTEN'
};

const UI_LAYOUT = {
    PANEL_WIDTH: 320,
    OUTER_MARGIN: 16,
    SECTION_GAP: 14,
    BUTTON_HEIGHT: 34,
    TOOL_BUTTON_HEIGHT: 34,
    SLOT_BUTTON_WIDTH: 50,
    SLOT_BUTTON_HEIGHT: 34,
    WORLD_BUTTON_WIDTH: 44,
    WORLD_BUTTON_HEIGHT: 30,
    WORLD_GAP: 6,
    SLOT_GAP: 8,
    BRUSH_MIN: 16,
    BRUSH_MAX: 96
};

const editorState = {
    initialized: false,
    sceneEntrySlotId: null,
    currentSlotId: 'world1-level1',
    currentWorld: 1,
    currentLevel: 1,
    activeTool: TOOL_IDS.RAISE,
    brushRadius: 42,
    brushStrength: 0.010,
    isPainting: false,
    isDraggingEnemy: false,
    flattenTargetNorm: null,
    pointerX: 0,
    pointerY: 0,
    statusMessage: '',
    statusKind: 'info',
    statusUntil: 0,
    autoCorrectedSlots: new Set(),
    workingSlots: {},
    drafts: {},
    globalConfig: getGlobalLayoutConfig(),
    importInput: null
};

/**
 * Build slot ID from world and level.
 * @param {number} world - World number
 * @param {number} level - Level number
 * @returns {string}
 */
function toSlotId(world, level) {
    return `world${world}-level${level}`;
}

/**
 * Check if point is inside rectangle.
 * @param {{x:number,y:number}} pos - Position
 * @param {{x:number,y:number,width:number,height:number}} rect - Rectangle
 * @returns {boolean}
 */
function isInsideRect(pos, rect) {
    return (
        pos.x >= rect.x &&
        pos.x <= rect.x + rect.width &&
        pos.y >= rect.y &&
        pos.y <= rect.y + rect.height
    );
}

/**
 * Clamp value to range.
 * @param {number} value - Input value
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {number}
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Clone slot layout.
 * @param {{terrainSamples:number[], enemyXNorm:number}} slot - Slot layout
 * @returns {{terrainSamples:number[], enemyXNorm:number}}
 */
function cloneSlot(slot) {
    return {
        terrainSamples: [...slot.terrainSamples],
        enemyXNorm: slot.enemyXNorm
    };
}

/**
 * Parse world/level from slot ID.
 * @param {string} slotId - Slot ID
 * @returns {{worldNum:number,levelNum:number}|null}
 */
function parseSlotId(slotId) {
    return LevelRegistry.parseLevelId(slotId);
}

/**
 * Set temporary status message.
 * @param {string} message - Message
 * @param {'info'|'warn'|'error'|'success'} [kind='info'] - Message type
 * @param {number} [durationMs=2500] - Duration in ms
 */
function setStatus(message, kind = 'info', durationMs = 2500) {
    editorState.statusMessage = message;
    editorState.statusKind = kind;
    editorState.statusUntil = performance.now() + durationMs;
}

/**
 * Get persistent local draft payload.
 * @returns {Record<string, {terrainSamples:number[], enemyXNorm:number}>}
 */
function loadDraftsFromStorage() {
    try {
        const raw = localStorage.getItem(LEVEL_LAYOUT_DRAFT_STORAGE_KEY);
        if (!raw) return {};

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return {};
        }

        const normalized = {};
        const slotIds = getAllLevelIds();
        for (const slotId of slotIds) {
            if (parsed[slotId]) {
                normalized[slotId] = getSlotLayout(slotId, {
                    slotOverride: parsed[slotId],
                    sampleCount: getLayoutSampleCount()
                });
            }
        }

        return normalized;
    } catch (error) {
        console.warn('[LevelEditor] Failed to load drafts:', error);
        return {};
    }
}

/**
 * Save draft payload to localStorage.
 */
function saveDraftsToStorage() {
    try {
        localStorage.setItem(LEVEL_LAYOUT_DRAFT_STORAGE_KEY, JSON.stringify(editorState.drafts));
    } catch (error) {
        console.warn('[LevelEditor] Failed to save drafts:', error);
        setStatus('Failed to save drafts (storage unavailable)', 'error', 3000);
    }
}

/**
 * Initialize working slot data from committed + drafts.
 */
function initializeWorkingData() {
    const committed = getCommittedLayoutsPayload();
    editorState.globalConfig = { ...committed.global };

    const merged = {};
    for (const slotId of getAllLevelIds()) {
        merged[slotId] = cloneSlot(committed.slots[slotId]);
    }

    editorState.drafts = loadDraftsFromStorage();
    for (const [slotId, draftSlot] of Object.entries(editorState.drafts)) {
        merged[slotId] = getSlotLayout(slotId, {
            slotOverride: draftSlot,
            sampleCount: getLayoutSampleCount()
        });
    }

    editorState.workingSlots = merged;
    editorState.initialized = true;
}

/**
 * Ensure file input exists for JSON import.
 */
function ensureImportInput() {
    if (editorState.importInput) return;

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
            importLayoutsFromJson(text);
        } catch (error) {
            setStatus(`Import failed: ${error.message}`, 'error', 3500);
        } finally {
            target.value = '';
        }
    });

    document.body.appendChild(input);
    editorState.importInput = input;
}

/**
 * Select active slot.
 * @param {string} slotId - Slot ID
 */
function selectSlot(slotId) {
    if (!editorState.workingSlots[slotId]) {
        return;
    }

    const parsed = parseSlotId(slotId);
    if (!parsed) return;

    editorState.currentSlotId = slotId;
    editorState.currentWorld = parsed.worldNum;
    editorState.currentLevel = parsed.levelNum;
}

/**
 * Get working slot for current selection.
 * @returns {{terrainSamples:number[], enemyXNorm:number}}
 */
function getCurrentSlot() {
    return editorState.workingSlots[editorState.currentSlotId];
}

/**
 * Save currently selected slot as a draft.
 */
function saveCurrentDraft() {
    const slot = cloneSlot(getCurrentSlot());

    const guardrailResult = enforcePlayerSlingGuardrail(
        slot,
        editorState.globalConfig,
        Renderer.getHeight(),
        Renderer.getWidth()
    );

    const finalSlot = guardrailResult.slotLayout;
    editorState.workingSlots[editorState.currentSlotId] = finalSlot;
    editorState.drafts[editorState.currentSlotId] = cloneSlot(finalSlot);
    saveDraftsToStorage();

    if (guardrailResult.modified) {
        editorState.autoCorrectedSlots.add(editorState.currentSlotId);
        setStatus(
            `Draft saved (auto-corrected to ${Math.round(guardrailResult.afterClearancePx)}px clearance)`,
            'warn',
            3200
        );
    } else {
        setStatus('Draft saved', 'success');
    }
}

/**
 * Revert current slot to committed data.
 */
function revertCurrentSlot() {
    editorState.workingSlots[editorState.currentSlotId] = getSlotLayout(editorState.currentSlotId);
    delete editorState.drafts[editorState.currentSlotId];
    editorState.autoCorrectedSlots.delete(editorState.currentSlotId);
    saveDraftsToStorage();
    setStatus('Slot reverted to committed baseline', 'info');
}

/**
 * Export full layout payload (all 60 slots) as JSON file.
 */
function exportLayoutsJson() {
    const payload = createLayoutsExportPayload({
        slotOverrides: editorState.workingSlots,
        globalOverride: editorState.globalConfig
    });

    const text = serializeLayoutsPayload(payload);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'layouts.v1.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    setStatus('Exported layouts.v1.json', 'success');
}

/**
 * Import full layout payload from JSON text.
 * Imported data is staged as local drafts.
 * @param {string} jsonText - JSON payload
 */
function importLayoutsFromJson(jsonText) {
    const parseResult = parseAndValidateLayoutsJson(jsonText, { allowPartial: false });

    if (!parseResult.valid || !parseResult.payload) {
        const firstError = parseResult.errors[0] || 'Unknown validation error';
        setStatus(`Import rejected: ${firstError}`, 'error', 4500);
        return;
    }

    const payload = parseResult.payload;

    if (payload.version !== LEVEL_LAYOUT_VERSION) {
        setStatus(`Import rejected: expected version ${LEVEL_LAYOUT_VERSION}`, 'error', 4500);
        return;
    }

    const importedSlots = {};
    for (const slotId of getAllLevelIds()) {
        importedSlots[slotId] = getSlotLayout(slotId, {
            slotOverride: payload.slots[slotId],
            sampleCount: payload.meta.sampleCount
        });
    }

    editorState.globalConfig = {
        playerAnchorXNorm: payload.global.playerAnchorXNorm,
        minSlingClearancePx: payload.global.minSlingClearancePx,
        autoFixRadiusPx: payload.global.autoFixRadiusPx
    };

    editorState.workingSlots = importedSlots;
    editorState.drafts = {};
    for (const [slotId, slot] of Object.entries(importedSlots)) {
        editorState.drafts[slotId] = cloneSlot(slot);
    }

    saveDraftsToStorage();
    setStatus('Imported payload and staged as local drafts', 'success', 3200);
}

/**
 * Dispatch playtest request for the current slot.
 */
function playtestCurrentSlot() {
    const guardrailResult = enforcePlayerSlingGuardrail(
        cloneSlot(getCurrentSlot()),
        editorState.globalConfig,
        Renderer.getHeight(),
        Renderer.getWidth()
    );

    editorState.workingSlots[editorState.currentSlotId] = guardrailResult.slotLayout;
    if (guardrailResult.modified) {
        editorState.autoCorrectedSlots.add(editorState.currentSlotId);
        setStatus('Applied sling clearance auto-fix before playtest', 'warn', 2800);
    }

    window.dispatchEvent(new CustomEvent('levelEditorPlaytestRequested', {
        detail: {
            levelId: editorState.currentSlotId,
            slotLayout: cloneSlot(guardrailResult.slotLayout)
        }
    }));
}

/**
 * Choose previous or next slot.
 * @param {number} direction - -1 for previous, +1 for next
 */
function shiftSlot(direction) {
    const levelIds = getAllLevelIds();
    const index = levelIds.indexOf(editorState.currentSlotId);
    if (index === -1) return;

    const nextIndex = clamp(index + direction, 0, levelIds.length - 1);
    selectSlot(levelIds[nextIndex]);
}

/**
 * Compute all UI rectangles used for rendering and hit testing.
 * @returns {object}
 */
function getUiRects() {
    const width = Renderer.getWidth();
    const height = Renderer.getHeight();

    const panel = {
        x: 0,
        y: 0,
        width: UI_LAYOUT.PANEL_WIDTH,
        height
    };

    const preview = {
        x: UI_LAYOUT.PANEL_WIDTH + UI_LAYOUT.OUTER_MARGIN,
        y: UI_LAYOUT.OUTER_MARGIN,
        width: Math.max(220, width - UI_LAYOUT.PANEL_WIDTH - UI_LAYOUT.OUTER_MARGIN * 2),
        height: Math.max(220, height - UI_LAYOUT.OUTER_MARGIN * 2)
    };

    const worldButtons = [];
    const worldStartX = 20;
    const worldY = 68;
    for (let world = 1; world <= LEVEL_CONSTANTS.WORLDS; world++) {
        worldButtons.push({
            world,
            rect: {
                x: worldStartX + (world - 1) * (UI_LAYOUT.WORLD_BUTTON_WIDTH + UI_LAYOUT.WORLD_GAP),
                y: worldY,
                width: UI_LAYOUT.WORLD_BUTTON_WIDTH,
                height: UI_LAYOUT.WORLD_BUTTON_HEIGHT
            }
        });
    }

    const slotButtons = [];
    const slotStartX = 20;
    const slotStartY = 114;
    for (let i = 0; i < 10; i++) {
        const level = i + 1;
        const col = i % 5;
        const row = Math.floor(i / 5);

        slotButtons.push({
            level,
            rect: {
                x: slotStartX + col * (UI_LAYOUT.SLOT_BUTTON_WIDTH + UI_LAYOUT.SLOT_GAP),
                y: slotStartY + row * (UI_LAYOUT.SLOT_BUTTON_HEIGHT + UI_LAYOUT.SLOT_GAP),
                width: UI_LAYOUT.SLOT_BUTTON_WIDTH,
                height: UI_LAYOUT.SLOT_BUTTON_HEIGHT
            }
        });
    }

    const tools = [
        TOOL_IDS.RAISE,
        TOOL_IDS.LOWER,
        TOOL_IDS.SMOOTH,
        TOOL_IDS.FLATTEN
    ];

    const toolButtons = [];
    const toolStartY = 226;
    for (let i = 0; i < tools.length; i++) {
        toolButtons.push({
            tool: tools[i],
            rect: {
                x: 20,
                y: toolStartY + i * (UI_LAYOUT.TOOL_BUTTON_HEIGHT + 6),
                width: 132,
                height: UI_LAYOUT.TOOL_BUTTON_HEIGHT
            }
        });
    }

    const brushMinus = { x: 20, y: 378, width: 36, height: 32 };
    const brushPlus = { x: 116, y: 378, width: 36, height: 32 };

    const actions = [
        { id: 'save', label: 'SAVE DRAFT' },
        { id: 'revert', label: 'REVERT SLOT' },
        { id: 'import', label: 'IMPORT JSON' },
        { id: 'export', label: 'EXPORT JSON' },
        { id: 'playtest', label: 'PLAYTEST DRAFT' },
        { id: 'back', label: 'BACK TO MENU' }
    ];

    const actionButtons = [];
    const actionStartY = 438;
    for (let i = 0; i < actions.length; i++) {
        actionButtons.push({
            ...actions[i],
            rect: {
                x: 20,
                y: actionStartY + i * (UI_LAYOUT.BUTTON_HEIGHT + 8),
                width: 174,
                height: UI_LAYOUT.BUTTON_HEIGHT
            }
        });
    }

    const prevButton = { x: 206, y: 112, width: 44, height: 30 };
    const nextButton = { x: 258, y: 112, width: 44, height: 30 };

    return {
        panel,
        preview,
        worldButtons,
        slotButtons,
        toolButtons,
        brushMinus,
        brushPlus,
        actionButtons,
        prevButton,
        nextButton
    };
}

/**
 * Convert preview-space x to normalized x.
 * @param {number} x - X position in design space
 * @param {{x:number,width:number}} preview - Preview rect
 * @returns {number}
 */
function toXNorm(x, preview) {
    const t = (x - preview.x) / preview.width;
    return clamp(t, 0, 1);
}

/**
 * Convert preview-space y to normalized terrain height.
 * @param {number} y - Y position in design space
 * @param {{y:number,height:number}} preview - Preview rect
 * @returns {number}
 */
function toHeightNorm(y, preview) {
    const fromBottom = (preview.y + preview.height - y) / preview.height;
    return clamp(fromBottom, 0, 1);
}

/**
 * Sample terrain height at normalized x.
 * @param {number[]} samples - Terrain samples
 * @param {number} xNorm - Normalized x
 * @returns {number}
 */
function sampleHeightAtXNorm(samples, xNorm) {
    const sampleCount = samples.length;
    const position = clamp(xNorm, 0, 1) * (sampleCount - 1);
    const left = Math.floor(position);
    const right = Math.min(sampleCount - 1, left + 1);
    const blend = position - left;
    return samples[left] * (1 - blend) + samples[right] * blend;
}

/**
 * Apply active terrain tool at a pointer position.
 * @param {{x:number,y:number}} pos - Pointer position
 * @param {boolean} isInitial - Whether this is the first pointer-down application
 */
function applyToolAtPointer(pos, isInitial) {
    const rects = getUiRects();
    if (!isInsideRect(pos, rects.preview)) return;

    const slot = getCurrentSlot();
    const samples = slot.terrainSamples;
    const sampleCount = samples.length;
    const centerNorm = toXNorm(pos.x, rects.preview);
    const centerIndex = Math.round(centerNorm * (sampleCount - 1));
    const radiusSamples = Math.max(1, Math.round((editorState.brushRadius / rects.preview.width) * (sampleCount - 1)));

    if (editorState.activeTool === TOOL_IDS.FLATTEN && isInitial) {
        editorState.flattenTargetNorm = toHeightNorm(pos.y, rects.preview);
    }

    const next = [...samples];

    for (let i = Math.max(0, centerIndex - radiusSamples); i <= Math.min(sampleCount - 1, centerIndex + radiusSamples); i++) {
        const distanceNorm = Math.abs(i - centerIndex) / radiusSamples;
        if (distanceNorm > 1) continue;

        const falloff = 1 - distanceNorm * distanceNorm;

        if (editorState.activeTool === TOOL_IDS.RAISE) {
            next[i] = clamp(next[i] + editorState.brushStrength * falloff, 0, 1);
        } else if (editorState.activeTool === TOOL_IDS.LOWER) {
            next[i] = clamp(next[i] - editorState.brushStrength * falloff, 0, 1);
        } else if (editorState.activeTool === TOOL_IDS.SMOOTH) {
            if (i <= 0 || i >= sampleCount - 1) continue;
            const average = (samples[i - 1] + samples[i] + samples[i + 1]) / 3;
            const blend = 0.35 * falloff;
            next[i] = clamp(samples[i] * (1 - blend) + average * blend, 0, 1);
        } else if (editorState.activeTool === TOOL_IDS.FLATTEN) {
            const target = editorState.flattenTargetNorm ?? toHeightNorm(pos.y, rects.preview);
            const blend = 0.45 * falloff;
            next[i] = clamp(samples[i] * (1 - blend) + target * blend, 0, 1);
        }
    }

    slot.terrainSamples = next;
}

/**
 * Update enemy spawn x from pointer drag.
 * @param {{x:number,y:number}} pos - Pointer position
 */
function dragEnemyToPointer(pos) {
    const rects = getUiRects();
    if (!isInsideRect(pos, rects.preview)) return;

    const slot = getCurrentSlot();
    const minDistanceNorm = 300 / Math.max(1, Renderer.getWidth());
    const minEnemyXNorm = clamp(editorState.globalConfig.playerAnchorXNorm + minDistanceNorm, 0, 1);

    slot.enemyXNorm = clamp(toXNorm(pos.x, rects.preview), minEnemyXNorm, 0.98);
}

/**
 * Hit test panel controls.
 * @param {{x:number,y:number}} pos - Pointer position
 * @returns {{kind:string,id?:string,world?:number,level?:number}|null}
 */
function hitTestPanel(pos) {
    const rects = getUiRects();

    for (const entry of rects.worldButtons) {
        if (isInsideRect(pos, entry.rect)) {
            return { kind: 'world', world: entry.world };
        }
    }

    for (const entry of rects.slotButtons) {
        if (isInsideRect(pos, entry.rect)) {
            return { kind: 'slot', level: entry.level };
        }
    }

    for (const entry of rects.toolButtons) {
        if (isInsideRect(pos, entry.rect)) {
            return { kind: 'tool', id: entry.tool };
        }
    }

    if (isInsideRect(pos, rects.brushMinus)) {
        return { kind: 'brush', id: 'minus' };
    }

    if (isInsideRect(pos, rects.brushPlus)) {
        return { kind: 'brush', id: 'plus' };
    }

    if (isInsideRect(pos, rects.prevButton)) {
        return { kind: 'slot-shift', id: 'prev' };
    }

    if (isInsideRect(pos, rects.nextButton)) {
        return { kind: 'slot-shift', id: 'next' };
    }

    for (const action of rects.actionButtons) {
        if (isInsideRect(pos, action.rect)) {
            return { kind: 'action', id: action.id };
        }
    }

    return null;
}

/**
 * Execute panel interaction.
 * @param {{kind:string,id?:string,world?:number,level?:number}} hit - Hit-test result
 */
function handlePanelInteraction(hit) {
    if (!hit) return;

    if (hit.kind === 'world' && hit.world) {
        editorState.currentWorld = hit.world;
        selectSlot(toSlotId(editorState.currentWorld, editorState.currentLevel));
        Sound.playClickSound();
        return;
    }

    if (hit.kind === 'slot' && hit.level) {
        selectSlot(toSlotId(editorState.currentWorld, hit.level));
        Sound.playClickSound();
        return;
    }

    if (hit.kind === 'tool' && hit.id) {
        editorState.activeTool = hit.id;
        Sound.playClickSound();
        return;
    }

    if (hit.kind === 'brush') {
        if (hit.id === 'minus') {
            editorState.brushRadius = clamp(editorState.brushRadius - 8, UI_LAYOUT.BRUSH_MIN, UI_LAYOUT.BRUSH_MAX);
        } else {
            editorState.brushRadius = clamp(editorState.brushRadius + 8, UI_LAYOUT.BRUSH_MIN, UI_LAYOUT.BRUSH_MAX);
        }
        Sound.playClickSound();
        return;
    }

    if (hit.kind === 'slot-shift') {
        shiftSlot(hit.id === 'prev' ? -1 : 1);
        Sound.playClickSound();
        return;
    }

    if (hit.kind === 'action') {
        Sound.playClickSound();

        switch (hit.id) {
            case 'save':
                saveCurrentDraft();
                return;
            case 'revert':
                revertCurrentSlot();
                return;
            case 'import':
                ensureImportInput();
                editorState.importInput?.click();
                return;
            case 'export':
                exportLayoutsJson();
                return;
            case 'playtest':
                playtestCurrentSlot();
                return;
            case 'back':
                Game.setState(GAME_STATES.MENU);
                return;
            default:
                return;
        }
    }
}

/**
 * Handle pointer down in level editor.
 * @param {{x:number,y:number}} pos - Pointer position
 */
function handlePointerDown(pos) {
    editorState.pointerX = pos.x;
    editorState.pointerY = pos.y;

    const hit = hitTestPanel(pos);
    if (hit) {
        handlePanelInteraction(hit);
        return;
    }

    const rects = getUiRects();
    if (!isInsideRect(pos, rects.preview)) {
        return;
    }

    const slot = getCurrentSlot();
    const enemyX = rects.preview.x + slot.enemyXNorm * rects.preview.width;
    const enemyYNorm = sampleHeightAtXNorm(slot.terrainSamples, slot.enemyXNorm);
    const enemyY = rects.preview.y + rects.preview.height - enemyYNorm * rects.preview.height;

    const dx = pos.x - enemyX;
    const dy = pos.y - enemyY;
    const enemyHandleRadius = 14;

    if (Math.sqrt(dx * dx + dy * dy) <= enemyHandleRadius) {
        editorState.isDraggingEnemy = true;
        return;
    }

    editorState.isPainting = true;
    applyToolAtPointer(pos, true);
}

/**
 * Handle pointer move in level editor.
 * @param {{x:number,y:number}} pos - Pointer position
 */
function handlePointerMove(pos) {
    editorState.pointerX = pos.x;
    editorState.pointerY = pos.y;

    if (editorState.isDraggingEnemy) {
        dragEnemyToPointer(pos);
        return;
    }

    if (editorState.isPainting) {
        applyToolAtPointer(pos, false);
    }
}

/**
 * Handle pointer up in level editor.
 */
function handlePointerUp() {
    editorState.isPainting = false;
    editorState.isDraggingEnemy = false;
    editorState.flattenTargetNorm = null;
}

/**
 * Handle keyboard shortcuts.
 * @param {string} keyCode - key code
 * @param {KeyboardEvent} event - original event
 */
function handleKeyDown(keyCode, event) {
    if (Game.getState() !== GAME_STATES.LEVEL_EDITOR) return;

    if ((event.metaKey || event.ctrlKey) && keyCode === 'KeyS') {
        event.preventDefault();
        saveCurrentDraft();
        return;
    }

    if (keyCode === 'BracketLeft') {
        shiftSlot(-1);
        return;
    }

    if (keyCode === 'BracketRight') {
        shiftSlot(1);
        return;
    }

    if (keyCode === 'Digit1') {
        editorState.activeTool = TOOL_IDS.RAISE;
    } else if (keyCode === 'Digit2') {
        editorState.activeTool = TOOL_IDS.LOWER;
    } else if (keyCode === 'Digit3') {
        editorState.activeTool = TOOL_IDS.SMOOTH;
    } else if (keyCode === 'Digit4') {
        editorState.activeTool = TOOL_IDS.FLATTEN;
    } else if (keyCode === 'KeyP') {
        playtestCurrentSlot();
    }
}

/**
 * Render panel button.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {{x:number,y:number,width:number,height:number}} rect - Button rectangle
 * @param {string} label - Button text
 * @param {boolean} active - Active state
 * @param {string} [activeColor] - Active border color
 */
function renderButton(ctx, rect, label, active, activeColor = COLORS.NEON_CYAN) {
    ctx.save();

    ctx.fillStyle = active ? 'rgba(5, 217, 232, 0.16)' : 'rgba(10, 10, 26, 0.85)';
    ctx.strokeStyle = active ? activeColor : 'rgba(136, 136, 153, 0.65)';
    ctx.lineWidth = active ? 2.5 : 1.2;

    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = active ? '#ffffff' : '#d0d0df';
    ctx.font = `bold 12px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);

    ctx.restore();
}

/**
 * Render left-side editor panel.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {ReturnType<typeof getUiRects>} rects - UI rectangles
 */
function renderPanel(ctx, rects) {
    ctx.save();

    // Panel background.
    ctx.fillStyle = 'rgba(6, 6, 14, 0.95)';
    ctx.fillRect(rects.panel.x, rects.panel.y, rects.panel.width, rects.panel.height);

    // Header.
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = `bold 20px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('LEVEL EDITOR', 20, 16);

    ctx.fillStyle = '#b8b8c8';
    ctx.font = `12px ${UI.FONT_FAMILY}`;
    ctx.fillText('URL-only dev route', 20, 40);

    // World selectors.
    ctx.fillStyle = '#d8d8e8';
    ctx.font = `bold 12px ${UI.FONT_FAMILY}`;
    ctx.fillText('WORLD', 20, 54);

    for (const entry of rects.worldButtons) {
        renderButton(ctx, entry.rect, `${entry.world}`, entry.world === editorState.currentWorld);
    }

    // Slot selectors.
    ctx.fillStyle = '#d8d8e8';
    ctx.fillText('LEVEL SLOT', 20, 98);

    renderButton(ctx, rects.prevButton, '<', false);
    renderButton(ctx, rects.nextButton, '>', false);

    for (const entry of rects.slotButtons) {
        const isActive = entry.level === editorState.currentLevel;
        renderButton(ctx, entry.rect, `${entry.level}`, isActive, COLORS.NEON_PINK);
    }

    const slotLabel = `Slot: ${editorState.currentSlotId}`;
    ctx.fillStyle = COLORS.NEON_YELLOW;
    ctx.font = `bold 12px ${UI.FONT_FAMILY}`;
    ctx.fillText(slotLabel, 20, 196);

    // Tools.
    ctx.fillStyle = '#d8d8e8';
    ctx.fillText('TERRAIN TOOLS', 20, 210);

    for (const entry of rects.toolButtons) {
        renderButton(
            ctx,
            entry.rect,
            TOOL_LABELS[entry.tool],
            editorState.activeTool === entry.tool,
            COLORS.NEON_YELLOW
        );
    }

    // Brush controls.
    ctx.fillStyle = '#d8d8e8';
    ctx.fillText('BRUSH SIZE', 20, 362);
    renderButton(ctx, rects.brushMinus, '-', false);
    renderButton(ctx, rects.brushPlus, '+', false);

    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = `bold 14px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(editorState.brushRadius)}px`, 86, 394);

    // Action buttons.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#d8d8e8';
    ctx.font = `bold 12px ${UI.FONT_FAMILY}`;
    ctx.fillText('ACTIONS', 20, 422);

    for (const action of rects.actionButtons) {
        const isPlaytest = action.id === 'playtest';
        const isDanger = action.id === 'revert';
        renderButton(
            ctx,
            action.rect,
            action.label,
            false,
            isPlaytest ? COLORS.NEON_YELLOW : (isDanger ? COLORS.NEON_PINK : COLORS.NEON_CYAN)
        );
    }

    // Status line.
    if (editorState.statusMessage && performance.now() <= editorState.statusUntil) {
        const statusColor = editorState.statusKind === 'error'
            ? '#ff4f7b'
            : editorState.statusKind === 'warn'
                ? COLORS.NEON_YELLOW
                : editorState.statusKind === 'success'
                    ? '#78ff8a'
                    : '#d8d8e8';

        ctx.fillStyle = statusColor;
        ctx.font = `11px ${UI.FONT_FAMILY}`;
        ctx.fillText(editorState.statusMessage, 20, rects.panel.height - 22);
    }

    ctx.restore();
}

/**
 * Render terrain + spawn preview.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {ReturnType<typeof getUiRects>} rects - UI rectangles
 */
function renderPreview(ctx, rects) {
    const slot = getCurrentSlot();
    const samples = slot.terrainSamples;

    ctx.save();

    // Preview background.
    ctx.fillStyle = '#101025';
    ctx.fillRect(rects.preview.x, rects.preview.y, rects.preview.width, rects.preview.height);

    // Grid overlay for sculpting context.
    ctx.strokeStyle = 'rgba(40, 44, 78, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
        const y = rects.preview.y + (i / 8) * rects.preview.height;
        ctx.beginPath();
        ctx.moveTo(rects.preview.x, y);
        ctx.lineTo(rects.preview.x + rects.preview.width, y);
        ctx.stroke();
    }

    // Terrain polygon.
    ctx.beginPath();
    ctx.moveTo(rects.preview.x, rects.preview.y + rects.preview.height);

    for (let i = 0; i < samples.length; i++) {
        const xNorm = i / (samples.length - 1);
        const x = rects.preview.x + xNorm * rects.preview.width;
        const y = rects.preview.y + rects.preview.height - samples[i] * rects.preview.height;
        ctx.lineTo(x, y);
    }

    ctx.lineTo(rects.preview.x + rects.preview.width, rects.preview.y + rects.preview.height);
    ctx.closePath();

    const terrainGradient = ctx.createLinearGradient(
        rects.preview.x,
        rects.preview.y,
        rects.preview.x,
        rects.preview.y + rects.preview.height
    );
    terrainGradient.addColorStop(0, 'rgba(26, 26, 46, 0.95)');
    terrainGradient.addColorStop(1, 'rgba(45, 27, 78, 0.98)');

    ctx.fillStyle = terrainGradient;
    ctx.fill();

    ctx.strokeStyle = COLORS.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Player anchor marker (fixed globally).
    const playerX = rects.preview.x + editorState.globalConfig.playerAnchorXNorm * rects.preview.width;
    const playerHeightNorm = sampleHeightAtXNorm(samples, editorState.globalConfig.playerAnchorXNorm);
    const playerY = rects.preview.y + rects.preview.height - playerHeightNorm * rects.preview.height;

    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.beginPath();
    ctx.arc(playerX, playerY - 8, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 11px ${UI.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('P', playerX, playerY - 8);

    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = `11px ${UI.FONT_FAMILY}`;
    ctx.fillText('LOCKED', playerX, playerY - 24);

    // Enemy spawn marker (editable).
    const enemyX = rects.preview.x + slot.enemyXNorm * rects.preview.width;
    const enemyHeightNorm = sampleHeightAtXNorm(samples, slot.enemyXNorm);
    const enemyY = rects.preview.y + rects.preview.height - enemyHeightNorm * rects.preview.height;

    ctx.fillStyle = COLORS.NEON_PINK;
    ctx.beginPath();
    ctx.arc(enemyX, enemyY - 8, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 11px ${UI.FONT_FAMILY}`;
    ctx.fillText('E', enemyX, enemyY - 8);

    // Sling clearance readout.
    const playerClearancePx = playerHeightNorm * Renderer.getHeight() + 16;
    const requiredClearancePx = editorState.globalConfig.minSlingClearancePx;
    const clearanceSafe = playerClearancePx >= requiredClearancePx;

    ctx.fillStyle = clearanceSafe ? '#78ff8a' : '#ff4f7b';
    ctx.textAlign = 'left';
    ctx.font = `bold 13px ${UI.FONT_FAMILY}`;
    ctx.fillText(
        `Sling clearance: ${Math.round(playerClearancePx)}px / ${Math.round(requiredClearancePx)}px`,
        rects.preview.x + 14,
        rects.preview.y + 14
    );

    // Auto-correct indicator.
    if (editorState.autoCorrectedSlots.has(editorState.currentSlotId)) {
        ctx.fillStyle = COLORS.NEON_YELLOW;
        ctx.font = `12px ${UI.FONT_FAMILY}`;
        ctx.fillText('Auto-corrected for slingshot safety', rects.preview.x + 14, rects.preview.y + 34);
    }

    // Brush preview.
    const pointer = { x: editorState.pointerX, y: editorState.pointerY };
    if (isInsideRect(pointer, rects.preview) && !editorState.isDraggingEnemy) {
        ctx.strokeStyle = editorState.activeTool === TOOL_IDS.LOWER ? COLORS.NEON_PINK : COLORS.NEON_YELLOW;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, editorState.brushRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.restore();
}

/**
 * Render level editor screen.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function render(ctx) {
    const rects = getUiRects();

    ctx.save();
    ctx.fillStyle = '#080812';
    ctx.fillRect(0, 0, Renderer.getWidth(), Renderer.getHeight());

    renderPreview(ctx, rects);
    renderPanel(ctx, rects);

    ctx.restore();
}

/**
 * Update loop.
 */
export function update() {
    if (editorState.statusMessage && performance.now() > editorState.statusUntil) {
        editorState.statusMessage = '';
    }
}

/**
 * Configure level editor entry slot before entering state.
 * @param {string|null} slotId - Optional slot ID
 */
export function configureSceneEntry(slotId) {
    editorState.sceneEntrySlotId = slotId;
}

/**
 * Get currently selected slot ID.
 * @returns {string}
 */
export function getCurrentSlotId() {
    return editorState.currentSlotId;
}

/**
 * Setup level editor state and input handlers.
 */
export function setup() {
    Input.onMouseDown((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.LEVEL_EDITOR) {
            handlePointerDown({ x, y });
        }
    });

    Input.onMouseMove((x, y) => {
        if (Game.getState() === GAME_STATES.LEVEL_EDITOR) {
            handlePointerMove({ x, y });
        }
    });

    Input.onMouseUp((x, y, button) => {
        if (button === 0 && Game.getState() === GAME_STATES.LEVEL_EDITOR) {
            handlePointerUp();
        }
    });

    Input.onTouchStart((x, y) => {
        if (Game.getState() === GAME_STATES.LEVEL_EDITOR) {
            handlePointerDown({ x, y });
        }
    });

    Input.onTouchMove((x, y) => {
        if (Game.getState() === GAME_STATES.LEVEL_EDITOR) {
            handlePointerMove({ x, y });
        }
    });

    Input.onTouchEnd(() => {
        if (Game.getState() === GAME_STATES.LEVEL_EDITOR) {
            handlePointerUp();
        }
    });

    Input.onKeyDown((keyCode, event) => {
        handleKeyDown(keyCode, event);
    });

    Game.registerStateHandlers(GAME_STATES.LEVEL_EDITOR, {
        onEnter: () => {
            if (!editorState.initialized) {
                initializeWorkingData();
            }

            const requestedSlot = editorState.sceneEntrySlotId;
            if (requestedSlot && editorState.workingSlots[requestedSlot]) {
                selectSlot(requestedSlot);
            } else {
                selectSlot(editorState.currentSlotId);
            }

            ensureImportInput();
            editorState.sceneEntrySlotId = null;
            editorState.isPainting = false;
            editorState.isDraggingEnemy = false;
            editorState.flattenTargetNorm = null;

            Music.playForState(GAME_STATES.MENU);
            if (TitleScene.isActive()) {
                TitleScene.stop();
            }

            setStatus('Level editor ready. Save Draft or Playtest Draft.', 'info', 2200);
        },
        onExit: (toState) => {
            editorState.isPainting = false;
            editorState.isDraggingEnemy = false;
            editorState.flattenTargetNorm = null;

            if (toState === GAME_STATES.MENU && !TitleScene.isActive()) {
                TitleScene.start();
            }
        },
        update,
        render
    });
}
