import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureWandMenuItem, WAND_ID } from '../ui/menu.js';

class FakeElement {
    constructor(tag = 'div') {
        this.tag = tag;
        this.children = [];
        this.listeners = {};
        this.attributes = {};
        this.id = '';
        this.className = '';
        this.textContent = '';
    }
    append(...children) { this.children.push(...children); }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    setAttribute(name, value) { this.attributes[name] = value; }
}

function fakeDocument() {
    const menu = new FakeElement();
    menu.id = 'extensionsMenu';
    const elements = new Map([['extensionsMenu', menu]]);
    const doc = {
        createElement: tag => new FakeElement(tag),
        getElementById: id => elements.get(id) || menu.children.find(item => item.id === id) || null,
    };
    return { doc, menu };
}

test('Case 13: creates one native-style Extensions Menu item', () => {
    const { doc, menu } = fakeDocument();
    let opened = 0;
    const first = ensureWandMenuItem(doc, () => opened++);
    const second = ensureWandMenuItem(doc, () => opened++);
    assert.equal(first.id, WAND_ID);
    assert.equal(first.className, 'list-group-item flex-container flexGap5');
    assert.match(first.children[0].className, /extensionsMenuExtensionButton/);
    assert.equal(first.children[1].textContent, 'Persona Overlay');
    assert.equal(first, second);
    assert.equal(menu.children.length, 1);
    first.listeners.click({ type: 'click', preventDefault() {} });
    assert.equal(opened, 1);
});
