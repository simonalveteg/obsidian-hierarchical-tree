import { ItemView, WorkspaceLeaf, TFile, debounce, getAllTags } from 'obsidian';
import { mount, unmount } from 'svelte';
import { buildParentIndex, type ParentIndex } from '../core/parents';
import { buildRoots, type TreeGroup, type TreeNode } from '../core/tree';
import { addChildNote } from '../actions/createNote';
import { canDrop, tryDrop } from '../actions/reparent';
import type { NoteHierarchySettings } from '../settings';
import { createGroups } from '../groups';
import { TreeStore } from './store.svelte';
import { showMenu } from './menu';
import { frontmatterIcon } from './icons';
import Tree from './Tree.svelte';

export const VIEW_TYPE_NOTE_TREE = 'note-tree-view';

type MountedTree = ReturnType<typeof mount>;

export class NoteTreeView extends ItemView {
    private readonly store = new TreeStore();
    private readonly groups: TreeGroup[];
    private component: MountedTree | null = null;
    private parentIndex: ParentIndex = new Map();
    private signatures = new Map<string, string>();
    private rebuild = debounce(() => this.refreshTrees(), 300, true);

    constructor(
        leaf: WorkspaceLeaf,
        private readonly settings: NoteHierarchySettings,
    ) {
        super(leaf);
        this.groups = createGroups(this.app, settings);
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
        this.store.selectedPath =
            this.app.workspace.getActiveFile()?.path ?? null;
        this.component = mount(Tree, {
            target: this.contentEl,
            props: {
                store: this.store,
                actions: {
                    onOpen: (file: TFile) => {
                        void this.app.workspace.getLeaf(false).openFile(file);
                    },
                    onContextMenu: (node: TreeNode, event: MouseEvent) => {
                        showMenu(this.app, node, event, (parent) => {
                            void addChildNote(
                                this.app,
                                parent,
                                this.settings.parentKey,
                            ).then((file) =>
                                this.app.workspace
                                    .getLeaf(false)
                                    .openFile(file),
                            );
                        });
                    },
                    canDrop: (
                        candidate: TFile,
                        target: TFile,
                        parent: TFile | null,
                        add: boolean,
                    ) =>
                        canDrop(
                            this.parentIndex,
                            candidate,
                            target,
                            parent,
                            add,
                        ),
                    tryDrop: (
                        candidate: TFile,
                        target: TFile,
                        parent: TFile | null,
                        add: boolean,
                    ) =>
                        tryDrop(
                            this.app,
                            this.parentIndex,
                            candidate,
                            target,
                            parent,
                            add,
                            this.settings.parentKey,
                        ),
                },
            },
        });

        this.refreshTrees();
        this.registerEvent(
            this.app.metadataCache.on('changed', (file) =>
                this.refreshIfRelevant(file),
            ),
        );
        this.registerEvent(
            this.app.metadataCache.on('resolved', () => this.rebuild()),
        );
        this.registerEvent(this.app.vault.on('rename', () => this.rebuild()));
        this.registerEvent(this.app.vault.on('delete', () => this.rebuild()));
        this.registerEvent(
            this.app.workspace.on('file-open', (file) =>
                this.store.reveal(file?.path ?? ''),
            ),
        );
    }

    async onClose() {
        if (this.component) {
            await unmount(this.component);
            this.component = null;
        }
    }

    private metadataSignature(file: TFile): string {
        const cache = this.app.metadataCache.getFileCache(file);
        return JSON.stringify([
            cache?.frontmatter?.[this.settings.parentKey],
            cache?.frontmatter?.icon,
            cache ? (getAllTags(cache) ?? []) : [],
        ]);
    }

    private refreshIfRelevant(file: TFile) {
        const signature = this.metadataSignature(file);
        if (this.signatures.get(file.path) !== signature) this.rebuild();
    }

    private refreshTrees() {
        const files = this.app.vault.getMarkdownFiles();
        this.parentIndex = buildParentIndex(
            this.app,
            files,
            this.settings.parentKey,
        );
        const icons = new Map(
            files.map((file) => [file.path, frontmatterIcon(this.app, file)]),
        );
        this.signatures = new Map(
            files.map((file) => [file.path, this.metadataSignature(file)]),
        );
        this.store.roots = buildRoots(
            files,
            this.parentIndex,
            icons,
            this.groups,
        );
        this.store.reveal(this.store.selectedPath ?? '');
    }
}
