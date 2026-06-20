import { App, Modal, Setting, requestUrl, Notice } from 'obsidian';
import GithubUpdaterPlugin from './main';

export class ScanModal extends Modal {
	plugin: GithubUpdaterPlugin;
	foundPlugins: { id: string, name: string, guessedRepo: string }[] = [];
	selectedRepos: Set<string> = new Set();
	inputs: Record<string, string> = {};

	constructor(app: App, plugin: GithubUpdaterPlugin) {
		super(app);
		this.plugin = plugin;
	}

	async scan() {
		try {
			// Fetch official list
			const response = await requestUrl({ url: 'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json' });
			const communityList = response.json;
			const officialIds = new Set(communityList.map((p: any) => p.id));

			// Scan local
			const pluginsDir = '.obsidian/plugins';
			const adapter = this.app.vault.adapter;
			
			const listed = await adapter.list(pluginsDir);
			
			for (const folderPath of listed.folders) {
				const manifestPath = `${folderPath}/manifest.json`;
				if (await adapter.exists(manifestPath)) {
					const manifestStr = await adapter.read(manifestPath);
					const manifest = JSON.parse(manifestStr);
					
					// If it's not our own plugin and not official
					if (manifest.id !== 'obsidian-github-updater' && !officialIds.has(manifest.id)) {
						let guessedRepo = "";
						if (manifest.authorUrl && manifest.authorUrl.includes('github.com')) {
							let url = manifest.authorUrl;
							if (url.endsWith('/')) url = url.slice(0, -1);
							const parts = url.split('/');
							const username = parts[parts.length - 1];
							guessedRepo = `${username}/${manifest.id}`;
						}

						// Check if this plugin is already tracked
						const isAlreadyTracked = this.plugin.settings.trackedRepos.some(repo => 
							repo.toLowerCase() === guessedRepo.toLowerCase() || 
							repo.toLowerCase().endsWith(`/${manifest.id.toLowerCase()}`)
						);

						if (!isAlreadyTracked) {
							this.foundPlugins.push({
								id: manifest.id,
								name: manifest.name,
								guessedRepo
							});
						}
					}
				}
			}

			this.renderResults();

		} catch (e: any) {
			console.error(e);
			new Notice("Failed to scan plugins: " + e.message);
			this.close();
		}
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Scanning for unofficial plugins...' });
		this.scan();
	}

	renderResults() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Unofficial Plugins Found' });

		if (this.foundPlugins.length === 0) {
			contentEl.createEl('p', { text: 'No other unofficial plugins found in your vault.' });
			return;
		}

		contentEl.createEl('p', { text: 'Select the plugins you want to track. Please verify the guessed GitHub repository URLs are correct!' });

		this.foundPlugins.forEach(p => {
			this.inputs[p.id] = p.guessedRepo;
			
			new Setting(contentEl)
				.setName(p.name)
				.setDesc(`ID: ${p.id}`)
				.addText(text => {
					text.setValue(p.guessedRepo)
						.setPlaceholder('username/repo')
						.onChange(v => {
							this.inputs[p.id] = v;
						});
				})
				.addToggle(toggle => {
					toggle.setValue(false)
						.onChange(v => {
							if (v) this.selectedRepos.add(p.id);
							else this.selectedRepos.delete(p.id);
						});
				});
		});

		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Track Selected')
				.setCta()
				.onClick(async () => {
					let added = 0;
					for (const id of this.selectedRepos) {
						const repo = this.inputs[id].trim();
						if (repo && !this.plugin.settings.trackedRepos.includes(repo)) {
							this.plugin.settings.trackedRepos.push(repo);
							added++;
						}
					}
					if (added > 0) {
						await this.plugin.saveSettings();
						new Notice(`Added ${added} repositories to tracking list.`);
						// If the settings tab is open, we should tell the user to close and reopen it
						new Notice("Please re-open the settings tab to see the newly tracked plugins.");
					}
					this.close();
				}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
