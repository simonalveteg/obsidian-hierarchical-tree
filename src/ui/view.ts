import { ItemView, WorkspaceLeaf, TFile, debounce, getAllTags, Menu } from 'obsidian';
import { mount, tick, unmount } from 'svelte';
import { ancestorKeys, buildRoots, collectFiles, nodeFile, nodeKey, TreeGroup, type TreeNode } from '../tree';
import { SelectionStore, TreeStore } from './Store.svelte';
import { canDrop, tryDrop } from '../reparent';
import { IconModal } from './IconModal';
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
    private lastNodes: TreeNode[] = [];

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
            this.reveal(this.selection.selectedPath ?? '');
        }),
        );
    }

    async onClose() {
        for (const tree of this.trees.values()) void unmount(tree.component);
        this.trees.clear();
    }

    private fleeting = new TreeGroup(
        'fleeting',
        'Fleeting',
        'leaf',
        (file) => {
            const cache = this.app.metadataCache.getFileCache(file);
            return cache ? (getAllTags(cache) ?? []).includes('#note/fleeting') : false;
        },
        (a, b) => b.stat.mtime - a.stat.mtime,
    );
    private groups = [this.fleeting]

    private rebuild = debounce(() => this.refreshTrees(), 300, true);

    private async refreshTrees() {
        const nodes = buildRoots(this.app, this.groups);
        this.lastNodes = nodes;
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
                        onContextMenu: (node: TreeNode, e: MouseEvent) => this.showMenu(node, e),
                        canDrop: (candidate: TFile, target: TFile, parent: TFile | null, add: boolean) => this.canDrop(candidate, target, parent, add),
                        tryDrop: (candidate: TFile, target: TFile, fromParent: TFile | null, add: boolean) => this.tryDrop(candidate, target, fromParent, add),
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

        this.contentEl.append(...order);
        this.reveal(this.selection.selectedPath ?? '');
    }

    private reveal(path: string) {
        for (const key of ancestorKeys(this.lastNodes, path)) {
            this.selection.expanded.add(key);
        }
        this.scrollToSelected();
    }

    private scrollIntoMiddle(el: HTMLElement) {
        const scrollable = this.contentEl;
        const elRect = el.getBoundingClientRect();
        const boxRect = scrollable.getBoundingClientRect();

        const top = elRect.top - boxRect.top + scrollable.scrollTop;
        const target = elRect.height <= boxRect.height
            ? top - boxRect.height / 2 + elRect.height / 2
            : top;

        scrollable.scrollTo({ top: target });
    }

    private canDrop(candidate: TFile, target: TFile, parent: TFile | null, add: boolean): boolean {
        return canDrop(this.app, candidate, target, parent, add);
    }

    private async tryDrop(candidate: TFile, target: TFile, fromParent: TFile | null, add: boolean): Promise<boolean> {
        return tryDrop(this.app, candidate, target, fromParent, add);
    }

    private async scrollToSelected() {
        await tick();
        const row = this.contentEl.querySelector<HTMLElement>('.note-tree-row.is-selected');
        if (row) this.scrollIntoMiddle(row);
    }

    private showMenu(node: TreeNode, e: MouseEvent) {
        const menu = new Menu();
        const file = nodeFile(node);

        if (file) {
            menu.addItem((i) => i.setTitle('Add new note').setIcon('plus').onClick(() => this.addChildNote(file)));
            menu.addItem((i) => i.setTitle('Manage icon').setIcon('image').onClick(() => new IconModal(this.app, file).open()));
            menu.addSeparator();
            menu.addItem((i) => i.setTitle('Delete note').setIcon('trash'));
            menu.addItem((i) => i.setTitle('Delete note with children').setIcon('trash'));
            menu.addItem((i) => i.setTitle('Share note').setIcon('share'));
            menu.addItem((i) => i.setTitle('Share note with children').setIcon('share'));
        } else if (node.item instanceof TreeGroup) {
            const group = node.item;
            menu.addItem((i) => i.setTitle('Edit group filter').setIcon('filter'));
        }

        menu.showAtMouseEvent(e);
    }

    private async addChildNote(parent: TFile) {
        const path = parent.parent?.path ?? '';
        const file = await this.app.vault.create(`${path}/New Note.md`, `---\nup: ["[[${parent.basename}]]"]\n---\n`);
        await this.app.workspace.getLeaf(false).openFile(file);
    }
}