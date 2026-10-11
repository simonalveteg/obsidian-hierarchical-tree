<script lang="ts">
    import { getContext } from 'svelte';
    import { setIcon, type TFile } from 'obsidian';
    import type { TreeNode } from '../core/tree';
    import { nodeLabel } from '../core/tree';
    import { TREE_CONTEXT, type TreeContext } from './treeContext';
    import TreeItem from './TreeItem.svelte';

    let { node, parent, level } = $props<{
        node: TreeNode;
        parent: TFile | null;
        level: number;
    }>();

    const { store, onOpen, onContextMenu, canDrop, tryDrop } =
        getContext<() => TreeContext>(TREE_CONTEXT)();
    const file = $derived(node.kind === 'file' ? node.file : null);
    const expanded = $derived(store.expanded.has(node.key));
    const hasChildren = $derived(node.children.length > 0);
    const childrenCount = $derived(node.children.length || '');
    const isSelected = $derived(file?.path === store.selectedPath);
    const isRevealTarget = $derived(node.key === store.selectedKey);
    const tabIndex = $derived(
        store.focusedKey === node.key ||
            (!store.focusedKey && node === store.roots[0])
            ? 0
            : -1,
    );
    let dragOver = $state<'move' | 'add' | null>(null);

    function chevron(element: HTMLElement) {
        setIcon(element, 'chevron-right');
    }

    function userIcon(element: HTMLElement, iconName: string | null) {
        if (iconName) setIcon(element, iconName);
        return {
            update(next: string | null) {
                element.empty();
                if (next) setIcon(element, next);
            },
        };
    }

    function setExpanded(value: boolean) {
        if (value) store.expanded.add(node.key);
        else store.expanded.delete(node.key);
    }

    function toggle() {
        setExpanded(!expanded);
    }

    function onClick() {
        if (file) {
            store.focusedKey = node.key;
            store.selectedPath = file.path;
            store.selectedKey = node.key;
            onOpen(file);
        } else toggle();
    }

    function handleItemClick(event: MouseEvent) {
        if (
            event.target instanceof Element &&
            event.target.closest('.note-tree-item') === event.currentTarget
        )
            onClick();
    }

    function handleContextMenu(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (
            event.target instanceof Element &&
            event.target.closest('.note-tree-item') === event.currentTarget
        ) {
            onContextMenu(node, event);
        }
    }

    function focusRow(item: HTMLElement | undefined) {
        if (!item) return;
        store.focusedKey = item.dataset.key ?? null;
        item.focus();
    }

    function onKeydown(event: KeyboardEvent) {
        if (event.target !== event.currentTarget) return;
        const item = event.currentTarget as HTMLElement;
        const rows = Array.from(
            item
                .closest('.note-tree')
                ?.querySelectorAll<HTMLElement>('.note-tree-item') ?? [],
        );
        const index = rows.indexOf(item);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            focusRow(rows[index + (event.key === 'ArrowDown' ? 1 : -1)]);
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
        } else if (event.key === 'ArrowRight' && hasChildren) {
            event.preventDefault();
            if (!expanded) setExpanded(true);
            else focusRow(rows[index + 1]);
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            if (expanded) setExpanded(false);
            else
                focusRow(
                    item.parentElement?.closest<HTMLElement>(
                        '.note-tree-item',
                    ) ?? undefined,
                );
        }
    }

    function isAdd(event: DragEvent): boolean {
        return event.ctrlKey || event.metaKey;
    }

    function handleDragStart(event: DragEvent) {
        event.stopPropagation();
        if (!file || !event.dataTransfer) return;
        store.dragging = { file, parent };
        event.dataTransfer.effectAllowed = 'copyMove';
        event.dataTransfer.setData('text/plain', file.path);
    }

    function handleDragOver(event: DragEvent) {
        event.stopPropagation();
        const dragging = store.dragging;
        if (!dragging || !file) {
            dragOver = null;
            return;
        }
        const add = isAdd(event);
        if (!canDrop(dragging.file, file, dragging.parent, add)) {
            dragOver = null;
            return;
        }
        event.preventDefault();
        if (event.dataTransfer)
            event.dataTransfer.dropEffect = add ? 'copy' : 'move';
        dragOver = add ? 'add' : 'move';
    }

    function handleDragLeave(event: DragEvent) {
        event.stopPropagation();
        const item = event.currentTarget as HTMLElement;
        if (
            event.relatedTarget instanceof Node &&
            item.contains(event.relatedTarget)
        )
            return;
        dragOver = null;
    }

    async function handleDrop(event: DragEvent) {
        event.stopPropagation();
        event.preventDefault();
        const add = isAdd(event);
        const dragging = store.dragging;
        dragOver = null;
        store.dragging = null;
        if (!dragging || !file) return;
        if (await tryDrop(dragging.file, file, dragging.parent, add)) {
            setExpanded(true);
            onOpen(dragging.file);
        }
    }
</script>

<div
    class="note-tree-item"
    role="treeitem"
    tabindex={tabIndex}
    data-key={node.key}
    aria-level={level}
    aria-selected={isSelected}
    aria-expanded={hasChildren ? expanded : undefined}
    onclick={handleItemClick}
    oncontextmenu={handleContextMenu}
    onkeydown={onKeydown}
    onfocus={() => (store.focusedKey = node.key)}
    ondragstart={handleDragStart}
    ondragend={(event) => {
        event.stopPropagation();
        store.dragging = null;
    }}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
>
    <div
        class="note-tree-row"
        class:is-selected={isSelected}
        class:is-reveal-target={isRevealTarget}
        class:note-tree-drop-target={dragOver === 'move'}
        class:note-tree-drop-target-add={dragOver === 'add'}
        style:--level={level - 1}
        draggable={file !== null}
    >
        {#if hasChildren}
            <span
                class="note-tree-chevron note-tree-icon"
                class:is-expanded={expanded}
                aria-hidden="true"
                onclick={(event) => {
                    event.stopPropagation();
                    toggle();
                }}
                use:chevron
            ></span>
        {:else}
            <span class="note-tree-chevron note-tree-icon"></span>
        {/if}
        {#if node.icon}
            <span
                class="note-tree-user-icon note-tree-icon"
                aria-hidden="true"
                use:userIcon={node.icon}
            ></span>
        {/if}
        <span class="note-tree-name" class:is-bold={level === 1}
            >{nodeLabel(node)}</span
        >
        <span class="note-tree-count" aria-hidden="true">{childrenCount}</span>
    </div>
    {#if hasChildren && expanded}
        <div role="group">
            {#each node.children as child (child.key)}
                <TreeItem
                    node={child}
                    parent={file ?? parent}
                    level={level + 1}
                />
            {/each}
        </div>
    {/if}
</div>
