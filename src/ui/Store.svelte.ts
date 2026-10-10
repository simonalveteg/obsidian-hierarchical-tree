import type { TreeNode } from '../tree';
import { SvelteSet } from 'svelte/reactivity';

export class SelectionStore {
    selectedPath = $state<string | null>(null);
    expanded = new SvelteSet<string>();
}

export class TreeStore {
    roots = $state.raw<TreeNode[]>([]);
    constructor(public readonly selection: SelectionStore) {}
}