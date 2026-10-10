<script lang="ts">
    import type { TFile } from 'obsidian';
    import type { TreeStore } from './store.svelte';
    import TreeItem from './TreeItem.svelte';

    let { store, onOpen }: { store: TreeStore; onOpen: (file: TFile) => void } = $props();
</script>

<div class="note-tree" role="tree">
    {#each store.roots as node (node.file.path)}
        <TreeItem {node} {onOpen} selectedPath={store.selectedPath} level={1} />
    {/each}
</div>