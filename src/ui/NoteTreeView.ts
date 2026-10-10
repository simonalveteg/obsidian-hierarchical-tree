import { ItemView, WorkspaceLeaf, TFile, debounce, getAllTags } from 'obsidian';
import { mount, unmount } from 'svelte';
import { buildRoots, nodeKey, TreeGroup } from '../tree';
import { SelectionStore, TreeStore } from './Store.svelte';
import Tree from './Tree.svelte';

interface MountedTree {
    store: TreeStore;
    el: HTMLElement;
    component: ReturnType<typeof mount>;
}

export const VIEW_TYPE_NOTE_TREE = 'note-tree-view';

export class NoteTreeView extends ItemView {
    private selection = new SelectionStore();
    private trees = new Map<string, MountedTree>();

    private fleeting = new TreeGroup(
        'fleeting',
        'Fleeting',
        (file) => {
            const cache = this.app.metadataCache.getFileCache(file);
            return cache ? (getAllTags(cache) ?? []).includes('#note/fleeting') : false;
        },
        (a, b) => b.stat.mtime - a.stat.mtime,
    );
    private groups = [this.fleeting]

    private refreshTrees() {
        const nodes = buildRoots(this.app, this.groups);
        const seen = new Set<string>();
        const order: HTMLElement[] = [];

        for (const node of nodes) {
            const key = nodeKey(node);
            seen.add(key);

            let tree = this.trees.get(key);
            if (!tree) {
                const store = new TreeStore(this.selection);
                const el = this.contentEl.createDiv({ cls: 'note-tree-group' });
                const component = mount(Tree, {
                    target: el,
                    props: {
                        store,
                        onOpen: (file: TFile) => {
                            void this.app.workspace.getLeaf(false).openFile(file);
                        },
                    },
                });
                tree = { store, el, component };
                this.trees.set(key, tree);
            }

            tree.store.roots = [node];
            order.push(tree.el);
        }

        for (const [key, tree] of this.trees) {
            if (seen.has(key)) continue;
            void unmount(tree.component);
            tree.el.remove();
            this.trees.delete(key);
        }

        // Appending an existing element moves it, so this restores group order.
        this.contentEl.append(...order);
    }

    private rebuild = debounce(() => this.refreshTrees(), 300, true);

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
        return 'list-tree';
    }

    async onOpen() {
        this.contentEl.empty();
        this.selection.selectedPath = this.app.workspace.getActiveFile()?.path ?? null;
        this.rebuild();

        const refresh = () => this.rebuild();
        this.registerEvent(this.app.metadataCache.on('changed', refresh));
        this.registerEvent(this.app.metadataCache.on('resolved', refresh));
        this.registerEvent(this.app.vault.on('rename', refresh));
        this.registerEvent(this.app.vault.on('delete', refresh));
        this.registerEvent(this.app.workspace.on('file-open', (file) => {
            this.selection.selectedPath = file?.path ?? null;
        }),
        );
    }

    async onClose() {
        for (const tree of this.trees.values()) void unmount(tree.component);
        this.trees.clear();
    }
}