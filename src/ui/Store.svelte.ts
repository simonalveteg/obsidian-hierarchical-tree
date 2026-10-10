import type { TFile } from 'obsidian';
import type { TreeNode } from '../tree';
import { SvelteSet } from 'svelte/reactivity';

export class SelectionStore {
    selectedPath = $state<string | null>(null);
    expanded = new SvelteSet<string>();
    dragging = $state.raw<{ file: TFile; parent: TFile | null } | null>(null);
}

export class TreeStore {
    roots = $state.raw<TreeNode[]>([]);
    constructor(public readonly selection: SelectionStore) {}
}