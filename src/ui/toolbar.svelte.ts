import { setIcon } from 'obsidian';
import type { TreeNode } from '../core/tree';
import type { TreeStore } from './store.svelte';

function expandNodes(nodes: TreeNode[], expanded: Set<string>): void {
    for (const node of nodes) {
        if (node.children.length) {
            expanded.add(node.key);
            expandNodes(node.children, expanded);
        }
    }
}

export function createTreeToolbar(container: HTMLElement, store: TreeStore) {
    const toolbar = container.createDiv({
        cls: 'note-tree-toolbar',
        attr: { role: 'toolbar', 'aria-label': 'Tree controls' },
    });
    const button = toolbar.createEl('button', {
        cls: 'clickable-icon',
        attr: { type: 'button' },
    });

    button.addEventListener('click', () => {
        if (store.expanded.size > 0) store.expanded.clear();
        else expandNodes(store.roots, store.expanded);
    });

    const destroy = $effect.root(() => {
        $effect(() => {
            const collapse = store.expanded.size > 0;
            const label = collapse ? 'Collapse all' : 'Expand all';
            button.title = label;
            button.setAttribute('aria-label', label);
            setIcon(button, collapse ? 'chevrons-down-up' : 'chevrons-up-down');
        });
    });

    return { toolbar, destroy };
}