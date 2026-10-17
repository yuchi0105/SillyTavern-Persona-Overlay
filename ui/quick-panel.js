import { placementSummary } from '../core/state.js';

export const PANEL_ID = 'persona_overlay_quick_panel';
export const FLOATING_BUTTON_ID = 'persona_overlay_floating_button';

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function composeFinalPreview({ personaName = '目前角色', personaContent = '', overlayContent = '' } = {}) {
    const sections = [
        `【原生使用者角色｜${personaName}】\n${String(personaContent).trim() || '（此角色沒有 Persona 描述內容）'}`,
    ];
    sections.push(String(overlayContent).trim()
        ? `【聊天專屬 Overlay】\n${String(overlayContent).trim()}`
        : '【聊天專屬 Overlay】\n（目前未啟用或沒有可注入內容）');
    return sections.join('\n\n');
}

export function renderQuickPanel(doc) {
    const existing = doc.getElementById(PANEL_ID);
    if (existing) return existing;
    const panel = doc.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'persona-overlay-quick-panel';
    panel.hidden = true;
    panel.tabIndex = -1;
    panel.setAttribute('aria-label', 'Persona Overlay quick editor');
    panel.innerHTML = `
        <header class="po-panel-header">
            <div class="po-brand">
                <span class="po-brand-icon" aria-hidden="true"><i class="fa-solid fa-user-pen"></i></span>
                <span class="po-brand-copy">
                    <strong>Persona Overlay</strong>
                    <small>目前聊天 · 即時同步</small>
                </span>
            </div>
            <button type="button" class="menu_button po-icon-button" data-po-action="close" aria-label="關閉">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
        </header>
        <div class="po-panel-body">
            <div class="po-no-chat" hidden>
                <span class="po-empty-icon" aria-hidden="true"><i class="fa-solid fa-comments"></i></span>
                <strong>尚未選擇聊天</strong>
                <span>打開任一聊天後，就能在這裡設定專屬 Persona。</span>
            </div>
            <div class="po-chat-controls">
                <section class="po-card po-enable-card">
                    <label class="po-check-row">
                        <span class="po-control-copy">
                            <strong>此聊天啟用</strong>
                            <small data-po-view="enabled-status">Overlay 已暫停</small>
                        </span>
                        <span class="po-switch">
                            <input type="checkbox" data-po-field="enabled" aria-label="此聊天啟用">
                            <span class="po-switch-track" aria-hidden="true"></span>
                        </span>
                    </label>
                </section>

                <div class="po-workspace">
                    <div class="po-panel-main">
                        <section class="po-card po-persona-card">
                            <div class="po-section-heading">
                                <div><i class="fa-solid fa-address-card" aria-hidden="true"></i><span>使用者角色</span></div>
                                <span class="po-native-badge">SillyTavern 原生</span>
                            </div>
                            <div class="po-persona-control" data-po-view="persona-control" aria-busy="false">
                                <span class="po-persona-avatar-wrap" aria-hidden="true">
                                    <img class="po-persona-avatar" data-po-view="persona-avatar" alt="">
                                    <i class="fa-solid fa-user po-persona-avatar-fallback"></i>
                                </span>
                                <div class="po-persona-picker">
                                    <label for="po_quick_persona">目前使用者角色</label>
                                    <select id="po_quick_persona" class="text_pole" data-po-field="persona-selection" aria-label="選擇使用者角色">
                                        <option value="">正在讀取角色…</option>
                                    </select>
                                    <small data-po-view="persona-detail">切換會同步更新 SillyTavern 原生 Persona</small>
                                </div>
                                <button type="button" class="menu_button po-persona-manage" data-po-action="manage-personas" title="開啟使用者角色管理">
                                    <i class="fa-solid fa-users-gear" aria-hidden="true"></i><span>管理</span>
                                </button>
                            </div>
                        </section>

                        <section class="po-card po-editor-card">
                            <div class="po-field-group">
                                <label for="po_quick_nickname">
                                    <span>備註／暱稱</span>
                                    <small>只用於辨識，不會注入 Prompt</small>
                                </label>
                                <input id="po_quick_nickname" class="text_pole" type="text" data-po-field="nickname">
                            </div>
                            <div class="po-field-group po-content-field">
                                <label for="po_quick_base_content">
                                    <span>聊天專屬設定</span>
                                    <small>輸入後立即套用</small>
                                </label>
                                <textarea id="po_quick_base_content" class="text_pole" rows="8" data-po-field="baseContent" placeholder="輸入只套用於目前聊天的 Persona 設定"></textarea>
                            </div>
                        </section>
                    </div>

                    <aside class="po-panel-side">
                        <section class="po-card po-templates-card">
                            <div class="po-section-heading">
                                <div><i class="fa-solid fa-layer-group" aria-hidden="true"></i><span>已套用模板</span></div>
                                <span class="po-count" data-po-view="template-count">0</span>
                            </div>
                            <div class="po-template-instances" data-po-view="instances"></div>
                            <div class="po-template-picker" data-po-view="template-picker" hidden>
                                <select class="text_pole" data-po-field="template-selection" aria-label="選擇模板"></select>
                                <button type="button" class="menu_button" data-po-action="confirm-template">套用</button>
                            </div>
                            <button type="button" class="menu_button po-wide-button po-secondary-button" data-po-action="show-template-picker">
                                <i class="fa-solid fa-plus" aria-hidden="true"></i><span>套用模板</span>
                            </button>
                        </section>

                        <section class="po-card po-injection-card">
                            <div class="po-section-heading">
                                <div><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i><span>最終注入</span></div>
                            </div>
                            <div class="po-placement-row">
                                <span class="po-placement-icon" aria-hidden="true"><i class="fa-solid fa-location-dot"></i></span>
                                <div>
                                    <div class="po-placement" data-po-view="placement"></div>
                                    <div class="po-follow"><i class="fa-solid fa-check" aria-hidden="true"></i> 跟隨原生 Persona</div>
                                </div>
                            </div>
                            <button type="button" class="menu_button po-wide-button" data-po-action="preview" aria-expanded="false">
                                <i class="fa-solid fa-eye" aria-hidden="true"></i><span data-po-view="preview-label">預覽最終 Prompt</span>
                            </button>
                            <pre class="po-preview" data-po-view="preview" hidden></pre>
                        </section>
                    </aside>
                </div>
            </div>
        </div>
        <footer class="po-panel-footer">
            <button type="button" class="menu_button" data-po-action="manage-templates"><i class="fa-solid fa-book" aria-hidden="true"></i><span>管理模板</span></button>
            <button type="button" class="menu_button" data-po-action="full-settings"><i class="fa-solid fa-gear" aria-hidden="true"></i><span>完整設定</span></button>
        </footer>`;
    doc.body.append(panel);
    return panel;
}

export function ensureFloatingButton(doc, onClick) {
    let button = doc.getElementById(FLOATING_BUTTON_ID);
    const activate = event => {
        if ((button._personaOverlaySuppressOpenUntil || 0) > Date.now()) {
            event?.preventDefault?.();
            event?.stopImmediatePropagation?.();
            return;
        }
        onClick?.();
    };
    if (button) {
        button.onclick = activate;
        return button;
    }
    button = doc.createElement('button');
    button.id = FLOATING_BUTTON_ID;
    button.type = 'button';
    button.className = 'menu_button persona-overlay-floating-button';
    button.title = 'Persona Overlay';
    button.setAttribute('aria-label', 'Open Persona Overlay quick editor');
    button.innerHTML = '<i class="fa-solid fa-user-pen"></i>';
    button.onclick = activate;
    doc.body.append(button);
    return button;
}

export class QuickPanelController {
    constructor({ doc, runtime, openSettings, personaBridge }) {
        this.doc = doc;
        this.runtime = runtime;
        this.openSettings = openSettings;
        this.personaBridge = personaBridge;
        this.personaSyncVersion = 0;
        this.currentPersona = null;
        this.panel = renderQuickPanel(doc);
        this.bound = false;
        this.unsubscribe = runtime.subscribe(snapshot => this.sync(snapshot));
        this.bindQuickPanelEvents();
        this.bindPanelDragging();
        this.sync(runtime.getSnapshot());
        void this.refreshPersona();
    }

    isOpen() {
        return !this.panel.hidden;
    }

    open() {
        this.panel.hidden = false;
        this.panel.classList.add('open');
        this.restorePosition(this.panel, 'quickPanelPosition');
        this.sync(this.runtime.getSnapshot());
        void this.refreshPersona();
        this.panel.focus({ preventScroll: true });
        requestAnimationFrame(() => this.reclampPanel());
    }

    getViewport() {
        const view = this.doc.defaultView || globalThis;
        return {
            width: Number(view.innerWidth) || this.doc.documentElement?.clientWidth || 0,
            height: Number(view.innerHeight) || this.doc.documentElement?.clientHeight || 0,
        };
    }

    clampPosition(element, x, y, margin = 8) {
        const viewport = this.getViewport();
        const rect = element.getBoundingClientRect();
        return {
            x: Math.min(Math.max(margin, x), Math.max(margin, viewport.width - rect.width - margin)),
            y: Math.min(Math.max(margin, y), Math.max(margin, viewport.height - rect.height - margin)),
        };
    }

    applyPosition(element, point) {
        if (!point) return;
        const position = this.clampPosition(element, Number(point.x) || 0, Number(point.y) || 0);
        element.style.left = `${position.x}px`;
        element.style.top = `${position.y}px`;
        element.style.right = 'auto';
        element.style.bottom = 'auto';
        element.style.margin = '0';
    }

    restorePosition(element, settingKey) {
        if (settingKey === 'quickPanelPosition' && this.getViewport().width <= 600) {
            for (const property of ['left', 'top', 'right', 'bottom', 'margin']) element.style.removeProperty(property);
            return;
        }
        this.applyPosition(element, this.runtime.getGlobalSettings()[settingKey]);
    }

    bindDraggable(handle, element, settingKey, { ignoreSelector = '', suppressClick = false } = {}) {
        if (!handle || handle._personaOverlayDragBound) return;
        handle._personaOverlayDragBound = true;
        let drag = null;
        const onPointerMove = event => {
            if (!drag || event.pointerId !== drag.pointerId) return;
            const dx = event.clientX - drag.pointerX;
            const dy = event.clientY - drag.pointerY;
            if (!drag.moved && Math.hypot(dx, dy) < 4) return;
            drag.moved = true;
            element.classList.add('po-is-dragging');
            this.applyPosition(element, { x: drag.elementX + dx, y: drag.elementY + dy });
        };
        const onPointerUp = event => {
            if (!drag || event.pointerId !== drag.pointerId) return;
            handle.releasePointerCapture?.(event.pointerId);
            if (drag.moved) {
                const rect = element.getBoundingClientRect();
                const position = this.clampPosition(element, rect.left, rect.top);
                this.applyPosition(element, position);
                this.runtime.setUiPosition(settingKey, position);
                if (suppressClick) element._personaOverlaySuppressOpenUntil = Date.now() + 300;
            }
            element.classList.remove('po-is-dragging');
            drag = null;
        };
        handle.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            if (settingKey === 'quickPanelPosition' && this.getViewport().width <= 600) return;
            if (ignoreSelector && event.target?.closest?.(ignoreSelector)) return;
            const rect = element.getBoundingClientRect();
            drag = {
                pointerId: event.pointerId,
                pointerX: event.clientX,
                pointerY: event.clientY,
                elementX: rect.left,
                elementY: rect.top,
                moved: false,
            };
            handle.setPointerCapture?.(event.pointerId);
        });
        handle.addEventListener('pointermove', onPointerMove);
        handle.addEventListener('pointerup', onPointerUp);
        handle.addEventListener('pointercancel', onPointerUp);
    }

    bindPanelDragging() {
        const header = this.panel.querySelector('.po-panel-header');
        this.bindDraggable(header, this.panel, 'quickPanelPosition', { ignoreSelector: 'button, input, select, textarea, a' });
    }

    reclampPanel() {
        if (!this.panel.style.left || this.getViewport().width <= 600) return;
        const rect = this.panel.getBoundingClientRect();
        const position = this.clampPosition(this.panel, rect.left, rect.top);
        this.applyPosition(this.panel, position);
        this.runtime.setUiPosition('quickPanelPosition', position);
    }

    attachFloatingButton(button) {
        if (!button) return;
        this.restorePosition(button, 'floatingButtonPosition');
        this.bindDraggable(button, button, 'floatingButtonPosition', { suppressClick: true });
    }

    async close() {
        this.panel.classList.remove('open');
        this.panel.hidden = true;
        await this.runtime.saveNow();
    }

    bindQuickPanelEvents() {
        if (this.bound) return;
        this.bound = true;
        this.panel.addEventListener('input', event => {
            const field = event.target?.dataset?.poField;
            if (!['enabled', 'nickname', 'baseContent'].includes(field)) return;
            const value = field === 'enabled' ? event.target.checked : event.target.value;
            this.runtime.setField(field, value);
        });
        this.panel.addEventListener('change', event => {
            if (event.target?.dataset?.poField === 'persona-selection') {
                void this.selectPersona(event.target.value);
                return;
            }
            const toggle = event.target?.dataset?.poInstanceToggle;
            if (toggle) this.runtime.toggleInstance(toggle, event.target.checked);
        });
        this.panel.addEventListener('click', event => {
            const target = event.target.closest?.('[data-po-action], [data-po-instance-remove]');
            if (!target) return;
            if (target.dataset.poInstanceRemove) {
                this.runtime.removeInstance(target.dataset.poInstanceRemove);
                return;
            }
            const action = target.dataset.poAction;
            if (action === 'close') void this.close();
            if (action === 'show-template-picker') this.showTemplatePicker();
            if (action === 'confirm-template') this.applySelectedTemplate();
            if (action === 'preview') this.showPreview();
            if (action === 'manage-personas') {
                void this.close();
                requestAnimationFrame(() => this.personaBridge?.openManager?.());
            }
            if (action === 'manage-templates') {
                void this.close();
                requestAnimationFrame(() => this.openSettings?.('templates'));
            }
            if (action === 'full-settings') {
                void this.close();
                requestAnimationFrame(() => this.openSettings?.('root'));
            }
        });
    }

    async selectPersona(personaId) {
        if (!personaId || !this.personaBridge?.select) return;
        const control = this.panel.querySelector('[data-po-view="persona-control"]');
        const select = this.panel.querySelector('[data-po-field="persona-selection"]');
        control?.setAttribute('aria-busy', 'true');
        if (select) select.disabled = true;
        try {
            await this.personaBridge.select(personaId);
            await this.refreshPersona();
        } catch (error) {
            console.error('[Persona Overlay] Failed to change Persona.', error);
            globalThis.toastr?.error?.('無法切換使用者角色，請稍後再試。', 'Persona Overlay');
            await this.refreshPersona();
        } finally {
            control?.setAttribute('aria-busy', 'false');
            if (select) select.disabled = false;
        }
    }

    async refreshPersona() {
        if (!this.personaBridge?.list) return;
        const version = ++this.personaSyncVersion;
        const select = this.panel.querySelector('[data-po-field="persona-selection"]');
        const detail = this.panel.querySelector('[data-po-view="persona-detail"]');
        const avatar = this.panel.querySelector('[data-po-view="persona-avatar"]');
        const control = this.panel.querySelector('[data-po-view="persona-control"]');
        if (!select) return;
        control?.setAttribute('aria-busy', 'true');
        select.disabled = true;
        try {
            const personas = await this.personaBridge.list();
            if (version !== this.personaSyncVersion) return;
            const currentId = this.personaBridge.getCurrentId?.() || '';
            select.innerHTML = personas.length
                ? personas.map(persona => `<option value="${escapeHtml(persona.id)}">${escapeHtml(persona.name)}</option>`).join('')
                : '<option value="">尚未建立使用者角色</option>';
            select.value = currentId;
            const current = personas.find(persona => persona.id === currentId);
            this.currentPersona = current || null;
            if (detail) detail.textContent = current?.title || '切換會同步更新 SillyTavern 原生 Persona';
            if (avatar) {
                avatar.hidden = !current?.avatarUrl;
                if (current?.avatarUrl) avatar.src = current.avatarUrl;
            }
            this.updatePreview();
        } catch (error) {
            if (version !== this.personaSyncVersion) return;
            console.error('[Persona Overlay] Failed to load Personas.', error);
            select.innerHTML = '<option value="">無法讀取使用者角色</option>';
            if (detail) detail.textContent = '仍可前往原生角色管理重試';
            if (avatar) avatar.hidden = true;
        } finally {
            if (version === this.personaSyncVersion) {
                control?.setAttribute('aria-busy', 'false');
                select.disabled = false;
            }
        }
    }

    showTemplatePicker() {
        const picker = this.panel.querySelector('[data-po-view="template-picker"]');
        picker.hidden = false;
        picker.querySelector('select')?.focus();
    }

    applySelectedTemplate() {
        const select = this.panel.querySelector('[data-po-field="template-selection"]');
        if (select?.value) this.runtime.applyTemplate(select.value);
        const picker = this.panel.querySelector('[data-po-view="template-picker"]');
        picker.hidden = true;
    }

    showPreview() {
        const preview = this.panel.querySelector('[data-po-view="preview"]');
        const button = this.panel.querySelector('[data-po-action="preview"]');
        const label = this.panel.querySelector('[data-po-view="preview-label"]');
        preview.hidden = !preview.hidden;
        if (!preview.hidden) this.updatePreview();
        requestAnimationFrame(() => this.reclampPanel());
        button?.setAttribute('aria-expanded', String(!preview.hidden));
        if (label) label.textContent = preview.hidden ? '預覽最終 Prompt' : '收起 Prompt 預覽';
    }

    finalPromptPreview() {
        const personaName = this.currentPersona?.name || this.personaBridge?.getCurrentName?.() || '目前角色';
        const personaContent = this.personaBridge?.getCurrentContent?.() || '';
        const overlayContent = this.runtime.preview();
        return composeFinalPreview({ personaName, personaContent, overlayContent });
    }

    updatePreview() {
        const preview = this.panel.querySelector('[data-po-view="preview"]');
        if (preview && !preview.hidden) preview.textContent = this.finalPromptPreview();
    }

    sync(snapshot) {
        const controls = this.panel.querySelector('.po-chat-controls');
        const noChat = this.panel.querySelector('.po-no-chat');
        controls.hidden = !snapshot.hasActiveChat;
        noChat.hidden = snapshot.hasActiveChat;
        if (!snapshot.hasActiveChat || !snapshot.state) return;

        const active = this.doc.activeElement;
        const enabled = this.panel.querySelector('[data-po-field="enabled"]');
        const nickname = this.panel.querySelector('[data-po-field="nickname"]');
        const baseContent = this.panel.querySelector('[data-po-field="baseContent"]');
        enabled.checked = snapshot.state.enabled;
        this.panel.classList.toggle('po-overlay-enabled', snapshot.state.enabled);
        this.panel.querySelector('[data-po-view="enabled-status"]').textContent = snapshot.state.enabled
            ? 'Overlay 正在運作'
            : 'Overlay 已暫停';
        if (active !== nickname) nickname.value = snapshot.state.nickname;
        if (active !== baseContent) baseContent.value = snapshot.state.baseContent;
        this.panel.querySelector('[data-po-view="placement"]').textContent = placementSummary(snapshot.placement);

        const instances = this.panel.querySelector('[data-po-view="instances"]');
        instances.innerHTML = snapshot.state.templateInstances.length
            ? snapshot.state.templateInstances.map(instance => `
                <div class="po-template-instance ${instance.enabled ? 'is-active' : 'is-paused'}">
                    <label class="po-instance-toggle">
                        <input type="checkbox" data-po-instance-toggle="${escapeHtml(instance.id)}" ${instance.enabled ? 'checked' : ''}>
                        <span class="po-instance-copy">
                            <strong>${escapeHtml(instance.name)}</strong>
                            <small>${instance.enabled ? '已啟用' : '已暫停'}</small>
                        </span>
                    </label>
                    <button type="button" class="menu_button po-remove" data-po-instance-remove="${escapeHtml(instance.id)}" title="移除模板" aria-label="移除 ${escapeHtml(instance.name)}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                </div>`).join('')
            : '<div class="po-empty po-empty-compact"><i class="fa-regular fa-folder-open" aria-hidden="true"></i><span>尚未套用模板</span></div>';
        this.panel.querySelector('[data-po-view="template-count"]').textContent = snapshot.state.templateInstances.length;

        const select = this.panel.querySelector('[data-po-field="template-selection"]');
        select.innerHTML = snapshot.settings.templates.length
            ? snapshot.settings.templates.map(template => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)}</option>`).join('')
            : '<option value="">尚無可用模板</option>';
        this.panel.querySelector('[data-po-action="confirm-template"]').disabled = !snapshot.settings.templates.length;

        const preview = this.panel.querySelector('[data-po-view="preview"]');
        if (!preview.hidden) this.updatePreview();
    }

    destroy() {
        this.unsubscribe?.();
        this.panel.remove();
    }
}
