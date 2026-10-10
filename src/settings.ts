export interface NoteHierarchySettings {
    parentKey: string;
    fleetingTag: string;
}

export const DEFAULT_SETTINGS: NoteHierarchySettings = {
    parentKey: 'up',
    fleetingTag: '#note/fleeting',
};
