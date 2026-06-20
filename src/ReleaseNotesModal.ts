import { App, Modal, MarkdownRenderer, Component } from 'obsidian';

export class ReleaseNotesModal extends Modal {
	markdown: string;
	repo: string;
	version: string;
	component: Component;

	constructor(app: App, repo: string, version: string, markdown: string) {
		super(app);
		this.repo = repo;
		this.version = version;
		this.markdown = markdown;
		this.component = new Component();
	}

	onOpen() {
		this.component.load();
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: `Release Notes: ${this.repo} (${this.version})` });
		
		const markdownContainer = contentEl.createDiv('markdown-rendered');
		MarkdownRenderer.render(this.app, this.markdown, markdownContainer, '', this.component);
	}

	onClose() {
		this.component.unload();
		const { contentEl } = this;
		contentEl.empty();
	}
}
