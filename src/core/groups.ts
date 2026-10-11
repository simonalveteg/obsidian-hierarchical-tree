import { App, getAllTags, type TFile } from 'obsidian';
import { TreeGroup, type GroupSet } from './tree';
import { getComparator } from './sorting';
import type { CustomGroupSettings, NoteHierarchySettings } from '../settings';

function normalizeTag(tag: string): string {
    const trimmed = tag.trim();
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function createTagGroup(
    s: CustomGroupSettings,
    defaultSort: NoteHierarchySettings['defaultSort'],
): TreeGroup {
    const tag = normalizeTag(s.tag);
    return new TreeGroup(
        s.id,
        s.label,
        s.icon,
        (file: TFile, app) => {
            const cache = app.metadataCache.getFileCache(file);
            return cache ? (getAllTags(cache) ?? []).includes(tag) : false;
        },
        getComparator(s.sort ?? defaultSort),
    );
}

export function createGroups(
    app: App,
    settings: NoteHierarchySettings): GroupSet {
    const { defaultSort, builtinGroups } = settings;
    return {
        vault: new TreeGroup(
            'vault',
            app.vault.getName(),
            'vault',
            undefined,
            getComparator(builtinGroups.vault.sort ?? defaultSort),
        ),
        orphans: new TreeGroup(
            'orphans',
            'Orphans',
            'circle-dot-dashed',
            undefined,
            getComparator(builtinGroups.orphans.sort ?? defaultSort),
        ),
        custom: settings.customGroups
            .filter((g) => g.enabled)
            .map((g) => createTagGroup(g, defaultSort)),
    };
}
