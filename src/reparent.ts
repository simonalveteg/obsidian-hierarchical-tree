import { getParents, isDescendant, resolveLink } from './tree';
import { App, Notice, TFile } from 'obsidian';

export function canDrop(app: App, candidate: TFile, target: TFile, parent: TFile | null, add: boolean): boolean {
    if (candidate.path === target.path) return false;
    if (isDescendant(app, target, candidate)) return false;
    if (add || parent === null) {
        if (getParents(app, candidate).some((p) => p.path === target.path)) return false;
    }
    if (!add && parent !== null && target.path === parent.path) return false;
    return true;
}

export async function tryDrop(
    app: App,
    candidate: TFile,
    target: TFile,
    fromParent: TFile | null,
    add: boolean
): Promise<boolean> {
    if (!canDrop(app, candidate, target, fromParent, add)) return false;

    const linktext = app.metadataCache.fileToLinktext(target, candidate.path, true);
    const link = `[[${linktext}]]`;

    try {
        await app.fileManager.processFrontMatter(candidate, (fm) => {
            const raw: unknown = fm.up;
            let entries: unknown[];
            if (raw === undefined || raw === null) entries = [];
            else if (Array.isArray(raw)) entries = [...raw];
            else entries = [raw];

            if (!add && fromParent !== null) {
                entries = entries.filter(
                    (e) => resolveLink(app, e, candidate.path)?.path !== fromParent.path
                );
            }

            const hasTarget = entries.some(
                (e) => resolveLink(app, e, candidate.path)?.path === target.path
            );
            if (!hasTarget) entries.push(link);

            fm.up = entries;
        });
        return true;
    } catch (error) {
        console.error('tryDrop failed', error);
        new Notice('Could not update parents');
        return false;
    }
}