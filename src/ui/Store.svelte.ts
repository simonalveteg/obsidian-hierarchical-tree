import type { TreeNode } from '../tree';

export class TreeStore {
    // Reference-only reactivity: assign a new array to update, never mutate.
    roots = $state.raw<TreeNode[]>([]);
    selectedPath = $state<string | null>(null);
}