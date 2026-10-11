export const WAND_ID = 'persona_overlay_wand';

function bindActivation(item, onClick) {
    if (item._personaOverlayActivate) {
        item.removeEventListener?.('click', item._personaOverlayActivate);
        item.removeEventListener?.('keydown', item._personaOverlayActivate);
    }
    const activate = event => {
        if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
        event.preventDefault?.();
        onClick?.();
    };
    item._personaOverlayActivate = activate;
    item.addEventListener('click', activate);
    item.addEventListener('keydown', activate);
}

export function ensureWandMenuItem(doc, onClick) {
    const existing = doc.getElementById(WAND_ID);
    if (existing) {
        bindActivation(existing, onClick);
        return existing;
    }
    const menu = doc.getElementById('extensionsMenu');
    if (!menu) return null;

    const item = doc.createElement('div');
    item.id = WAND_ID;
    item.className = 'list-group-item flex-container flexGap5';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('title', 'Open Persona Overlay quick editor');

    const icon = doc.createElement('div');
    icon.className = 'fa-solid fa-user-pen extensionsMenuExtensionButton';
    const label = doc.createElement('span');
    label.textContent = 'Persona Overlay';
    item.append(icon, label);

    bindActivation(item, onClick);
    menu.append(item);
    return item;
}

export function removeWandMenuItem(doc) {
    doc.getElementById(WAND_ID)?.remove();
}
