import {
    App,
    ButtonComponent,
    Modal,
    Notice,
    TFile,
    debounce,
    getIconIds,
    setIcon,
} from 'obsidian';
import { frontmatterIcon } from './icons';

const CHUNK = 200;
const PREFIX = 'lucide-';

export class IconModal extends Modal {
    private readonly all: string[];
    private readonly current: string | null;
    private selected: string | null;
    private filtered: string[] = [];
    private rendered = 0;
    private gridEl!: HTMLElement;
    private applyBtn!: ButtonComponent;
    private removeBtn!: ButtonComponent;
    private titleIconEl!: HTMLElement;

    constructor(
        app: App,
        private readonly file: TFile,
    ) {
        super(app);
        this.all = getIconIds()
            .filter((id) => id.startsWith(PREFIX))
            .map((id) => id.slice(PREFIX.length))
            .sort();
        this.current = frontmatterIcon(app, file);
        this.selected = this.current;
    }

    onOpen() {
        const { contentEl, titleEl } = this;
        titleEl.empty();
        titleEl.addClass('note-tree-icon-title');
        this.titleIconEl = titleEl.createSpan({
            cls: 'note-tree-icon-title-icon',
        });
        titleEl.createSpan({ text: this.file.basename });
        this.updateTitle();
        contentEl.addClass('note-tree-icon-modal');

        const search = contentEl.createEl('input', {
            type: 'search',
            placeholder: `Search ${this.all.length} icons...`,
            cls: 'note-tree-icon-search',
        });
        search.addEventListener(
            'input',
            debounce(() => this.filter(search.value), 100, true),
        );

        this.gridEl = contentEl.createDiv({ cls: 'note-tree-icon-grid' });
        this.gridEl.addEventListener('scroll', () => {
            const el = this.gridEl;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200)
                this.renderMore();
        });

        const footer = contentEl.createDiv({ cls: 'note-tree-icon-footer' });

        this.removeBtn = new ButtonComponent(footer)
            .setButtonText('Remove icon')
            .setWarning()
            .onClick(() => this.select(null));

        footer.createDiv({ cls: 'note-tree-icon-spacer' });

        new ButtonComponent(footer)
            .setButtonText('Cancel')
            .onClick(() => this.close());

        this.applyBtn = new ButtonComponent(footer)
            .setButtonText('Apply')
            .setCta()
            .onClick(() => void this.save(this.selected));
        this.updateApply();

        this.filter('');
        this.revealCurrent();
        search.focus();
    }

    onClose() {
        this.contentEl.empty();
    }

    private filter(query: string) {
        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        this.filtered = terms.length
            ? this.all.filter((id) => terms.every((t) => id.includes(t)))
            : this.all;
        this.rendered = 0;
        this.gridEl.empty();
        this.gridEl.scrollTop = 0;
        this.renderMore();
    }

    private renderMore() {
        const end = Math.min(this.rendered + CHUNK, this.filtered.length);
        for (let i = this.rendered; i < end; i++) {
            const id = this.filtered[i]!;
            const cell = this.gridEl.createEl('button', {
                cls: 'note-tree-icon-cell',
                attr: { 'aria-label': id, title: id, 'data-icon': id },
            });
            cell.toggleClass('is-selected', id === this.selected);
            setIcon(cell, id);
            cell.addEventListener('click', () => this.select(id));
        }
        this.rendered = end;
    }

    private select(id: string | null) {
        this.selected = id;
        for (const cell of Array.from(this.gridEl.children)) {
            cell.toggleClass(
                'is-selected',
                cell.getAttribute('data-icon') === id,
            );
        }
        this.updateApply();
        this.updateTitle();
    }

    private updateTitle() {
        this.titleIconEl.empty();
        this.titleIconEl.toggle(this.selected !== null);
        if (this.selected) setIcon(this.titleIconEl, this.selected);
    }

    private updateApply() {
        this.applyBtn.setDisabled(this.selected === this.current);
        this.removeBtn.setDisabled(this.selected === null);
    }

    private revealCurrent() {
        if (!this.current) return;
        const index = this.filtered.indexOf(this.current);
        if (index < 0) return;
        while (this.rendered <= index) this.renderMore();
        this.gridEl
            .querySelector(`[data-icon="${CSS.escape(this.current)}"]`)
            ?.scrollIntoView({ block: 'center' });
    }

    private async save(icon: string | null) {
        try {
            await this.app.fileManager.processFrontMatter(
                this.file,
                (fm: Record<string, unknown>) => {
                    if (icon === null) delete fm.icon;
                    else fm.icon = icon;
                },
            );
            this.close();
        } catch (error) {
            console.error('IconModal save failed', error);
            new Notice('Could not update icon');
        }
    }
}
