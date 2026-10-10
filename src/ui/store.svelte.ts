import type { TFile } from 'obsidian';
import type { TreeNode } from '../core/tree';
import { SvelteSet } from 'svelte/reactivity';

export class TreeStore {
    roots = $state.raw<TreeNode[]>([]);
    selectedPath = $state<string | null>(null);
    selectedKey = $state<string | null>(null);
    focusedKey = $state<string | null>(null);
    expanded = new SvelteSet<string>();
    dragging = $state.raw<{ file: TFile; parent: TFile | null } | null>(null);

    reveal(path: string): void {
        this.selectedPath = path || null;
        this.selectedKey = null;
        const visit = (node: TreeNode, ancestors: string[]): boolean => {
            if (node.kind === 'file' && node.file.path === path) {
                this.selectedKey = node.key;
                for (const key of ancestors) this.expanded.add(key);
                return true;
            }
            for (const child of node.children) {
                if (visit(child, [...ancestors, node.key])) return true;
            }
            return false;
        };
        for (const root of this.roots) if (visit(root, [])) break;
        const containsFocus = (node: TreeNode): boolean =>
            node.key === this.focusedKey || node.children.some(containsFocus);
        if (!this.roots.some(containsFocus)) {
            this.focusedKey = this.selectedKey ?? this.roots[0]?.key ?? null;
        }
    }
}
