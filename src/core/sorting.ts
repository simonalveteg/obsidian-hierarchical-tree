import { TFile } from 'obsidian';

export enum SortType {
    ModifiedDesc = 'modified-desc',
    ModifiedAsc = 'modified-asc',
    NameAsc = 'name-asc',
    NameDesc = 'name-desc',
    CreatedAsc = 'created-asc',
    CreatedDesc = 'created-desc',
}

const SORT_LABELS: Record<SortType, string> = {
    [SortType.ModifiedDesc]: 'Modified (newest first)',
    [SortType.ModifiedAsc]: 'Modified (oldest first)',
    [SortType.NameAsc]: 'Name (A to Z)',
    [SortType.NameDesc]: 'Name (Z to A)',
    [SortType.CreatedAsc]: 'Created (oldest first)',
    [SortType.CreatedDesc]: 'Created (newest first)',
};

export type FileComparator = (a: TFile, b: TFile) => number;

export const SORT_OPTIONS = {
    [SortType.ModifiedDesc]: {
        label: 'Modified (newest first)',
        compare: (a, b) => b.stat.mtime - a.stat.mtime,
    },
    [SortType.ModifiedAsc]: {
        label: 'Modified (oldest first)',
        compare: (a, b) => a.stat.mtime - b.stat.mtime,
    },
    [SortType.NameAsc]: {
        label: 'Name (A to Z)',
        compare: (a, b) =>
            a.basename.localeCompare(b.basename, undefined, { numeric: true }),
    },
    [SortType.NameDesc]: {
        label: 'Name (Z to A)',
        compare: (a, b) =>
            b.basename.localeCompare(a.basename, undefined, { numeric: true }),
    },
    [SortType.CreatedAsc]: {
        label: 'Created (oldest first)',
        compare: (a, b) => a.stat.ctime - b.stat.ctime,
    },
    [SortType.CreatedDesc]: {
        label: 'Created (newest first)',
        compare: (a, b) => b.stat.ctime - a.stat.ctime,
    },
} as const satisfies Record<string, { label: string; compare: FileComparator }>;

export type SortId = keyof typeof SORT_OPTIONS;

export const SORT_IDS = Object.keys(SORT_OPTIONS) as SortId[];

export function getComparator(id: SortId): FileComparator {
    return SORT_OPTIONS[id].compare;
}

export function sortLabel(id: SortId): string {
    return SORT_OPTIONS[id].label;
}
