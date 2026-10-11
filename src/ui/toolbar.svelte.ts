import { setIcon } from 'obsidian';
import type { TreeNode } from '../core/tree';
import type { TreeStore } from './store.svelte';

function expandAll(nodes: TreeNode[], expanded: Set<string>): void {
    for (const node of nodes) {
        if (!node.children.length) continue;
        expanded.add(node.key);
        expandAll(node.children, expanded);
    }
}

function createButton(parent: HTMLElement, label: string): HTMLButtonElement {
    return parent.createEl('button', {
        cls: 'clickable-icon',
        attr: { type: 'button', 'aria-label': label },
    });
}

function renderCollapseButton(button: HTMLElement, anyExpanded: boolean): void {
    button.setAttribute('aria-label', anyExpanded ? 'Collapse all' : 'Expand all');
    setIcon(button, anyExpanded ? 'chevrons-down-up' : 'chevrons-up-down');
}

export function createTreeToolbar(container: HTMLElement, store: TreeStore) {
    const toolbar = container.createDiv({
        cls: 'note-tree-toolbar',
        attr: { role: 'toolbar' },
    });

    const collapseButton = createButton(toolbar, 'Expand all');
    const revealButton = createButton(toolbar, 'Auto-reveal current file');
    setIcon(revealButton, 'gallery-vertical');

    collapseButton.addEventListener('click', () => {
        if (store.expanded.size > 0) store.expanded.clear();
        else expandAll(store.roots, store.expanded);
    });
    revealButton.addEventListener('click', () => {
        store.autoReveal = !store.autoReveal;
    });

    const destroy = $effect.root(() => {
        $effect(() => renderCollapseButton(collapseButton, store.expanded.size > 0));
        $effect(() => {
            revealButton.setAttribute('aria-pressed', String(store.autoReveal));
        });
    });

    return { toolbar, destroy };
}