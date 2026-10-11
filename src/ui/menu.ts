import { Menu, MenuItem, type App, type TFile } from 'obsidian';
import { type TreeNode } from '../core/tree';
import { IconModal } from './IconModal';
import { SORT_IDS, sortLabel, sortGroup, type SortId } from '../core/sorting';

export type SubmenuItem = MenuItem & { setSubmenu(): Menu };
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

function addSortItems(
    menu: Menu,
    current: SortId | undefined,
    onSelect: (id: SortId) => void,
): void {
    let previous: string | undefined;
    for (const id of SORT_IDS) {
        const group = sortGroup(id);
        if (previous !== undefined && group !== previous) menu.addSeparator();
        previous = group;
        menu.addItem((item) =>
            item
                .setTitle(sortLabel(id))
                .setChecked(id === current)
                .onClick(() => onSelect(id)),
        );
    }
}

export function addTargetSortItems(
    item: MenuItem,
    target: SortTarget,
    controls: SortControls,
): void {
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
            addTargetSortItems(item, target, controls);
        });
    }

    const rect = anchor.getBoundingClientRect();
    menu.showAtPosition({ x: rect.left, y: rect.bottom });
}

export function showMenu(
    app: App,
    node: TreeNode,
    event: MouseEvent,
    addChild: (parent: TFile | null) => void,
    sort: SortControls,
): void {
    const menu = new Menu();

    if (node.kind === 'group') {
        if (node.group.id === 'vault') {
            menu.addItem((item) =>
                item
                    .setTitle('Add new note')
                    .setIcon('plus')
                    .onClick(() => addChild(null)),
            );
        }
        const target = sort.targets().find((t) => t.id === node.group.id);
        if (target) {
            menu.addItem((item) => {
                item.setTitle('Change sort method').setIcon('arrow-up-down');
                addTargetSortItems(item, target, sort);
            });
        }
    } else {
        const file = node.file;
        menu.addItem((item) =>
            item
                .setTitle('Add new note')
                .setIcon('plus')
                .onClick(() => addChild(file)),
        );
        menu.addItem((item) =>
            item
                .setTitle('Manage icon')
                .setIcon('image')
                .onClick(() => new IconModal(app, file).open()),
        );
    }

    menu.showAtMouseEvent(event);
}
