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
	}: {
		store: TreeStore;
		onOpen: (file: TFile | null) => void;
		onContextMenu: (node: TreeNode, e: MouseEvent) => void;
	} = $props();
</script>

<div class="note-tree" role="tree">
	{#each store.roots as node (nodeKey(node))}
		<TreeItem
			{node}
			{onOpen}
			{onContextMenu}
			selectedPath={store.selection.selectedPath}
			expandedKeys={store.selection.expanded}
			level={1}
		/>
	{/each}
</div>
