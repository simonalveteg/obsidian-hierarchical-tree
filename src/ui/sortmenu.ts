import { Menu, setIcon, type App, type MenuItem } from 'obsidian';
import { SORT_IDS, sortLabel, type SortId } from '../core/sorting';

export interface SortTarget {
    id: string;
    label: string;
    icon: string | null;
    current: SortId | undefined; // undefined = uses default
}

export interface SortControls {
    getDefault(): SortId;
    targets(): SortTarget[];
    setDefault(id: SortId): void;
    setOverride(groupId: string, id: SortId | undefined): void;
}

// setSubmenu is missing from older obsidian typings
type SubmenuItem = MenuItem & { setSubmenu(): Menu };

function addSortItems(
    menu: Menu,
    current: SortId | undefined,
    onSelect: (id: SortId) => void,
): void {
    for (const id of SORT_IDS) {
        menu.addItem((item) =>
            item
                .setTitle(sortLabel(id))
                .setChecked(id === current)
                .onClick(() => onSelect(id)),
        );
    }
}

export function showSortMenu(
    anchor: HTMLElement,
    controls: SortControls,
): void {
    const menu = new Menu();

    menu.addItem((item) => {
        item.setTitle('Default sort').setIcon('arrow-up-down');
        addSortItems(
            (item as SubmenuItem).setSubmenu(),
            controls.getDefault(),
            (id) => controls.setDefault(id),
        );
    });

    menu.addSeparator();

    for (const target of controls.targets()) {
        menu.addItem((item) => {
            item.setTitle(target.label);
            if (target.icon) item.setIcon(target.icon);
            const sub = (item as SubmenuItem).setSubmenu();
            sub.addItem((i) =>
                i
                    .setTitle('Use default')
                    .setChecked(target.current === undefined)
                    .onClick(() => controls.setOverride(target.id, undefined)),
            );
            sub.addSeparator();
            addSortItems(sub, target.current, (id) =>
                controls.setOverride(target.id, id),
            );
        });
    }

    const rect = anchor.getBoundingClientRect();
    menu.showAtPosition({ x: rect.left, y: rect.bottom });
}
