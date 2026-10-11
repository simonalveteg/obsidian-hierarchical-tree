import { setIcon, type App } from 'obsidian';
import type { TreeNode } from '../core/tree';
import type { TreeStore } from './store.svelte';
import { addChildNote } from '../actions/createNote';

function expandAll(nodes: TreeNode[], expanded: Set<string>): void {
    for (const node of nodes) {
        if (!node.children.length) continue;
        expanded.add(node.key);
        expandAll(node.children, expanded);
    }
}

function createButton(parent: HTMLElement, label: string, icon: string | null, onClick: (e: MouseEvent) => void): HTMLButtonElement {
    const button = parent.createEl('button', {
        cls: 'clickable-icon',
        attr: { type: 'button', 'aria-label': label },
    });
    if (icon) {
        setIcon(button, icon);
    }
    button.addEventListener('click', onClick);
    return button;
}

export function createTreeToolbar(app: App, container: HTMLElement, store: TreeStore) {
    const toolbar = container.createDiv({
        cls: 'note-tree-toolbar',
        attr: { role: 'toolbar' },
    });

    createButton(toolbar, 'New note', 'square-pen', () => {
        void addChildNote(app).then((file) => app.workspace.getLeaf(false).openFile(file));
    });
    const revealButton = createButton(toolbar, 'Auto-reveal current file', 'gallery-vertical', () => {
        store.autoReveal = !store.autoReveal;
    });
    const collapseButton = createButton(toolbar, 'Expand all', null, () => {
        if (store.expanded.size > 0) store.expanded.clear();
        else expandAll(store.roots, store.expanded);
    });

    const destroy = $effect.root(() => {
        $effect(() => {
            const anyExpanded = store.expanded.size > 0;
            collapseButton.setAttribute('aria-label', anyExpanded ? 'Collapse all' : 'Expand all');
            setIcon(collapseButton, anyExpanded ? 'chevrons-down-up' : 'chevrons-up-down');
        });
        $effect(() => { revealButton.setAttribute('aria-pressed', String(store.autoReveal)); });
    });

    return { toolbar, destroy };
}