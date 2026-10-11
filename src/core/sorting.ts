import { TFile } from 'obsidian';

export enum SortType {
    ModifiedDesc = 'modified-desc',
    ModifiedAsc = 'modified-asc',
    NameAsc = 'name-asc',
    NameDesc = 'name-desc',
    CreatedAsc = 'created-asc',
    CreatedDesc = 'created-desc',
}

export type FileComparator = (a: TFile, b: TFile) => number;

export const SORT_OPTIONS = {
    [SortType.NameAsc]: {
        label: 'File Name (A to Z)',
        group: 'name',
        compare: (a, b) =>
            a.basename.localeCompare(b.basename, undefined, { numeric: true }),
    },
    [SortType.NameDesc]: {
        label: 'File Name (Z to A)',
        group: 'name',
        compare: (a, b) =>
            b.basename.localeCompare(a.basename, undefined, { numeric: true }),
    },
    [SortType.ModifiedAsc]: {
        label: 'Modified (old to new)',
        group: 'modified',
        compare: (a, b) => a.stat.mtime - b.stat.mtime,
    },
    [SortType.ModifiedDesc]: {
        label: 'Modified (new to old)',
        group: 'modified',
        compare: (a, b) => b.stat.mtime - a.stat.mtime,
    },
    [SortType.CreatedAsc]: {
        label: 'Created (old to new)',
        group: 'created',
        compare: (a, b) => a.stat.ctime - b.stat.ctime,
    },
    [SortType.CreatedDesc]: {
        label: 'Created (new to old)',
        group: 'created',
        compare: (a, b) => b.stat.ctime - a.stat.ctime,
    },
} as const satisfies Record<
    string,
    { label: string; group: string; compare: FileComparator }
>;

export function sortGroup(id: SortId): string {
    return SORT_OPTIONS[id].group;
}

export type SortId = keyof typeof SORT_OPTIONS;

export const SORT_IDS = Object.keys(SORT_OPTIONS) as SortId[];

export function getComparator(id: SortId): FileComparator {
    return SORT_OPTIONS[id].compare;
}

export function sortLabel(id: SortId): string {
    return SORT_OPTIONS[id].label;
}
