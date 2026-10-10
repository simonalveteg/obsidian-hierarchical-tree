import { App, TFile, getLinkpath } from 'obsidian';

export interface TreeNode {
    file: TFile;
    children: TreeNode[];
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

export function buildTree(app: App): TreeNode[] {
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
        return { file, children };
    };

    const nodes = roots.map((file) => buildNode(file));

    // Notes only reachable through cycles have no root: promote them.
    for (const file of files) {
        if (!visited.has(file.path)) {
            nodes.push(buildNode(file));
        }
    }

    return nodes;
}

/** Debug helper. Do not JSON.stringify the tree: TFile.parent is circular. */
export function printTree(nodes: TreeNode[], depth = 0): void {
    for (const node of nodes) {
        console.log('  '.repeat(depth) + node.file.basename);
        printTree(node.children, depth + 1);
    }
}