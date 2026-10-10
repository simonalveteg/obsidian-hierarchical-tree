<script lang="ts">
	import { setIcon, type TFile } from 'obsidian';
	import type { TreeNode } from '../tree';
	import { TreeGroup, nodeKey, nodeLabel, nodeFile } from '../tree';
	import type { SelectionStore } from './Store.svelte.ts';
	import TreeItem from './TreeItem.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	let {
		node,
		onOpen,
		onContextMenu,
		canDrop,
		tryDrop,
		selection,
		parent,
		selectedPath,
		expandedKeys,
		level,
	}: {
		node: TreeNode;
		onOpen: (file: TFile) => void;
		onContextMenu: (node: TreeNode, e: MouseEvent) => void;
		canDrop: (
			candidate: TFile,
			target: TFile,
			parent: TFile | null,
			add: boolean,
		) => boolean;
		tryDrop: (
			candidate: TFile,
			target: TFile,
			fromParent: TFile | null,
			add: boolean,
		) => Promise<boolean>;
		selection: SelectionStore;
		parent: TFile | null;
		selectedPath: string | null;
		expandedKeys: SvelteSet<string>;
		level: number;
	} = $props();

	const key = $derived(nodeKey(node));
	const file = $derived(nodeFile(node));
	const expanded = $derived(expandedKeys.has(key));
	const hasChildren = $derived(node.children.length > 0);
	const childrenCount = $derived(node.children.length || '');
	const isGroup = $derived(node.item instanceof TreeGroup);
	const isSelected = $derived(
		isGroup ? false : nodeKey(node) === selectedPath,
	);

	let dragOver = $state<'move' | 'add' | null>(null);

	// Svelte action: runs when the element is created.
	function icon(el: HTMLElement) {
		setIcon(el, 'chevron-right');
	}

	function setExpanded(value: boolean) {
		if (value) expandedKeys.add(key);
		else expandedKeys.delete(key);
	}

	function toggle() {
		setExpanded(!expanded);
	}

	function handleToggleClick(e: MouseEvent) {
		e.stopPropagation();
		toggle();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onClick(nodeFile(node));
		} else if (e.key === 'ArrowRight' && hasChildren) {
			e.preventDefault();
			setExpanded(true);
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			setExpanded(false);
		}
	}

	let onClick: (file: TFile | null) => void = (file) => {
		if (file) onOpen(file);
		else toggle();
	};

	function isAdd(e: DragEvent): boolean {
		return e.ctrlKey || e.metaKey;
	}

	function handleDragStart(e: DragEvent) {
		if (!file || !e.dataTransfer) return;
		selection.dragging = { file, parent };
		e.dataTransfer.effectAllowed = 'copyMove';
		e.dataTransfer.setData('text/plain', file.path);
	}

	function handleDragEnd() {
		selection.dragging = null;
	}

	function handleDragOver(e: DragEvent) {
		const dragging = selection.dragging;
		if (!dragging || !file) {
			dragOver = null;
			return;
		}
		const add = isAdd(e);
		if (!canDrop(dragging.file, file, dragging.parent, add)) {
			dragOver = null;
			return;
		}
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = add ? 'copy' : 'move';
		dragOver = add ? 'add' : 'move';
	}

	function handleDragLeave(e: DragEvent) {
		const row = e.currentTarget as HTMLElement;
		if (e.relatedTarget instanceof Node && row.contains(e.relatedTarget))
			return;
		dragOver = null;
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		const add = isAdd(e);
		const dragging = selection.dragging;
		dragOver = null;
		// The source row may be destroyed by the rebuild, so dragend may never fire.
		selection.dragging = null;
		if (!dragging || !file) return;
		if (await tryDrop(dragging.file, file, dragging.parent, add)) {
			setExpanded(true);
			onOpen(dragging.file);
		}
	}

	function userIcon(el: HTMLElement, id: string | null) {
		if (id) setIcon(el, id);
		return {
			update(next: string | null) {
				if (next) setIcon(el, next);
			},
		};
	}
</script>

<div role="none">
	<div
		class="note-tree-row"
		role="treeitem"
		tabindex="0"
		aria-level={level}
		aria-selected={isSelected}
		class:is-selected={isSelected}
		class:note-tree-drop-target={dragOver === 'move'}
		class:note-tree-drop-target-add={dragOver === 'add'}
		aria-expanded={hasChildren ? expanded : undefined}
		style:--level={level - 1}
		draggable={file !== null}
		ondragstart={handleDragStart}
		ondragend={handleDragEnd}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		onclick={() => onClick(nodeFile(node))}
		oncontextmenu={(e) => {
			e.preventDefault();
			e.stopPropagation();
			onContextMenu(node, e);
		}}
		onkeydown={onKeydown}
	>
		{#if hasChildren}
			<span
				class="note-tree-chevron note-tree-icon"
				class:is-expanded={expanded}
				aria-hidden="true"
				onclick={handleToggleClick}
				use:icon
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
		<span class="note-tree-count" aria-hidden="true"> {childrenCount}</span>
	</div>

	{#if hasChildren && expanded}
		<div role="group">
			{#each node.children as child (nodeKey(child))}
				<TreeItem
					node={child}
					{onOpen}
					{onContextMenu}
					{canDrop}
					{tryDrop}
					{selection}
					parent={file ?? parent}
					{selectedPath}
					{expandedKeys}
					level={level + 1}
				/>
			{/each}
		</div>
	{/if}
</div>
