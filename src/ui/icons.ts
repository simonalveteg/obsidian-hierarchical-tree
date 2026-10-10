import { setIcon, type App, type TFile } from 'obsidian';

const iconCache = new Map<string, boolean>();

function iconExists(name: string): boolean {
    let exists = iconCache.get(name);
    if (exists === undefined) {
        const element = document.body.createDiv();
        setIcon(element, name);
        exists = element.childElementCount > 0;
        iconCache.set(name, exists);
    }
    return exists;
}

export function frontmatterIcon(app: App, file: TFile): string | null {
    const name = normalizeIcon(
        app.metadataCache.getFileCache(file)?.frontmatter?.icon,
    );
    return name && iconExists(name) ? name : null;
}

export function normalizeIcon(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const name = value
        .trim()
        .replace(/^Li/, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase();
    return name || null;
}
