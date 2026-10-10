import { App, TFile, getLinkpath } from 'obsidian';

export class TreeGroup {
    constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly icon: string | null = null,
        public readonly filter: (file: TFile) => boolean = () => true,
        public readonly compare: (a: TFile, b: TFile) => number = compareFiles,
    ) { }
}

export const vaultGroup = new TreeGroup('vault', 'Vault', 'vault');
export const orphanGroup = new TreeGroup('orphans', 'Orphans', 'circle-dot-dashed');

export interface TreeNode {
    item: TFile | TreeGroup;
    children: TreeNode[];
    icon: string | null;
}

export function nodeKey(node: TreeNode): string {
    return node.item instanceof TreeGroup ? `group:${node.item.id}` : node.item.path;
}

export function nodeLabel(node: TreeNode): string {
    return node.item instanceof TreeGroup ? node.item.label : node.item.basename;
}

export function nodeFile(node: TreeNode): TFile | null {
    return node.item instanceof TFile ? node.item : null;
}

function compareFiles(a: TFile, b: TFile): number {
    return a.basename.localeCompare(b.basename, undefined, { numeric: true });
}

export function getParents(app: App, file: TFile): TFile[] {
    const links = app.metadataCache.getFileCache(file)?.frontmatterLinks ?? [];
    const parents = new Map<string, TFile>();

    for (const { key, link } of links) {
        if (key !== 'up' && !key.startsWith('up.')) continue;

        const parent = app.metadataCache.getFirstLinkpathDest(getLinkpath(link), file.path);
        if (!parent || parent.extension !== 'md' || parent.path === file.path) continue;

        parents.set(parent.path, parent);
    }

    return [...parents.values()];
}

function buildForest(
    app: App,
    files: TFile[],
    compare: (a: TFile, b: TFile) => number,
    splitOrphans: boolean,
): { nodes: TreeNode[]; orphans: TreeNode[] } {
    const sorted = [...files].sort(compare);
    const included = new Set(sorted.map((f) => f.path));

    const childrenByParent = new Map<string, TFile[]>();
    const roots: TFile[] = [];

    for (const file of sorted) {
        // Parents excluded by the filter are ignored, so the file becomes a root here.
        const parents = getParents(app, file).filter((p) => included.has(p.path));

        if (parents.length === 0) {
            roots.push(file);
            continue;
        }

        for (const parent of parents) {
            const siblings = childrenByParent.get(parent.path);
            if (siblings) siblings.push(file);
            else childrenByParent.set(parent.path, [file]);
        }
    }

    const ancestors = new Set<string>();
    const visited = new Set<string>();

    const buildNode = (file: TFile): TreeNode => {
        ancestors.add(file.path);
        visited.add(file.path);

        let icon = app.metadataCache.getFileCache(file)?.frontmatter?.icon ?? null;

        const children = (childrenByParent.get(file.path) ?? [])
            .filter((child) => !ancestors.has(child.path))
            .map(buildNode);

        ancestors.delete(file.path);
        return { item: file, children, icon };
    };

    const nodes: TreeNode[] = [];
    const orphans: TreeNode[] = [];

    for (const file of roots) {
        const node = buildNode(file);
        (splitOrphans && node.children.length === 0 ? orphans : nodes).push(node);
    }

    // Notes only reachable through cycles have no root: promote them.
    for (const file of sorted) {
        if (!visited.has(file.path)) nodes.push(buildNode(file));
    }

    return { nodes, orphans };
}

export function buildRoots(app: App, custom: TreeGroup[] = []): TreeNode[] {
    const all = app.vault.getMarkdownFiles();
    const roots: TreeNode[] = [];

    const main = buildForest(app, all, vaultGroup.compare, true);
    if (main.nodes.length > 0) roots.push({ item: vaultGroup, children: main.nodes, icon: vaultGroup.icon });
    if (main.orphans.length > 0) roots.push({ item: orphanGroup, children: main.orphans, icon: orphanGroup.icon });

    for (const group of custom) {
        const { nodes } = buildForest(app, all.filter(group.filter), group.compare, false);
        if (nodes.length > 0) roots.push({ item: group, children: nodes, icon: group.icon });
    }

    return roots;
}

/** Debug helper. Do not JSON.stringify the tree: TFile.parent is circular. */
export function printTree(nodes: TreeNode[], depth = 0): void {
    for (const node of nodes) {
        console.log('  '.repeat(depth) + nodeLabel(node));
        printTree(node.children, depth + 1);
    }
}