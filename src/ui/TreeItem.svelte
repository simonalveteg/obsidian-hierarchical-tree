<script lang="ts">
	import { setIcon, type TFile } from 'obsidian';
	import type { TreeNode } from '../tree';
    import { TreeGroup, nodeKey, nodeLabel, nodeFile } from '../tree';
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
    const isGroup = $derived(node.item instanceof TreeGroup);
	const isSelected = $derived(isGroup ? false : nodeKey(node) === selectedPath);

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
			onOpen(nodeFile(node));
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
		onclick={() => onOpen(nodeFile(node))}
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

		<span class="note-tree-name">{nodeLabel(node)}</span>
		<span class="note-tree-count" aria-hidden="true"> {childrenCount}</span>
	</div>

	{#if hasChildren && expanded}
		<div role="group">
			{#each node.children as child (nodeKey(child))}
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
