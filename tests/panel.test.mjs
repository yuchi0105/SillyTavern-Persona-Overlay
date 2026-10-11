import test from 'node:test';
import assert from 'node:assert/strict';
import { PANEL_ID, composeFinalPreview, renderQuickPanel } from '../ui/quick-panel.js';

class FakeElement {
    constructor() {
        this.id = '';
        this.children = [];
        this.hidden = false;
        this.attributes = {};
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    append(element) { this.children.push(element); }
}

test('Quick Panel renderer is a singleton', () => {
    const body = new FakeElement();
    const doc = {
        body,
        createElement: () => new FakeElement(),
        getElementById: id => body.children.find(element => element.id === id) || null,
    };
    const first = renderQuickPanel(doc);
    const second = renderQuickPanel(doc);
    assert.equal(first.id, PANEL_ID);
    assert.equal(first, second);
    assert.equal(body.children.length, 1);
});

test('final preview includes native Persona and chat overlay content', () => {
    const preview = composeFinalPreview({
        personaName: '柒柒',
        personaContent: '原本的使用者角色設定',
        overlayContent: '目前聊天的額外設定',
    });
    assert.match(preview, /原生使用者角色｜柒柒/);
    assert.match(preview, /原本的使用者角色設定/);
    assert.match(preview, /聊天專屬 Overlay/);
    assert.match(preview, /目前聊天的額外設定/);
});
