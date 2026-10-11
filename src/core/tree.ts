import type { App, TFile } from 'obsidian';
import type { ParentIndex } from './parents';
import { SortType, SORT_OPTIONS } from './sorting';

export class TreeGroup {
    constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly icon: string | null = null,
        public readonly filter: (file: TFile, app: App) => boolean = () => true,
        public readonly compare: (a: TFile, b: TFile) => number = SORT_OPTIONS[
            SortType.ModifiedDesc
        ].compare,
    ) {}
}

export interface GroupSet {
    vault: TreeGroup;
    orphans: TreeGroup;
    custom: TreeGroup[];
}

export type TreeNode =
    | {
          kind: 'group';
          key: string;
          group: TreeGroup;
          children: TreeNode[];
          icon: string | null;
      }
    | {
          kind: 'file';
          key: string;
          file: TFile;
          children: TreeNode[];
          icon: string | null;
      };

export function nodeLabel(node: TreeNode): string {
    return node.kind === 'group' ? node.group.label : node.file.basename;
}

export function nodeFile(node: TreeNode): TFile | null {
    return node.kind === 'file' ? node.file : null;
}

export function ancestorKeys(roots: TreeNode[], path: string): string[] {
    const ancestors: string[] = [];
    const walk = (node: TreeNode, stack: string[]): boolean => {
        if (node.kind === 'file' && node.file.path === path) {
            ancestors.push(...stack);
            return true;
        }
        for (const child of node.children) {
            if (walk(child, [...stack, node.key])) return true;
        }
        return false;
    };
    for (const root of roots) if (walk(root, [])) break;
    return ancestors;
}

export function collectFiles(node: TreeNode): TFile[] {
    return [
        ...(node.kind === 'file' ? [node.file] : []),
        ...node.children.flatMap(collectFiles),
    ];
}

function buildForest(
    files: TFile[],
    parentsByPath: ParentIndex,
    compare: (a: TFile, b: TFile) => number,
    splitOrphans: boolean,
    rootKey: string,
    icons: Map<string, string | null>,
): { nodes: TreeNode[]; orphans: TreeNode[] } {
    const sorted = [...files].sort(compare);
    const included = new Set(sorted.map((file) => file.path));
    const childrenByParent = new Map<string, TFile[]>();
    const roots: TFile[] = [];
    for (const file of sorted) {
        const parents = (parentsByPath.get(file.path) ?? []).filter((parent) =>
            included.has(parent.path),
        );
        if (parents.length === 0) roots.push(file);
        for (const parent of parents) {
            const children = childrenByParent.get(parent.path);
            if (children) children.push(file);
            else childrenByParent.set(parent.path, [file]);
        }
    }

    const ancestors = new Set<string>();
    const visited = new Set<string>();
    const buildNode = (file: TFile, parentKey: string): TreeNode => {
        ancestors.add(file.path);
        visited.add(file.path);
        const key = `${parentKey}/${file.path}`;
        const children = (childrenByParent.get(file.path) ?? [])
            .filter((child) => !ancestors.has(child.path))
            .map((child) => buildNode(child, key));
        ancestors.delete(file.path);
        return {
            kind: 'file',
            key,
            file,
            children,
            icon: icons.get(file.path) ?? null,
        };
    };

    const nodes: TreeNode[] = [];
    const orphans: TreeNode[] = [];
    for (const file of roots) {
        const node = buildNode(file, rootKey);
        (splitOrphans && node.children.length === 0 ? orphans : nodes).push(
            node,
        );
    }
    for (const file of sorted)
        if (!visited.has(file.path)) nodes.push(buildNode(file, rootKey));
    return { nodes, orphans };
}

export function buildRoots(
    app: App,
    files: TFile[],
    parentIndex: ParentIndex,
    icons: Map<string, string | null>,
    groups: GroupSet,
): TreeNode[] {
    const { vault, orphans, custom } = groups;
    const roots: TreeNode[] = [];
    const main = buildForest(
        files,
        parentIndex,
        vault.compare,
        true,
        `group:${vault.id}`,
        icons,
    );
    main.orphans.sort((a, b) => orphans.compare(nodeFile(a)!, nodeFile(b)!));

    if (main.nodes.length)
        roots.push({
            kind: 'group',
            key: `group:${vault.id}`,
            group: vault,
            children: main.nodes,
            icon: vault.icon,
        });
    if (main.orphans.length)
        roots.push({
            kind: 'group',
            key: `group:${orphans.id}`,
            group: orphans,
            children: main.orphans,
            icon: orphans.icon,
        });
    for (const group of custom) {
        const result = buildForest(
            files.filter((file) => group.filter(file, app)),
            parentIndex,
            group.compare,
            false,
            `group:${group.id}`,
            icons,
        );
        if (result.nodes.length)
            roots.push({
                kind: 'group',
                key: `group:${group.id}`,
                group,
                children: result.nodes,
                icon: group.icon,
            });
    }
    return roots;
}
