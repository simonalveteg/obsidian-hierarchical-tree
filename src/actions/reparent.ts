import { Notice, type App, type TFile } from 'obsidian';
import type { ParentIndex } from '../core/parents';
import { isDescendant } from '../core/parents';
import { resolveLink, linkToFile } from '../core/links';

export function canDrop(
    parentIndex: ParentIndex,
    candidate: TFile,
    target: TFile,
    parent: TFile | null,
    add: boolean,
): boolean {
    if (candidate.path === target.path) return false;
    if (isDescendant(parentIndex, target, candidate)) return false;
    if (add || parent === null) {
        if (
            (parentIndex.get(candidate.path) ?? []).some(
                (item) => item.path === target.path,
            )
        )
            return false;
    }
    if (!add && parent !== null && target.path === parent.path) return false;
    return true;
}

export async function tryDrop(
    app: App,
    parentIndex: ParentIndex,
    candidate: TFile,
    target: TFile,
    fromParent: TFile | null,
    add: boolean,
    parentKey = 'up',
): Promise<boolean> {
    if (!canDrop(parentIndex, candidate, target, fromParent, add)) return false;
    const link = linkToFile(app, target, candidate.path);

    try {
        await app.fileManager.processFrontMatter(
            candidate,
            (frontmatter: Record<string, unknown>) => {
                const raw: unknown = frontmatter[parentKey];
                let entries: unknown[];
                if (raw === undefined || raw === null) entries = [];
                else if (Array.isArray(raw)) entries = [...(raw as unknown[])];
                else entries = [raw];

                if (!add && fromParent !== null) {
                    entries = entries.filter(
                        (entry) =>
                            resolveLink(app, entry, candidate.path)?.path !==
                            fromParent.path,
                    );
                }
                if (
                    !entries.some(
                        (entry) =>
                            resolveLink(app, entry, candidate.path)?.path ===
                            target.path,
                    )
                )
                    entries.push(link);
                frontmatter[parentKey] = entries;
            },
        );
        return true;
    } catch (error) {
        console.error('tryDrop failed', error);
        new Notice('Could not update parents');
        return false;
    }
}
