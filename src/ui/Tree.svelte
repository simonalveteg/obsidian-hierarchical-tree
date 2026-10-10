<script lang="ts">
	import type { TFile } from 'obsidian';
	import type { TreeStore } from './store.svelte';
	import TreeItem from './TreeItem.svelte';
	import { nodeKey } from '../tree';
	import type { TreeNode } from '../tree';

	let {
		store,
		onOpen,
		onContextMenu,
		canDrop,
		tryDrop,
	}: {
		store: TreeStore;
		onOpen: (file: TFile | null) => void;
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
	} = $props();

	const selection = $derived(store.selection);
	const selectedPath = $derived(store.selection.selectedPath);
	const expandedKeys = $derived(store.selection.expanded);
</script>

<div class="note-tree" role="tree">
	{#each store.roots as node (nodeKey(node))}
		<TreeItem
			{node}
			{onOpen}
			{onContextMenu}
			{canDrop}
			{tryDrop}
			{selection}
			parent={null}
			{selectedPath}
			{expandedKeys}
			level={1}
		/>
	{/each}
</div>
