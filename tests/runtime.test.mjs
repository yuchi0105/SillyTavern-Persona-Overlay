import test from 'node:test';
import assert from 'node:assert/strict';
import { PersonaOverlayRuntime } from '../core/runtime.js';
import { MODULE_KEY, PERSONA_POSITIONS } from '../core/state.js';

function fixture() {
    const chats = {
        A: {},
        B: {},
    };
    const prompts = [];
    const saves = [];
    const extensionSettings = {};
    let current = 'A';
    const getContext = () => ({
        chatId: current,
        getCurrentChatId: () => current,
        chatMetadata: chats[current],
        extensionSettings,
        powerUserSettings: {
            persona_description_position: PERSONA_POSITIONS.AT_DEPTH,
            persona_description_depth: 2,
            persona_description_role: 0,
        },
        setExtensionPrompt: (...args) => prompts.push({ chat: current, args }),
        saveMetadata: async () => saves.push(current),
        substituteParams: value => value.replaceAll('{{user}}', '柒柒'),
    });
    return { chats, prompts, saves, getContext, switchTo: id => { current = id; } };
}

test('Case 14: wand edit updates the current injection immediately', () => {
    const fx = fixture();
    const runtime = new PersonaOverlayRuntime(fx.getContext);
    runtime.setField('enabled', true);
    runtime.setField('baseContent', '今天穿著白色嚮導制服。');
    assert.equal(fx.prompts.at(-1).chat, 'A');
    assert.equal(fx.prompts.at(-1).args[1], '今天穿著白色嚮導制服。');
});

test('Case 15: CHAT_CHANGED reads new metadata and never writes A into B', () => {
    const fx = fixture();
    const runtime = new PersonaOverlayRuntime(fx.getContext);
    runtime.setField('enabled', true);
    runtime.setField('baseContent', 'Chat A');
    fx.switchTo('B');
    runtime.onChatChanged();
    runtime.setField('enabled', true);
    runtime.setField('baseContent', 'Chat B');
    assert.equal(fx.chats.A[MODULE_KEY].baseContent, 'Chat A');
    assert.equal(fx.chats.B[MODULE_KEY].baseContent, 'Chat B');
    assert.equal(fx.prompts.at(-1).args[1], 'Chat B');
});

test('Case 16: all entry points observe one chatMetadata state', () => {
    const fx = fixture();
    const runtime = new PersonaOverlayRuntime(fx.getContext);
    const observed = [];
    runtime.subscribe(snapshot => observed.push(snapshot.state?.baseContent));
    runtime.setField('baseContent', '狀態 A');
    assert.equal(runtime.getSnapshot().state.baseContent, '狀態 A');
    runtime.setField('baseContent', '狀態 B');
    assert.equal(fx.chats.A[MODULE_KEY].baseContent, '狀態 B');
    assert.equal(observed.at(-1), '狀態 B');
    runtime.destroy();
});

test('template instance snapshots survive source template deletion', () => {
    const fx = fixture();
    const runtime = new PersonaOverlayRuntime(fx.getContext);
    runtime.getGlobalSettings().templates.push({ id: 'guide', name: '嚮導身份', content: '第一防務區嚮導' });
    runtime.applyTemplate('guide');
    runtime.getGlobalSettings().templates = [];
    assert.equal(runtime.getSnapshot().state.templateInstances[0].content, '第一防務區嚮導');
});

test('Persona NONE clears the registered prompt value', () => {
    const fx = fixture();
    const runtime = new PersonaOverlayRuntime(() => ({
        ...fx.getContext(),
        powerUserSettings: { persona_description_position: PERSONA_POSITIONS.NONE },
    }));
    runtime.setField('enabled', true);
    runtime.setField('baseContent', '不得洩漏');
    assert.equal(fx.prompts.at(-1).args[1], '');
    assert.equal(fx.prompts.at(-1).args[2], -1);
});
