<script lang="ts">
	import { setIcon, type TFile } from 'obsidian';
	import type { TreeNode } from '../tree';
	import TreeItem from './TreeItem.svelte';

	let {
		node,
		onOpen,
		selectedPath,
		level,
	}: {
		node: TreeNode;
		onOpen: (file: TFile | null) => void;
		selectedPath: string | null;
		level: number;
	} = $props();

	let expanded = $state(false);
	const hasChildren = $derived(node.children.length > 0);
	const childrenCount = $derived(node.children.length || '');
	const isSelected = $derived(node.file?.path === selectedPath);

	// Svelte action: runs when the element is created.
	function icon(el: HTMLElement) {
		setIcon(el, 'chevron-right');
	}

	function toggle(e: MouseEvent) {
		e.stopPropagation(); // don't also open the note
		expanded = !expanded;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onOpen(node.file);
		} else if (e.key === 'ArrowRight' && hasChildren) {
			e.preventDefault();
			expanded = true;
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			expanded = false;
		}
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
		aria-expanded={hasChildren ? expanded : undefined}
		style:--level={level - 1}
		onclick={() => onOpen(node.file)}
		onkeydown={onKeydown}
	>
		{#if hasChildren}
			<span
				class="note-tree-chevron"
				class:is-expanded={expanded}
				aria-hidden="true"
				onclick={toggle}
				use:icon
			></span>
		{:else}
			<span class="note-tree-chevron"></span>
		{/if}

		<span class="note-tree-name">{node.file?.basename ?? node.label}</span>
		<span class="note-tree-count" aria-hidden="true"> {childrenCount}</span>
	</div>

	{#if hasChildren && expanded}
		<div role="group">
			{#each node.children as child (child.file?.path ?? node.label)}
				<TreeItem
					node={child}
					{onOpen}
					{selectedPath}
					level={level + 1}
				/>
			{/each}
		</div>
	{/if}
</div>
