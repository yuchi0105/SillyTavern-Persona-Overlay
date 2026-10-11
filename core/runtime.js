import {
    MODULE_KEY,
    PROMPT_KEY,
    PROMPT_POSITIONS,
    composeFinalPrompt,
    createTemplateInstance,
    ensureChatState,
    ensureGlobalSettings,
    resolvePersonaPlacement,
} from './state.js';

export class PersonaOverlayRuntime {
    constructor(getContext) {
        this.getContext = getContext;
        this.listeners = new Set();
        this.saveTimer = null;
        this.saveEpoch = 0;
    }

    context() {
        return this.getContext?.() || null;
    }

    hasActiveChat(context = this.context()) {
        if (!context) return false;
        const id = typeof context.getCurrentChatId === 'function'
            ? context.getCurrentChatId()
            : context.chatId;
        return id !== undefined && id !== null && id !== '';
    }

    getCurrentState({ create = true } = {}) {
        const context = this.context();
        if (!this.hasActiveChat(context)) return null;
        const existing = context.chatMetadata?.[MODULE_KEY];
        if (!create && (!existing || typeof existing !== 'object')) return null;
        return ensureChatState(context.chatMetadata);
    }

    getGlobalSettings() {
        const context = this.context();
        return ensureGlobalSettings(context?.extensionSettings);
    }

    setUiPosition(field, position) {
        if (!['floatingButtonPosition', 'quickPanelPosition'].includes(field)) return;
        const x = Number(position?.x);
        const y = Number(position?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        this.getGlobalSettings()[field] = { x, y };
        this.context()?.saveSettingsDebounced?.();
    }

    getSnapshot() {
        const context = this.context();
        const state = this.getCurrentState();
        const placement = resolvePersonaPlacement(context || {});
        return {
            hasActiveChat: this.hasActiveChat(context),
            state,
            settings: this.getGlobalSettings(),
            placement,
            finalPrompt: state ? composeFinalPrompt(state) : '',
        };
    }

    updateCurrent(mutator, { save = true } = {}) {
        const state = this.getCurrentState();
        if (!state) return null;
        if (typeof mutator === 'function') mutator(state);
        this.syncPrompt();
        if (save) this.scheduleSave();
        this.notify();
        return state;
    }

    setField(field, value) {
        return this.updateCurrent(state => {
            if (field === 'enabled') state.enabled = value === true;
            if (field === 'nickname') state.nickname = String(value ?? '');
            if (field === 'baseContent') state.baseContent = String(value ?? '');
        });
    }

    applyTemplate(templateId) {
        const template = this.getGlobalSettings().templates.find(item => item.id === templateId);
        const instance = createTemplateInstance(template);
        if (!instance) return null;
        this.updateCurrent(state => state.templateInstances.push(instance));
        return instance;
    }

    toggleInstance(instanceId, enabled) {
        this.updateCurrent(state => {
            const instance = state.templateInstances.find(item => item.id === instanceId);
            if (instance) instance.enabled = enabled === true;
        });
    }

    removeInstance(instanceId) {
        this.updateCurrent(state => {
            state.templateInstances = state.templateInstances.filter(item => item.id !== instanceId);
        });
    }

    syncPrompt() {
        const context = this.context();
        if (!context?.setExtensionPrompt) return;
        const state = this.getCurrentState({ create: false });
        const placement = resolvePersonaPlacement(context);
        const prompt = state && placement.position !== PROMPT_POSITIONS.NONE
            ? composeFinalPrompt(state)
            : '';
        const position = placement.position === PROMPT_POSITIONS.NONE
            ? PROMPT_POSITIONS.NONE
            : placement.position;
        context.setExtensionPrompt(PROMPT_KEY, prompt, position, placement.depth, false, placement.role);
    }

    preview() {
        const snapshot = this.getSnapshot();
        const context = this.context();
        if (!snapshot.finalPrompt) return '';
        try {
            return context?.substituteParams
                ? context.substituteParams(snapshot.finalPrompt)
                : snapshot.finalPrompt;
        } catch {
            return snapshot.finalPrompt;
        }
    }

    scheduleSave(delay = 250) {
        clearTimeout(this.saveTimer);
        const epoch = ++this.saveEpoch;
        this.saveTimer = setTimeout(() => {
            if (epoch !== this.saveEpoch) return;
            this.saveTimer = null;
            void this.saveNow();
        }, delay);
    }

    async saveNow() {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
        const context = this.context();
        if (!this.hasActiveChat(context) || typeof context.saveMetadata !== 'function') return;
        await context.saveMetadata();
    }

    cancelPendingSave() {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
        this.saveEpoch += 1;
    }

    onChatChanged() {
        this.cancelPendingSave();
        this.syncPrompt();
        this.notify();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        const snapshot = this.getSnapshot();
        for (const listener of this.listeners) listener(snapshot);
    }

    destroy() {
        this.cancelPendingSave();
        this.listeners.clear();
    }
}
