<script lang="ts">
    import { setContext, tick } from 'svelte';
    import type { TreeNode } from '../core/tree';
    import type { TreeStore } from './store.svelte';
    import TreeItem from './TreeItem.svelte';
    import { TREE_CONTEXT, type TreeContext } from './treeContext';

    let { store, groupId, actions } = $props<{
        store: TreeStore;
        groupId: string;
        actions: Omit<TreeContext, 'store'>;
    }>();
    let treeElement = $state<HTMLDivElement>();
    let root = $derived(
        store.roots.find((node: TreeNode) => node.key === groupId),
    );

    setContext<() => TreeContext>(TREE_CONTEXT, () => ({ store, ...actions }));

    $effect(() => {
        store.selectedKey;
        store.roots;
        void revealSelected();
    });

    async function revealSelected() {
        await tick();
        const row = treeElement?.querySelector<HTMLElement>(
            '.note-tree-row.is-selected',
        );
        const scrollable = treeElement?.parentElement;
        if (!row || !scrollable) return;
        const rowRect = row.getBoundingClientRect();
        const boxRect = scrollable.getBoundingClientRect();
        const top = rowRect.top - boxRect.top + scrollable.scrollTop;
        const target =
            rowRect.height <= boxRect.height
                ? top - boxRect.height / 2 + rowRect.height / 2
                : top;
        scrollable.scrollTo({ top: target });
    }
</script>

{#if root}
    <div class="note-tree" role="tree" bind:this={treeElement}>
        <TreeItem node={root} parent={null} level={1} />
    </div>
{/if}
