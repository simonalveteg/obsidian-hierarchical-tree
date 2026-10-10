import { type App, type TFile } from 'obsidian';
import { linkToFile } from '../core/links';

export async function addChildNote(
    app: App,
    parent: TFile,
    parentKey = 'up',
): Promise<TFile> {
    const folder = parent.parent?.path ?? '';
    let name = 'New Note';
    let suffix = 1;
    let path = folder ? `${folder}/${name}.md` : `${name}.md`;
    while (app.vault.getAbstractFileByPath(path)) {
        name = `New Note ${suffix++}`;
        path = folder ? `${folder}/${name}.md` : `${name}.md`;
    }
    const parentLink = linkToFile(app, parent, path);
    return app.vault.create(
        path,
        `---\n${parentKey}: [${JSON.stringify(parentLink)}]\n---\n`,
    );
}
