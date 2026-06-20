import { App, Modal, Setting, Notice } from 'obsidian';
import GithubUpdaterPlugin from './main';
import { installPluginFromRepo } from './installer';

export class GithubInstallModal extends Modal {
	plugin: GithubUpdaterPlugin;
	repoUrl: string;

	constructor(app: App, plugin: GithubUpdaterPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Install Plugin from GitHub' });

		new Setting(contentEl)
			.setName('GitHub Repository')
			.setDesc('Enter the URL or "username/repository" of the plugin you want to install.')
			.addText(text => text
				.setPlaceholder('e.g., TfTHacker/obsidian-brat')
				.onChange(value => {
					this.repoUrl = value;
				}));

		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Install / Update')
				.setCta()
				.onClick(async () => {
					if (!this.repoUrl) {
						new Notice('Please enter a valid repository.');
						return;
					}
					
					const pluginId = await installPluginFromRepo(this.app, this.repoUrl);
					
					// Auto-track it if not already tracked
					if (pluginId && !this.plugin.settings.trackedRepos.includes(this.repoUrl)) {
						this.plugin.settings.trackedRepos.push(this.repoUrl);
						await this.plugin.saveSettings();
					}

					this.close();
				}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
