import type { TFile } from 'obsidian';
import type { TreeNode } from '../core/tree';
import type { TreeStore } from './store.svelte';

export interface TreeContext {
    store: TreeStore;
    onOpen: (file: TFile) => void;
    onContextMenu: (node: TreeNode, event: MouseEvent) => void;
    canDrop: (
        candidate: TFile,
        target: TFile,
        parent: TFile | null,
        add: boolean,
    ) => boolean;
    tryDrop: (
        candidate: TFile,
        target: TFile,
        parent: TFile | null,
        add: boolean,
    ) => Promise<boolean>;
}

export const TREE_CONTEXT = Symbol('note-tree-context');
