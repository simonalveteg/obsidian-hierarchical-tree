import { Plugin, WorkspaceLeaf } from 'obsidian';
import { NoteTreeView, VIEW_TYPE_NOTE_TREE } from './ui/view';
import { DEFAULT_SETTINGS, type NoteHierarchySettings } from './settings';

export default class NoteHierarchy extends Plugin {
    settings: NoteHierarchySettings = DEFAULT_SETTINGS;

    async onload() {
        const saved =
            (await this.loadData()) as Partial<NoteHierarchySettings> | null;
        this.settings = {
            ...DEFAULT_SETTINGS,
            ...saved,
            builtinGroups: {
                vault: {
                    ...DEFAULT_SETTINGS.builtinGroups.vault,
                    ...saved?.builtinGroups?.vault,
                },
                orphans: {
                    ...DEFAULT_SETTINGS.builtinGroups.orphans,
                    ...saved?.builtinGroups?.orphans,
                },
            },
            customGroups: saved?.customGroups ?? DEFAULT_SETTINGS.customGroups,
        };

        this.registerView(
            VIEW_TYPE_NOTE_TREE,
            (leaf) =>
                new NoteTreeView(leaf, this.settings, () =>
                    this.saveData(this.settings),
                ),
        );

        this.addCommand({
            id: 'open-note-tree-view',
            name: 'Open note tree view',
            callback: () => this.activateView(),
        });
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null =
            workspace.getLeavesOfType(VIEW_TYPE_NOTE_TREE)[0] ?? null;

        if (!leaf) {
            leaf = workspace.getLeftLeaf(false);
            if (!leaf) return;
            await leaf.setViewState({
                type: VIEW_TYPE_NOTE_TREE,
                active: true,
            });
        }

        await workspace.revealLeaf(leaf);
    }
}
