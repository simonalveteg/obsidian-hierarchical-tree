import { ItemView, WorkspaceLeaf, TFile, debounce, getAllTags } from 'obsidian';
import { mount, unmount } from 'svelte';
import { buildParentIndex, type ParentIndex } from '../core/parents';
import { buildRoots, type GroupSet, type TreeNode } from '../core/tree';
import { addChildNote } from '../actions/createNote';
import { canDrop, tryDrop } from '../actions/reparent';
import type { NoteHierarchySettings } from '../settings';
import { createGroups } from '../core/groups';
import { TreeStore } from './store.svelte';
import { showMenu, type SortControls } from './menu';
import { frontmatterIcon } from './icons';
import { createTreeToolbar } from './toolbar.svelte';
import { type SortId } from '../core/sorting';
import Tree from './Tree.svelte';

export const VIEW_TYPE_NOTE_TREE = 'note-tree-view';

type MountedTree = ReturnType<typeof mount>;

export class NoteTreeView extends ItemView {
    private readonly store = new TreeStore();
    private groups: GroupSet;
    private components: MountedTree[] = [];
    private parentIndex: ParentIndex = new Map();
    private signatures = new Map<string, string>();
    private rebuild = debounce(() => this.refreshTrees(), 300, true);

    constructor(
        leaf: WorkspaceLeaf,
        private readonly settings: NoteHierarchySettings,
        private readonly saveSettings: () => Promise<void>,
    ) {
        super(leaf);
        this.groups = createGroups(this.settings);
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

    private groupSettings(id: string): { sort?: SortId } | undefined {
        if (id === 'vault' || id === 'orphans')
            return this.settings.builtinGroups[id];
        return this.settings.customGroups.find((g) => g.id === id);
    }

    private applySortChange() {
        this.groups = createGroups(this.settings);
        void this.saveSettings();
        this.refreshTrees();
    }

    private readonly sortControls: SortControls = {
        getDefault: () => this.settings.defaultSort,
        targets: () =>
            [this.groups.vault, this.groups.orphans, ...this.groups.custom].map(
                (g) => ({
                    id: g.id,
                    label: g.label,
                    icon: g.icon,
                    current: this.groupSettings(g.id)?.sort,
                }),
            ),
        setDefault: (id) => {
            this.settings.defaultSort = id;
            this.applySortChange();
        },
        setOverride: (groupId, id) => {
            const group = this.groupSettings(groupId);
            if (!group) return;
            if (id === undefined) delete group.sort;
            else group.sort = id;
            this.applySortChange();
        },
    };

    async onOpen() {
        this.contentEl.empty();
        this.store.selectedPath =
            this.app.workspace.getActiveFile()?.path ?? null;
        createTreeToolbar(
            this.app,
            this.contentEl,
            this.store,
            this.sortControls,
        );
        const treeContainer = this.contentEl.createDiv({
            cls: 'note-tree-container',
        });
        const actions = {
            onOpen: (file: TFile) => {
                void this.app.workspace.getLeaf(false).openFile(file);
            },
            onContextMenu: (node: TreeNode, event: MouseEvent) => {
                showMenu(
                    this.app,
                    node,
                    event,
                    (parent) => {
                        void addChildNote(
                            this.app,
                            parent,
                            this.settings.parentKey,
                        ).then((file) =>
                            this.app.workspace.getLeaf(false).openFile(file),
                        );
                    },
                    this.sortControls,
                );
            },
            canDrop: (
                candidate: TFile,
                target: TFile,
                parent: TFile | null,
                add: boolean,
            ) => canDrop(this.parentIndex, candidate, target, parent, add),
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
        };
        this.components = [
            this.groups.vault,
            this.groups.orphans,
            ...this.groups.custom,
        ].map((group) =>
            mount(Tree, {
                target: treeContainer,
                props: {
                    store: this.store,
                    groupId: `group:${group.id}`,
                    actions,
                },
            }),
        );

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
            this.app.workspace.on(
                'file-open',
                (file) =>
                    this.store.autoReveal &&
                    this.store.reveal(file?.path ?? ''),
            ),
        );
    }

    async onClose() {
        await Promise.all(
            this.components.map((component) => unmount(component)),
        );
        this.components = [];
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
            this.app,
            files,
            this.parentIndex,
            icons,
            this.groups,
        );
        this.store.reveal(this.store.selectedPath ?? '');
    }
}
