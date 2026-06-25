import { App, PluginSettingTab, Setting, Notice, moment } from 'obsidian';
import GithubUpdaterPlugin from './main';
import { installPluginFromRepo } from './installer';
import { ReleaseNotesModal } from './ReleaseNotesModal';
import { ScanModal } from './ScanModal';
import { checkPluginStatus, PluginCheckResult } from './checker';

export class GithubUpdaterSettingTab extends PluginSettingTab {
	plugin: GithubUpdaterPlugin;
	newRepoInput: string = "";
	
	updatesAvailable: Set<string> = new Set();
	updateAllBtnComponent: any = null;

	constructor(app: App, plugin: GithubUpdaterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		
		this.updatesAvailable.clear();

		(new Setting(containerEl) as any).setHeading().setName('GitHub Plugin Updater Settings');

		new Setting(containerEl)
			.setName('Auto-detect Unofficial Plugins')
			.setDesc('Scan your vault for installed plugins that are not in the official community store, and attempt to find their GitHub repository to track them.')
			.addButton(btn => btn
				.setButtonText('Scan Vault')
				.onClick(() => {
					new ScanModal(this.app, this.plugin).open();
				}));

		const lastCheckText = this.plugin.settings.lastCheck === 0 
			? 'Never' 
			: moment(this.plugin.settings.lastCheck).fromNow();

		new Setting(containerEl)
			.setName('Check All Updates')
			.setDesc(`Manually ping GitHub to check for updates across all tracked plugins. Last checked: ${lastCheckText}`)
			.addButton(btn => btn
				.setButtonText('Check Now')
				.onClick(async () => {
					btn.setButtonText('Checking...');
					btn.setDisabled(true);
					
					let count = 0;
					for (const repo of this.plugin.settings.trackedRepos) {
						const result = await checkPluginStatus(this.app, repo);
						this.plugin.updateCache[repo] = result;
						if (result.status === 'update_available' && this.plugin.settings.ignoredUpdates[repo] !== result.remoteVersion) {
							count++;
						}
					}
					
					this.plugin.settings.lastCheck = Date.now();
					await this.plugin.saveSettings();

					new Notice(`Check complete. ${count} updates available.`);
					this.display(); // Refresh UI to apply cached states
				}));

		new Setting(containerEl)
			.setName('Update All')
			.setDesc('Install all available tracked updates.')
			.addButton(btn => {
				this.updateAllBtnComponent = btn;
				btn.setButtonText('Update All (0)')
				   .setDisabled(true)
				   .setCta()
				   .onClick(async () => {
					   btn.setButtonText('Updating...');
					   btn.setDisabled(true);
					   for (const repo of this.updatesAvailable) {
						   await installPluginFromRepo(this.app, repo);
					   }
					   new Notice('Finished updating plugins.');
					   // clear cache to force status unknown or recheck
					   this.plugin.updateCache = {}; 
					   this.display();
				   });
			});

		new Setting(containerEl)
			.setName('Add Repository')
			.setDesc('Add a GitHub repository (e.g., username/repo) to track for updates.')
			.addText(text => text
				.setPlaceholder('TfTHacker/obsidian-brat')
				.onChange(value => {
					this.newRepoInput = value;
				}))
			.addButton(btn => btn
				.setButtonText('Add')
				.setCta()
				.onClick(async () => {
					const repo = this.newRepoInput.trim();
					if (!repo) return;
					
					if (this.plugin.settings.trackedRepos.includes(repo)) {
						new Notice('Repository is already tracked.');
						return;
					}

					this.plugin.settings.trackedRepos.push(repo);
					await this.plugin.saveSettings();
					this.display();
				}));

		(new Setting(containerEl) as any).setHeading().setName('Tracked Repositories');

		if (this.plugin.settings.trackedRepos.length === 0) {
			containerEl.createEl('p', { text: 'No repositories tracked yet.' });
			return;
		}

		// Sort alphabetically
		const sortedRepos = [...this.plugin.settings.trackedRepos].sort((a, b) => a.localeCompare(b));

		for (const repo of sortedRepos) {
			const repoSetting = new Setting(containerEl)
				.setName(repo)
				.setDesc('Status unknown. Click Check Status.');

			let checkBtn: any, actionBtn: any, notesBtn: any, ignoreBtn: any, removeBtn: any;

			repoSetting.addButton(btn => {
				checkBtn = btn;
				btn.setIcon('refresh-cw')
				   .setTooltip('Check Status')
				   .onClick(async () => {
					   repoSetting.setDesc('Checking GitHub...');
					   const result = await checkPluginStatus(this.app, repo);
					   this.plugin.updateCache[repo] = result;
					   
					   this.plugin.settings.lastCheck = Date.now();
					   await this.plugin.saveSettings();
					   
					   this.applyResultToUI(repo, repoSetting, actionBtn, notesBtn, ignoreBtn, result);
				   });
			});

			repoSetting.addButton(btn => {
				notesBtn = btn;
				btn.setIcon('file-text')
				   .setTooltip('Release Notes')
				   .onClick(() => {
					   const cached = this.plugin.updateCache[repo];
					   if (cached && cached.releaseNotes) {
						   new ReleaseNotesModal(this.app, repo, cached.remoteVersion || '', cached.releaseNotes).open();
					   } else {
						   new Notice("Release notes not available.");
					   }
				   });
				btn.buttonEl.hide();
			});

			repoSetting.addButton(btn => {
				actionBtn = btn;
				btn.setButtonText('Install/Update')
				   .setCta()
				   .onClick(async () => {
					   btn.setButtonText('Installing...');
					   await installPluginFromRepo(this.app, repo);
					   
					   this.updatesAvailable.delete(repo);
					   this.refreshUpdateAllButton();
					   
					   // Recheck status manually to verify install worked
					   const result = await checkPluginStatus(this.app, repo);
					   this.plugin.updateCache[repo] = result;
					   this.applyResultToUI(repo, repoSetting, actionBtn, notesBtn, ignoreBtn, result);
				   });
				btn.buttonEl.hide();
			});

			repoSetting.addButton(btn => {
				ignoreBtn = btn;
				btn.setButtonText('Ignore Update')
				   .onClick(async () => {
					   const remoteVer = ignoreBtn.buttonEl.getAttribute('data-remote-version');
					   if (remoteVer) {
						   this.plugin.settings.ignoredUpdates[repo] = remoteVer;
						   await this.plugin.saveSettings();
						   new Notice(`Ignored version ${remoteVer} for ${repo}`);
						   
						   this.updatesAvailable.delete(repo);
						   this.refreshUpdateAllButton();
						   
						   // Re-apply UI state
						   const cached = this.plugin.updateCache[repo];
						   if (cached) {
							   this.applyResultToUI(repo, repoSetting, actionBtn, notesBtn, ignoreBtn, cached);
						   }
					   }
				   });
				btn.buttonEl.hide();
			});

			repoSetting.addButton(btn => {
				removeBtn = btn;
				btn.setButtonText('Remove')
				   .setWarning()
				   .onClick(async () => {
					   this.plugin.settings.trackedRepos = this.plugin.settings.trackedRepos.filter(r => r !== repo);
					   delete this.plugin.settings.ignoredUpdates[repo];
					   await this.plugin.saveSettings();
					   delete this.plugin.updateCache[repo];
					   
					   this.updatesAvailable.delete(repo);
					   this.refreshUpdateAllButton();
					   
					   this.display();
				   });
			});

			// If we already have a cached result (e.g. from startup background check), apply it instantly
			const cachedResult = this.plugin.updateCache[repo];
			if (cachedResult) {
				this.applyResultToUI(repo, repoSetting, actionBtn, notesBtn, ignoreBtn, cachedResult);
			}
		}
	}

	refreshUpdateAllButton() {
		if (!this.updateAllBtnComponent) return;
		const count = this.updatesAvailable.size;
		this.updateAllBtnComponent.setButtonText(`Update All (${count})`);
		this.updateAllBtnComponent.setDisabled(count === 0);
	}

	applyResultToUI(repo: string, setting: Setting, actionBtn: any, notesBtn: any, ignoreBtn: any, result: PluginCheckResult) {
		actionBtn.buttonEl.hide();
		notesBtn.buttonEl.hide();
		ignoreBtn.buttonEl.hide();

		if (result.status === 'error') {
			setting.setDesc(`Error: ${result.errorMsg}`);
			return;
		}

		if (result.releaseNotes) {
			notesBtn.buttonEl.show();
		}

		if (result.status === 'not_installed') {
			setting.setDesc(`Not installed. Remote version: ${result.remoteVersion}`);
			actionBtn.setButtonText('Install');
			actionBtn.buttonEl.show();
			return;
		}

		if (result.status === 'up_to_date') {
			setting.setDesc(`Up to date. Version: ${result.localVersion}`);
			return;
		}

		if (result.status === 'update_available') {
			const ignoredVer = this.plugin.settings.ignoredUpdates[repo];
			if (ignoredVer === result.remoteVersion) {
				setting.setDesc(`Update available (${result.remoteVersion}), but ignored. Local: ${result.localVersion}`);
				actionBtn.setButtonText('Update (Ignored)');
				actionBtn.removeCta();
				actionBtn.buttonEl.show();
			} else {
				setting.setDesc(`Update available! Local: ${result.localVersion} -> Remote: ${result.remoteVersion}`);
				actionBtn.setButtonText('Update');
				actionBtn.setCta();
				actionBtn.buttonEl.show();
				
				ignoreBtn.buttonEl.setAttribute('data-remote-version', result.remoteVersion);
				ignoreBtn.buttonEl.show();

				this.updatesAvailable.add(repo);
				this.refreshUpdateAllButton();
			}
		}
	}
}
