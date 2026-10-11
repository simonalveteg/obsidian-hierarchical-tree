import { type App, type TFile } from 'obsidian';
import { linkToFile } from '../core/links';

export async function addChildNote(
    app: App,
    parent: TFile | null = null,
    parentKey = 'up',
): Promise<TFile> {
    const folder = parent?.parent?.path ?? '';
    let name = 'New Note';
    let suffix = 1;
    let path = folder ? `${folder}/${name}.md` : `${name}.md`;
    while (app.vault.getAbstractFileByPath(path)) {
        name = `New Note ${suffix++}`;
        path = folder ? `${folder}/${name}.md` : `${name}.md`;
    }
    const data = parent
        ? `---\n${parentKey}: [${JSON.stringify(linkToFile(app, parent, path))}]\n---\n`
        : '';
    return app.vault.create(path, data);
}
