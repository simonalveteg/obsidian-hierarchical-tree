import { Plugin, WorkspaceLeaf } from 'obsidian';
import { NoteTreeView, VIEW_TYPE_NOTE_TREE } from './ui/view';

export default class NoteHierarchy extends Plugin {

    async onload() {
        this.registerView(
            VIEW_TYPE_NOTE_TREE,
            (leaf) => new NoteTreeView(leaf)
        );

        this.addCommand({
            id: 'open-note-tree-view',
            name: 'Open Note Tree View',
            callback: () => this.activateView(),
        });
    }

    onunload() {
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null =
            workspace.getLeavesOfType(VIEW_TYPE_NOTE_TREE)[0] ?? null;

        if (!leaf) {
            leaf = workspace.getLeftLeaf(false);
            if (!leaf) return;
            await leaf.setViewState({ type: VIEW_TYPE_NOTE_TREE, active: true });
        }

        await workspace.revealLeaf(leaf);
    }
}