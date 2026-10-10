import type { App, TFile } from 'obsidian';

export function resolveLink(
    app: App,
    entry: unknown,
    fromPath: string,
): TFile | null {
    if (typeof entry !== 'string') return null;
    const text = entry.trim();

    let linkpath: string;
    const wiki = text.match(/^\[\[([^\]]+)\]\]$/);
    const markdown = text.match(/^\[[^\]]*\]\((.+)\)$/);

    if (wiki) {
        linkpath = (wiki[1] ?? '').split('|')[0]?.split('#')[0] ?? '';
    } else if (markdown) {
        let destination = (markdown[1] ?? '').trim();
        if (destination.startsWith('<') && destination.endsWith('>'))
            destination = destination.slice(1, -1);
        if (/^(https?|mailto|obsidian|file):/i.test(destination)) return null;
        try {
            destination = decodeURIComponent(destination);
        } catch {
            // Keep the raw destination if its escapes are malformed.
        }
        linkpath = destination.split('#')[0] ?? '';
    } else {
        return null;
    }

    linkpath = linkpath.trim();
    return linkpath
        ? app.metadataCache.getFirstLinkpathDest(linkpath, fromPath)
        : null;
}

export function linkToFile(app: App, file: TFile, fromPath: string): string {
    return `[[${app.metadataCache.fileToLinktext(file, fromPath, true)}]]`;
}
