import { Menu, type App, type TFile } from 'obsidian';
import { nodeFile, type TreeNode } from '../core/tree';
import { IconModal } from './IconModal';

export function showMenu(
    app: App,
    node: TreeNode,
    event: MouseEvent,
    addChild: (parent: TFile) => void,
): void {
    const menu = new Menu();
    const file = nodeFile(node);
    if (file) {
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
