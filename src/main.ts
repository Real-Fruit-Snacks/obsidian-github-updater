import { Plugin, Notice } from 'obsidian';
import { GithubInstallModal } from './GithubInstallModal';
import { GithubUpdaterSettingTab } from './GithubUpdaterSettingTab';
import { checkPluginStatus, PluginCheckResult } from './checker';

export interface GithubUpdaterSettings {
	trackedRepos: string[];
	ignoredUpdates: Record<string, string>; // repo -> version
	lastCheck: number;
}

const DEFAULT_SETTINGS: GithubUpdaterSettings = {
	trackedRepos: [],
	ignoredUpdates: {},
	lastCheck: 0
}

export default class GithubUpdaterPlugin extends Plugin {
	settings: GithubUpdaterSettings;
	updateCache: Record<string, PluginCheckResult> = {};

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new GithubUpdaterSettingTab(this.app, this));

		const ribbonIconEl = this.addRibbonIcon('github', 'Install Plugin from GitHub', (evt: MouseEvent) => {
			new GithubInstallModal(this.app, this).open();
		});

		this.addCommand({
			id: 'open-github-installer-modal',
			name: 'Install plugin from GitHub',
			callback: () => {
				new GithubInstallModal(this.app, this).open();
			}
		});

		// Background startup check after 5 seconds
		this.app.workspace.onLayoutReady(() => {
			window.setTimeout(() => {
				this.runBackgroundUpdateCheck();
			}, 5000);
		});
	}

	async onunload() {
		// Cleanup if necessary
	}

	async runBackgroundUpdateCheck() {
		let updatesFound = 0;
		for (const repo of this.settings.trackedRepos) {
			const result = await checkPluginStatus(this.app, repo);
			this.updateCache[repo] = result;
			
			if (result.status === 'update_available') {
				const ignoredVer = this.settings.ignoredUpdates[repo];
				if (ignoredVer !== result.remoteVersion) {
					updatesFound++;
				}
			}
		}
		
		if (updatesFound > 0) {
			new Notice(`GitHub Plugin Updater: ${updatesFound} update(s) available! Check settings to install.`);
		}
		
		this.settings.lastCheck = Date.now();
		await this.saveSettings();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
