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
        function findMatches(
            node: TreeNode,
            ancestors: string[],
        ): { node: TreeNode; ancestors: string[] }[] {
            if (node.kind === 'file' && node.file.path === path) {
                return [{ node, ancestors }];
            }
            const matches: { node: TreeNode; ancestors: string[] }[] = [];
            for (const child of node.children) {
                matches.push(...findMatches(child, [...ancestors, node.key]));
            }
            return matches;
        }
        const matches = this.roots.flatMap((root) => findMatches(root, []));
        const focusedMatch = matches.find(
            (match) =>
                match.node.key === this.focusedKey &&
                match.node.kind === 'file' &&
                match.node.file.path === path,
        );
        const focusedMatches = focusedRoot
            ? findMatches(focusedRoot, [])
            : [];
        const match = focusedMatch ?? focusedMatches[0] ?? matches[0];
        if (match) this.selectedKey = match.node.key;
        for (const found of matches) {
            for (const key of found.ancestors) this.expanded.add(key);
        }
        const containsFocus = (node: TreeNode): boolean =>
            node.key === this.focusedKey || node.children.some(containsFocus);
        if (!this.roots.some(containsFocus)) {
            this.focusedKey = this.selectedKey ?? this.roots[0]?.key ?? null;
        }
    }
}
