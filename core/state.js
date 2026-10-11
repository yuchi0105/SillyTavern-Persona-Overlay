export const MODULE_KEY = 'persona_overlay';
export const PROMPT_KEY = 'PERSONA_OVERLAY';
export const METADATA_VERSION = 1;

export const PROMPT_POSITIONS = Object.freeze({
    NONE: -1,
    IN_PROMPT: 0,
    IN_CHAT: 1,
    BEFORE_PROMPT: 2,
});

export const PROMPT_ROLES = Object.freeze({
    SYSTEM: 0,
    USER: 1,
    ASSISTANT: 2,
});

export const PERSONA_POSITIONS = Object.freeze({
    IN_PROMPT: 0,
    TOP_AN: 2,
    BOTTOM_AN: 3,
    AT_DEPTH: 4,
    NONE: 9,
});

export const DEFAULT_CHAT_STATE = Object.freeze({
    version: METADATA_VERSION,
    enabled: false,
    nickname: '',
    baseContent: '',
    templateInstances: [],
});

export const DEFAULT_GLOBAL_SETTINGS = Object.freeze({
    showFloatingButton: true,
    floatingButtonPosition: null,
    quickPanelPosition: null,
    templates: [],
});

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function text(value) {
    return typeof value === 'string' ? value : '';
}

function finiteNumber(value, fallback) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
}

function normalizedPoint(value) {
    if (!value || typeof value !== 'object') return null;
    const x = Number(value.x);
    const y = Number(value.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
}

export function createId(prefix = 'po') {
    if (globalThis.crypto?.randomUUID) {
        return `${prefix}_${globalThis.crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeTemplate(template) {
    if (!template || typeof template !== 'object') return null;
    return {
        id: text(template.id) || createId('template'),
        name: text(template.name).trim() || '未命名模板',
        content: text(template.content),
    };
}

export function normalizeTemplateInstance(instance) {
    if (!instance || typeof instance !== 'object') return null;
    return {
        id: text(instance.id) || createId('instance'),
        templateId: text(instance.templateId),
        name: text(instance.name).trim() || '未命名模板',
        content: text(instance.content),
        enabled: instance.enabled !== false,
    };
}

export function normalizeChatState(value) {
    const source = value && typeof value === 'object' ? value : {};
    const instances = Array.isArray(source.templateInstances)
        ? source.templateInstances.map(normalizeTemplateInstance).filter(Boolean)
        : [];
    return {
        version: METADATA_VERSION,
        enabled: source.enabled === true,
        nickname: text(source.nickname),
        baseContent: text(source.baseContent),
        templateInstances: instances,
    };
}

export function ensureChatState(chatMetadata) {
    if (!chatMetadata || typeof chatMetadata !== 'object') return null;
    const normalized = normalizeChatState(chatMetadata[MODULE_KEY]);
    chatMetadata[MODULE_KEY] = normalized;
    return normalized;
}

export function normalizeGlobalSettings(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        showFloatingButton: source.showFloatingButton !== false,
        floatingButtonPosition: normalizedPoint(source.floatingButtonPosition),
        quickPanelPosition: normalizedPoint(source.quickPanelPosition),
        templates: Array.isArray(source.templates)
            ? source.templates.map(normalizeTemplate).filter(Boolean)
            : [],
    };
}

export function ensureGlobalSettings(extensionSettings) {
    if (!extensionSettings || typeof extensionSettings !== 'object') {
        return clone(DEFAULT_GLOBAL_SETTINGS);
    }
    const normalized = normalizeGlobalSettings(extensionSettings[MODULE_KEY]);
    extensionSettings[MODULE_KEY] = normalized;
    return normalized;
}

export function createTemplateInstance(template) {
    const normalized = normalizeTemplate(template);
    if (!normalized) return null;
    return {
        id: createId('instance'),
        templateId: normalized.id,
        name: normalized.name,
        content: normalized.content,
        enabled: true,
    };
}

export function composeFinalPrompt(state) {
    const normalized = normalizeChatState(state);
    if (!normalized.enabled) return '';
    const blocks = [normalized.baseContent.trim()];
    for (const instance of normalized.templateInstances) {
        if (instance.enabled) blocks.push(instance.content.trim());
    }
    return blocks.filter(Boolean).join('\n\n');
}

export function resolvePersonaPlacement(context = {}) {
    const settings = context.powerUserSettings || {};
    const metadata = context.chatMetadata || {};
    const personaPosition = finiteNumber(settings.persona_description_position, PERSONA_POSITIONS.IN_PROMPT);
    const personaDepth = Math.max(0, finiteNumber(settings.persona_description_depth, 2));
    const personaRole = finiteNumber(settings.persona_description_role, PROMPT_ROLES.SYSTEM);

    if (personaPosition === PERSONA_POSITIONS.NONE) {
        return {
            position: PROMPT_POSITIONS.NONE,
            depth: 0,
            role: PROMPT_ROLES.SYSTEM,
            positionLabel: 'NONE',
            roleLabel: 'System',
            followsPersona: true,
        };
    }

    if (personaPosition === PERSONA_POSITIONS.AT_DEPTH) {
        return {
            position: PROMPT_POSITIONS.IN_CHAT,
            depth: personaDepth,
            role: personaRole,
            positionLabel: 'IN_CHAT',
            roleLabel: roleLabel(personaRole),
            followsPersona: true,
        };
    }

    if ([PERSONA_POSITIONS.TOP_AN, PERSONA_POSITIONS.BOTTOM_AN].includes(personaPosition)) {
        const notePosition = finiteNumber(metadata.note_position, PROMPT_POSITIONS.IN_CHAT);
        const noteDepth = Math.max(0, finiteNumber(metadata.note_depth, 4));
        const noteRole = finiteNumber(metadata.note_role, PROMPT_ROLES.SYSTEM);
        return {
            position: notePosition,
            depth: noteDepth,
            role: noteRole,
            positionLabel: personaPosition === PERSONA_POSITIONS.TOP_AN ? 'TOP_AN' : 'BOTTOM_AN',
            roleLabel: roleLabel(noteRole),
            followsPersona: true,
        };
    }

    return {
        position: PROMPT_POSITIONS.IN_PROMPT,
        depth: 0,
        role: PROMPT_ROLES.SYSTEM,
        positionLabel: 'IN_PROMPT',
        roleLabel: 'System',
        followsPersona: true,
    };
}

export function roleLabel(role) {
    return ({
        [PROMPT_ROLES.SYSTEM]: 'System',
        [PROMPT_ROLES.USER]: 'User',
        [PROMPT_ROLES.ASSISTANT]: 'Assistant',
    })[role] || 'System';
}

export function placementSummary(placement) {
    const depth = placement.position === PROMPT_POSITIONS.IN_CHAT || ['TOP_AN', 'BOTTOM_AN'].includes(placement.positionLabel)
        ? ` · Depth ${placement.depth}`
        : '';
    return `${placement.positionLabel}${depth} · ${placement.roleLabel}`;
}
