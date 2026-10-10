import { ItemView, WorkspaceLeaf, TFile, debounce } from 'obsidian';
import { mount, unmount } from 'svelte';
import { buildTree } from '../tree';
import { TreeStore } from './Store.svelte';
import Tree from './Tree.svelte';

export const VIEW_TYPE_NOTE_TREE = 'note-tree-view';

export class NoteTreeView extends ItemView {
    private store = new TreeStore();
    private component: ReturnType<typeof mount> | null = null;

    // Trailing-edge debounce: waits until events stop for 300 ms.
    private rebuild = debounce(
        () => {
            this.store.roots = buildTree(this.app);
        },
        300,
        true,
    );

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return VIEW_TYPE_NOTE_TREE;
    }

    getDisplayText() {
        return 'Note tree';
    }

    getIcon() {
        return 'folder-tree';
    }

    async onOpen() {
        this.contentEl.empty();
        this.store.roots = buildTree(this.app);
        this.store.selectedPath = this.app.workspace.getActiveFile()?.path ?? null;

        this.component = mount(Tree, {
            target: this.contentEl,
            props: {
                store: this.store,
                onOpen: (file: TFile) => {
                    void this.app.workspace.getLeaf(false).openFile(file);
                },
            },
        });

        const refresh = () => this.rebuild();
        this.registerEvent(this.app.metadataCache.on('changed', refresh));
        this.registerEvent(this.app.metadataCache.on('resolved', refresh));
        this.registerEvent(this.app.vault.on('rename', refresh));
        this.registerEvent(this.app.vault.on('delete', refresh));
        this.registerEvent(this.app.workspace.on('file-open', (file) => {
                this.store.selectedPath = file?.path ?? null;
            }),
        );
    }

    async onClose() {
        if (this.component) {
            await unmount(this.component);
            this.component = null;
        }
    }
}