<script lang="ts">
	import { setIcon, type TFile } from 'obsidian';
	import type { TreeNode } from '../tree';
	import { TreeGroup, nodeKey, nodeLabel, nodeFile } from '../tree';
	import TreeItem from './TreeItem.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	let {
		node,
		onOpen,
		onContextMenu,
		selectedPath,
		expandedKeys,
		level,
	}: {
		node: TreeNode;
		onOpen: (file: TFile) => void;
		onContextMenu: (node: TreeNode, e: MouseEvent) => void;
		selectedPath: string | null;
		expandedKeys: SvelteSet<string>;
		level: number;
	} = $props();

	const key = $derived(nodeKey(node));
	const expanded = $derived(expandedKeys.has(key));
	const hasChildren = $derived(node.children.length > 0);
	const childrenCount = $derived(node.children.length || '');
	const isGroup = $derived(node.item instanceof TreeGroup);
	const isSelected = $derived(
		isGroup ? false : nodeKey(node) === selectedPath,
	);

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
</script>

<div role="none">
	<div
		class="note-tree-row"
		role="treeitem"
		tabindex="0"
		aria-level={level}
		aria-selected={isSelected}
		class:is-selected={isSelected}
		aria-expanded={hasChildren ? expanded : undefined}
		style:--level={level - 1}
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
				use:setIcon={node.icon}
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
					{selectedPath}
                    {expandedKeys}
					level={level + 1}
				/>
			{/each}
		</div>
	{/if}
</div>
