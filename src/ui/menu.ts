import { Menu, type App, type TFile } from 'obsidian';
import { nodeFile, type TreeNode } from '../core/tree';
import { IconModal } from './IconModal';

export function showMenu(
    app: App,
    node: TreeNode,
    event: MouseEvent,
    addChild: (parent: TFile | null) => void,
): void {
    const menu = new Menu();
    const file = nodeFile(node);

    if (file || (node.kind === 'group' && node.group.id === 'vault')) {
        menu.addItem((item) =>
            item
                .setTitle('Add new note')
                .setIcon('plus')
                .onClick(() => addChild(file)),
        );
    }
    if (file) {
        menu.addItem((item) =>
            item
                .setTitle('Manage icon')
                .setIcon('image')
                .onClick(() => new IconModal(app, file).open()),
        );
    }
    menu.showAtMouseEvent(event);
}
