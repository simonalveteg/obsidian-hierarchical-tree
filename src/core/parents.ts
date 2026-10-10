import type { App, TFile } from 'obsidian';
import { getLinkpath } from 'obsidian';

export type ParentIndex = Map<string, TFile[]>;

export function buildParentIndex(
    app: App,
    files: TFile[],
    parentKey = 'up',
): ParentIndex {
    const included = new Set(files.map((file) => file.path));
    const index: ParentIndex = new Map();

    for (const file of files) {
        const parents = new Map<string, TFile>();
        const links =
            app.metadataCache.getFileCache(file)?.frontmatterLinks ?? [];
        for (const { key, link } of links) {
            if (key !== parentKey && !key.startsWith(`${parentKey}.`)) continue;
            const parent = app.metadataCache.getFirstLinkpathDest(
                getLinkpath(link),
                file.path,
            );
            if (
                !parent ||
                parent.extension !== 'md' ||
                !included.has(parent.path) ||
                parent.path === file.path
            )
                continue;
            parents.set(parent.path, parent);
        }
        index.set(file.path, [...parents.values()]);
    }

    return index;
}

export function isDescendant(
    index: ParentIndex,
    candidate: TFile,
    ancestor: TFile,
): boolean {
    const visited = new Set<string>();
    const pending = [...(index.get(candidate.path) ?? [])];

    while (pending.length > 0) {
        const parent = pending.pop()!;
        if (parent.path === ancestor.path) return true;
        if (visited.has(parent.path)) continue;
        visited.add(parent.path);
        pending.push(...(index.get(parent.path) ?? []));
    }

    return false;
}
