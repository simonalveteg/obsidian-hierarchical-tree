import { App, TFile, getLinkpath } from 'obsidian';

export class TreeGroup {
    constructor(
        public readonly id: string,
        public readonly label: string,
    ) {}
}

export const orphanGroup = new TreeGroup('orphans', 'Orphans');

export interface CustomTree {
    group: TreeGroup;
    build: (app: App) => TreeNode[];
}

export interface TreeNode {
    item: TFile | TreeGroup;
    children: TreeNode[];
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

export function buildRoots(app: App, custom: CustomTree[]): TreeNode[] {
    const { nodes, orphans } = buildTree(app);

    const roots = [...nodes];

    for (const { group, build } of custom) {
        roots.push({ item: group, children: build(app) });
    }

    if (orphans.length > 0) {
        roots.push({ item: orphanGroup, children: orphans });
    }

    return roots;
}

export function buildTree(app: App): { nodes: TreeNode[]; orphans: TreeNode[] } {
    // Sorted once up front, so every child list below is already sorted.
    const files = app.vault.getMarkdownFiles().sort(compareFiles);

    const childrenByParent = new Map<string, TFile[]>();
    const roots: TFile[] = [];

    for (const file of files) {
        const parents = getParents(app, file);

        if (parents.length === 0) {
            roots.push(file);
            continue;
        }

        for (const parent of parents) {
            const siblings = childrenByParent.get(parent.path);
            if (siblings) {
                siblings.push(file);
            } else {
                childrenByParent.set(parent.path, [file]);
            }
        }
    }

    const ancestors = new Set<string>(); // current path from root, for cycle protection
    const visited = new Set<string>();   // everything placed anywhere in the tree

    const buildNode = (file: TFile): TreeNode => {
        ancestors.add(file.path);
        visited.add(file.path);

        const children = (childrenByParent.get(file.path) ?? [])
            .filter((child) => !ancestors.has(child.path))
            .map((child) => buildNode(child));

        ancestors.delete(file.path);
        return { item: file, children };
    };

    const nodes: TreeNode[] = [];
    const orphans: TreeNode[] = [];

    for (const file of roots) {
        const node = buildNode(file);
        (node.children.length === 0 ? orphans : nodes).push(node);
    }

    // Notes only reachable through cycles have no root: promote them.
    for (const file of files) {
        if (!visited.has(file.path)) {
            nodes.push(buildNode(file));
        }
    }

    return { nodes, orphans };
}

/** Debug helper. Do not JSON.stringify the tree: TFile.parent is circular. */
export function printTree(nodes: TreeNode[], depth = 0): void {
    for (const node of nodes) {
        console.log('  '.repeat(depth) + nodeLabel(node));
        printTree(node.children, depth + 1);
    }
}