import { SortType, type SortId } from './core/sorting';

export interface BuiltinGroupSettings {
    sort?: SortId;
}

export interface CustomGroupSettings {
    id: string;
    label: string;
    icon: string | null;
    enabled: boolean;
    tag: string;
    sort?: SortId;
}

export interface NoteHierarchySettings {
    parentKey: string;
    defaultSort: SortId;
    builtinGroups: {
        vault: BuiltinGroupSettings;
        orphans: BuiltinGroupSettings;
    };
    customGroups: CustomGroupSettings[];
}

export const DEFAULT_SETTINGS: NoteHierarchySettings = {
    parentKey: 'up',
    defaultSort: SortType.ModifiedDesc,
    builtinGroups: {
        vault: {},
        orphans: {},
    },
    customGroups: [
        {
            id: 'fleeting',
            label: 'Fleeting',
            icon: 'leaf',
            enabled: true,
            tag: '#note/fleeting',
        },
    ],
};
