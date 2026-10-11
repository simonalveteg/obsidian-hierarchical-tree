import type { TFile } from 'obsidian';
import type { TreeNode } from '../core/tree';
import { SvelteSet } from 'svelte/reactivity';

export class TreeStore {
    autoReveal = $state(true);
    roots = $state.raw<TreeNode[]>([]);
    selectedPath = $state<string | null>(null);
    selectedKey = $state<string | null>(null);
    focusedKey = $state<string | null>(null);
    expanded = new SvelteSet<string>();
    dragging = $state.raw<{ file: TFile; parent: TFile | null } | null>(null);

    reveal(path: string): void {
        this.selectedPath = path || null;
        this.selectedKey = null;
        const focusedRoot = this.roots.find(
            (root) =>
                root.kind === 'group' &&
                (this.focusedKey === root.key ||
                    this.focusedKey?.startsWith(`${root.key}/`)) &&
                this.expanded.has(root.key),
        );
        function findMatch(
            node: TreeNode,
            ancestors: string[],
        ): { node: TreeNode; ancestors: string[] } | null {
            if (node.kind === 'file' && node.file.path === path) {
                return { node, ancestors };
            }
            for (const child of node.children) {
                const match = findMatch(child, [...ancestors, node.key]);
                if (match) return match;
            }
            return null;
        }
        let match = focusedRoot ? findMatch(focusedRoot, []) : null;
        if (!match) {
            for (const root of this.roots) {
                match = findMatch(root, []);
                if (match) break;
            }
        }
        if (match) {
            this.selectedKey = match.node.key;
            for (const key of match.ancestors) this.expanded.add(key);
        }
        const containsFocus = (node: TreeNode): boolean =>
            node.key === this.focusedKey || node.children.some(containsFocus);
        if (!this.roots.some(containsFocus)) {
            this.focusedKey = this.selectedKey ?? this.roots[0]?.key ?? null;
        }
    }
}
