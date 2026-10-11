import { PersonaOverlayRuntime } from './core/runtime.js';
import { createId, normalizeTemplate, placementSummary } from './core/state.js';
import { ensureWandMenuItem, removeWandMenuItem } from './ui/menu.js';
import { doNavbarIconClick } from '/script.js';
import { getUserAvatar, getUserAvatars, setUserAvatar, user_avatar } from '/scripts/personas.js';
import {
    FLOATING_BUTTON_ID,
    QuickPanelController,
    ensureFloatingButton,
} from './ui/quick-panel.js';

const EXTENSION_PATH = 'third-party/SillyTavern-Persona-Overlay';
let runtime = null;
let quickPanel = null;
let unsubscribers = [];
let initialized = false;
let entrypointObserver = null;
let entrypointReconcileQueued = false;

function getContext() {
    return globalThis.SillyTavern?.getContext?.();
}

function getActiveDrawer(id) {
    const drawers = [...document.querySelectorAll(`#${id}`)];
    return drawers.find(drawer => {
        const rect = drawer.querySelector(':scope > .drawer-toggle')?.getBoundingClientRect();
        return rect && rect.width > 0 && rect.height > 0;
    }) || drawers[0] || null;
}

function waitForElement(id, timeout = 5000) {
    const existing = document.getElementById(id);
    if (existing) return Promise.resolve(existing);
    return new Promise(resolve => {
        const observer = new MutationObserver(() => {
            const element = document.getElementById(id);
            if (!element) return;
            observer.disconnect();
            resolve(element);
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => {
            observer.disconnect();
            resolve(document.getElementById(id));
        }, timeout);
    });
}

function openPersonaOverlayQuickPanel() {
    quickPanel?.open();
}

const personaBridge = {
    async list() {
        const ids = await getUserAvatars(false);
        const context = getContext();
        const settings = context?.powerUserSettings || {};
        return ids.map(id => ({
            id,
            name: settings.personas?.[id] || '[未命名角色]',
            title: settings.persona_descriptions?.[id]?.title || '',
            avatarUrl: context?.getThumbnailUrl?.('persona', id, true) || getUserAvatar(id),
        })).sort((left, right) => left.name.localeCompare(right.name));
    },
    getCurrentId() {
        return user_avatar;
    },
    getCurrentName() {
        return getContext()?.powerUserSettings?.personas?.[user_avatar] || '[未命名角色]';
    },
    getCurrentContent() {
        const context = getContext();
        const content = context?.powerUserSettings?.persona_descriptions?.[user_avatar]?.description || '';
        try {
            return context?.substituteParams ? context.substituteParams(content) : content;
        } catch {
            return content;
        }
    },
    async select(id) {
        await setUserAvatar(id, { toastPersonaNameChange: false, navigateToCurrent: false });
    },
    openManager() {
        const drawer = getActiveDrawer('persona-management-button');
        const content = drawer?.querySelector(':scope > .drawer-content');
        if (content && !content.classList.contains('openDrawer')) {
            const toggle = drawer.querySelector(':scope > .drawer-toggle');
            if (toggle) void doNavbarIconClick.call(toggle);
        }
    },
};

async function openExtensionSettings(section = 'root') {
    const extensionsDrawer = getActiveDrawer('extensions-settings-button');
    const extensionsContent = extensionsDrawer?.querySelector(':scope > .drawer-content');
    if (extensionsContent && getComputedStyle(extensionsContent).display === 'none') {
        const toggle = extensionsDrawer.querySelector(':scope > .drawer-toggle');
        if (toggle) await doNavbarIconClick.call(toggle);
    }
    const target = section === 'templates'
        ? document.getElementById('persona_overlay_template_library')
        : document.getElementById('persona_overlay_settings');
    const personaDrawer = document.getElementById('persona_overlay_settings')?.querySelector(':scope > .inline-drawer');
    const personaContent = personaDrawer?.querySelector(':scope > .inline-drawer-content');
    if (personaContent && getComputedStyle(personaContent).display === 'none') {
        personaDrawer.querySelector(':scope > .inline-drawer-toggle')?.click();
    }
    requestAnimationFrame(() => {
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target?.classList.add('flash', 'flashHighlight');
        setTimeout(() => target?.classList.remove('flash', 'flashHighlight'), 1200);
    });
}

function syncFloatingButton(snapshot = runtime.getSnapshot()) {
    const button = ensureFloatingButton(document, openPersonaOverlayQuickPanel);
    button.hidden = !snapshot.settings.showFloatingButton;
    quickPanel?.attachFloatingButton(button);
}

function ensureEntrypoints(snapshot = runtime?.getSnapshot()) {
    if (!runtime || !snapshot) return;
    ensureWandMenuItem(document, openPersonaOverlayQuickPanel);
    syncFloatingButton(snapshot);
}

function handleEntrypointClick(event) {
    const entrypoint = event.target?.closest?.(`#${FLOATING_BUTTON_ID}, #persona_overlay_wand`);
    if (!entrypoint) return;
    if ((entrypoint._personaOverlaySuppressOpenUntil || 0) > Date.now()) return;
    openPersonaOverlayQuickPanel();
}

function startEntrypointGuardian() {
    document.removeEventListener('click', handleEntrypointClick);
    document.addEventListener('click', handleEntrypointClick);
    entrypointObserver?.disconnect();
    entrypointObserver = new MutationObserver(() => {
        if (entrypointReconcileQueued) return;
        const wandMissing = !document.getElementById('persona_overlay_wand');
        const floatingMissing = !document.getElementById(FLOATING_BUTTON_ID);
        if (!wandMissing && !floatingMissing) return;
        entrypointReconcileQueued = true;
        requestAnimationFrame(() => {
            entrypointReconcileQueued = false;
            ensureEntrypoints();
        });
    });
    entrypointObserver.observe(document.body, { childList: true, subtree: true });
}

async function installSettingsPanel() {
    if (document.getElementById('persona_overlay_settings')) return;
    const context = getContext();
    let html = '';
    if (typeof context?.renderExtensionTemplateAsync === 'function') {
        html = await context.renderExtensionTemplateAsync(EXTENSION_PATH, 'settings');
    } else {
        html = await fetch(`/scripts/extensions/${EXTENSION_PATH}/settings.html`).then(response => response.text());
    }
    const host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    host?.insertAdjacentHTML('beforeend', html);
    bindSettingsEvents();
    syncSettingsPanel(runtime.getSnapshot());
}

function bindSettingsEvents() {
    document.getElementById('persona_overlay_show_floating')?.addEventListener('change', event => {
        const settings = runtime.getGlobalSettings();
        settings.showFloatingButton = event.target.checked;
        getContext()?.saveSettingsDebounced?.();
        runtime.notify();
    });
    document.getElementById('persona_overlay_settings_enabled')?.addEventListener('input', event => runtime.setField('enabled', event.target.checked));
    document.getElementById('persona_overlay_settings_nickname')?.addEventListener('input', event => runtime.setField('nickname', event.target.value));
    document.getElementById('persona_overlay_settings_base_content')?.addEventListener('input', event => runtime.setField('baseContent', event.target.value));
    document.getElementById('persona_overlay_open_quick')?.addEventListener('click', openPersonaOverlayQuickPanel);
    document.getElementById('persona_overlay_add_template')?.addEventListener('click', addTemplateFromSettings);
    document.getElementById('persona_overlay_template_list')?.addEventListener('input', event => {
        const field = event.target?.dataset?.poTemplateField;
        const id = event.target?.dataset?.poTemplateId;
        if (!id || !['name', 'content'].includes(field)) return;
        const template = runtime.getGlobalSettings().templates.find(item => item.id === id);
        if (!template) return;
        template[field] = event.target.value;
        getContext()?.saveSettingsDebounced?.();
    });
    document.getElementById('persona_overlay_template_list')?.addEventListener('change', event => {
        if (event.target?.dataset?.poTemplateId) runtime.notify();
    });
    document.getElementById('persona_overlay_template_list')?.addEventListener('click', event => {
        const id = event.target.closest?.('[data-po-delete-template]')?.dataset.poDeleteTemplate;
        if (id) deleteTemplate(id);
    });
}

function addTemplateFromSettings() {
    const nameInput = document.getElementById('persona_overlay_new_template_name');
    const contentInput = document.getElementById('persona_overlay_new_template_content');
    const template = normalizeTemplate({ id: createId('template'), name: nameInput.value, content: contentInput.value });
    if (!template || !template.name.trim() || !template.content.trim()) {
        globalThis.toastr?.warning?.('請填寫模板名稱與內容。', 'Persona Overlay');
        return;
    }
    runtime.getGlobalSettings().templates.push(template);
    getContext()?.saveSettingsDebounced?.();
    nameInput.value = '';
    contentInput.value = '';
    runtime.notify();
}

function deleteTemplate(id) {
    const settings = runtime.getGlobalSettings();
    settings.templates = settings.templates.filter(template => template.id !== id);
    getContext()?.saveSettingsDebounced?.();
    runtime.notify();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function syncSettingsPanel(snapshot) {
    const root = document.getElementById('persona_overlay_settings');
    if (!root) return;
    const floating = document.getElementById('persona_overlay_show_floating');
    if (floating) floating.checked = snapshot.settings.showFloatingButton;
    root.classList.toggle('po-overlay-enabled', Boolean(snapshot.state?.enabled));
    document.getElementById('persona_overlay_settings_no_chat').hidden = snapshot.hasActiveChat;
    document.getElementById('persona_overlay_settings_chat').hidden = !snapshot.hasActiveChat;
    if (snapshot.hasActiveChat && snapshot.state) {
        const enabled = document.getElementById('persona_overlay_settings_enabled');
        const nickname = document.getElementById('persona_overlay_settings_nickname');
        const baseContent = document.getElementById('persona_overlay_settings_base_content');
        enabled.checked = snapshot.state.enabled;
        if (document.activeElement !== nickname) nickname.value = snapshot.state.nickname;
        if (document.activeElement !== baseContent) baseContent.value = snapshot.state.baseContent;
        document.getElementById('persona_overlay_settings_placement').textContent = `${placementSummary(snapshot.placement)} · 跟隨原生 Persona`;
    }
    const list = document.getElementById('persona_overlay_template_list');
    const count = document.getElementById('persona_overlay_settings_template_count');
    if (count) count.textContent = snapshot.settings.templates.length;
    list.innerHTML = snapshot.settings.templates.length
        ? snapshot.settings.templates.map(template => `
            <div class="po-template-instance po-template-source-card">
                <div class="po-template-card-header">
                    <span><i class="fa-solid fa-file-lines" aria-hidden="true"></i> 來源模板</span>
                    <button type="button" class="menu_button po-remove" data-po-delete-template="${escapeHtml(template.id)}" title="刪除模板" aria-label="刪除 ${escapeHtml(template.name)}"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
                </div>
                <div class="po-template-source-editor">
                    <label>模板名稱</label>
                    <input class="text_pole" type="text" value="${escapeHtml(template.name)}" data-po-template-id="${escapeHtml(template.id)}" data-po-template-field="name">
                    <label>模板內容</label>
                    <textarea class="text_pole" rows="4" data-po-template-id="${escapeHtml(template.id)}" data-po-template-field="content">${escapeHtml(template.content)}</textarea>
                </div>
            </div>`).join('')
        : '<div class="po-empty po-empty-compact"><i class="fa-regular fa-folder-open" aria-hidden="true"></i><span>尚未建立模板</span></div>';
}

function bindContextEvent(eventName, handler) {
    const context = getContext();
    if (!eventName || !context?.eventSource?.on) return;
    context.eventSource.on(eventName, handler);
    unsubscribers.push(() => context.eventSource.removeListener?.(eventName, handler));
}

export async function init() {
    if (initialized) {
        ensureEntrypoints();
        return;
    }
    initialized = true;
    runtime = new PersonaOverlayRuntime(getContext);
    runtime.getGlobalSettings();
    quickPanel = new QuickPanelController({
        doc: document,
        runtime,
        openSettings: openExtensionSettings,
        personaBridge,
    });
    ensureEntrypoints();
    startEntrypointGuardian();
    await Promise.all([waitForElement('extensionsMenu'), waitForElement('extensions_settings2')]);
    ensureEntrypoints();
    await installSettingsPanel();

    const unsubscribe = runtime.subscribe(snapshot => {
        syncFloatingButton(snapshot);
        syncSettingsPanel(snapshot);
    });
    unsubscribers.push(unsubscribe);
    syncFloatingButton();
    runtime.syncPrompt();

    const { eventTypes } = getContext() || {};
    bindContextEvent(eventTypes?.CHAT_CHANGED, () => runtime.onChatChanged());
    bindContextEvent(eventTypes?.PERSONA_CHANGED, () => {
        runtime.syncPrompt();
        runtime.notify();
        void quickPanel?.refreshPersona();
    });
    bindContextEvent(eventTypes?.SETTINGS_UPDATED, () => {
        runtime.syncPrompt();
        runtime.notify();
    });
}

export async function destroy() {
    if (!initialized) return;
    await runtime?.saveNow();
    unsubscribers.forEach(unsubscribe => unsubscribe());
    unsubscribers = [];
    entrypointObserver?.disconnect();
    entrypointObserver = null;
    entrypointReconcileQueued = false;
    document.removeEventListener('click', handleEntrypointClick);
    quickPanel?.destroy();
    quickPanel = null;
    runtime?.destroy();
    runtime = null;
    removeWandMenuItem(document);
    document.getElementById(FLOATING_BUTTON_ID)?.remove();
    document.getElementById('persona_overlay_settings')?.remove();
    initialized = false;
}

export { openPersonaOverlayQuickPanel };
