import type { TreeNode } from '../tree';

export class SelectionStore {
    selectedPath = $state<string | null>(null);
}

export class TreeStore {
    roots = $state.raw<TreeNode[]>([]);
    constructor(public readonly selection: SelectionStore) {}
}