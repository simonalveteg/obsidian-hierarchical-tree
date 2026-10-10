import { getAllTags, type App, type TFile } from 'obsidian';
import { TreeGroup } from './core/tree';
import type { NoteHierarchySettings } from './settings';

export function createGroups(
    app: App,
    settings: NoteHierarchySettings,
): TreeGroup[] {
    return [
        new TreeGroup(
            'fleeting',
            'Fleeting',
            'leaf',
            (file: TFile) => {
                const cache = app.metadataCache.getFileCache(file);
                return cache
                    ? (getAllTags(cache) ?? []).includes(settings.fleetingTag)
                    : false;
            },
            (a: TFile, b: TFile) => b.stat.mtime - a.stat.mtime,
        ),
    ];
}
