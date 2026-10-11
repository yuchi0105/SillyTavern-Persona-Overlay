import test from 'node:test';
import assert from 'node:assert/strict';
import {
    MODULE_KEY,
    PERSONA_POSITIONS,
    PROMPT_POSITIONS,
    composeFinalPrompt,
    ensureChatState,
    ensureGlobalSettings,
    resolvePersonaPlacement,
} from '../core/state.js';

test('normalizes a chat-local state without sharing defaults', () => {
    const a = {};
    const b = {};
    const stateA = ensureChatState(a);
    const stateB = ensureChatState(b);
    stateA.baseContent = 'Chat A';
    assert.equal(stateB.baseContent, '');
    assert.notEqual(a[MODULE_KEY], b[MODULE_KEY]);
});

test('normalizes saved draggable UI positions', () => {
    const extensionSettings = {
        [MODULE_KEY]: {
            floatingButtonPosition: { x: 120, y: 240 },
            quickPanelPosition: { x: 40, y: 60 },
        },
    };
    const settings = ensureGlobalSettings(extensionSettings);
    assert.deepEqual(settings.floatingButtonPosition, { x: 120, y: 240 });
    assert.deepEqual(settings.quickPanelPosition, { x: 40, y: 60 });
});

test('composes enabled base content and enabled template snapshots', () => {
    const prompt = composeFinalPrompt({
        enabled: true,
        baseContent: '今天穿著白色嚮導制服。',
        templateInstances: [
            { id: 'a', name: 'A', content: '固定外貌', enabled: true },
            { id: 'b', name: 'B', content: '停用內容', enabled: false },
        ],
    });
    assert.equal(prompt, '今天穿著白色嚮導制服。\n\n固定外貌');
});

test('follows native Persona at-depth placement', () => {
    const placement = resolvePersonaPlacement({
        powerUserSettings: {
            persona_description_position: PERSONA_POSITIONS.AT_DEPTH,
            persona_description_depth: 2,
            persona_description_role: 1,
        },
        chatMetadata: {},
    });
    assert.equal(placement.position, PROMPT_POSITIONS.IN_CHAT);
    assert.equal(placement.depth, 2);
    assert.equal(placement.roleLabel, 'User');
});

test('follows Author Note placement for top-AN Persona', () => {
    const placement = resolvePersonaPlacement({
        powerUserSettings: { persona_description_position: PERSONA_POSITIONS.TOP_AN },
        chatMetadata: { note_position: 1, note_depth: 7, note_role: 2 },
    });
    assert.equal(placement.positionLabel, 'TOP_AN');
    assert.equal(placement.position, 1);
    assert.equal(placement.depth, 7);
    assert.equal(placement.role, 2);
});

test('native Persona NONE resolves to a disabled injection position', () => {
    const placement = resolvePersonaPlacement({
        powerUserSettings: { persona_description_position: PERSONA_POSITIONS.NONE },
        chatMetadata: {},
    });
    assert.equal(placement.position, PROMPT_POSITIONS.NONE);
    assert.equal(placement.positionLabel, 'NONE');
});
