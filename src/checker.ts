import { App, requestUrl } from 'obsidian';

export interface PluginCheckResult {
	status: 'not_installed' | 'up_to_date' | 'update_available' | 'error';
	remoteVersion?: string;
	localVersion?: string | null;
	releaseNotes?: string;
	errorMsg?: string;
}

export async function checkPluginStatus(app: App, repo: string): Promise<PluginCheckResult> {
	try {
		let cleanRepo = repo.trim();
		if (cleanRepo.includes('github.com/')) {
			cleanRepo = cleanRepo.split('github.com/')[1];
		}
		if (cleanRepo.endsWith('/')) cleanRepo = cleanRepo.slice(0, -1);

		const releaseUrl = `https://api.github.com/repos/${cleanRepo}/releases/latest`;
		const releaseResponse = await requestUrl({ url: releaseUrl });
		const releaseData = releaseResponse.json;

		const manifestAsset = releaseData.assets?.find((a: any) => a.name === 'manifest.json');
		let remoteManifest: any;

		if (manifestAsset) {
			const res = await requestUrl({ url: manifestAsset.browser_download_url });
			remoteManifest = res.json;
		} else {
			const tagName = releaseData.tag_name;
			const rawUrl = `https://raw.githubusercontent.com/${cleanRepo}/${tagName}/manifest.json`;
			const res = await requestUrl({ url: rawUrl });
			remoteManifest = res.json;
		}

		const pluginId = remoteManifest.id;
		const remoteVersion = remoteManifest.version;
		const releaseNotes = releaseData.body;

		const localManifestPath = `.obsidian/plugins/${pluginId}/manifest.json`;
		let localVersion = null;
		if (await app.vault.adapter.exists(localManifestPath)) {
			const localManifestStr = await app.vault.adapter.read(localManifestPath);
			const localManifest = JSON.parse(localManifestStr);
			localVersion = localManifest.version;
		}

		if (!localVersion) {
			return { status: 'not_installed', remoteVersion, localVersion, releaseNotes };
		}

		if (compareVersions(remoteVersion, localVersion) > 0) {
			return { status: 'update_available', remoteVersion, localVersion, releaseNotes };
		} else {
			return { status: 'up_to_date', remoteVersion, localVersion, releaseNotes };
		}
	} catch (e: any) {
		return { status: 'error', errorMsg: e.message || String(e) };
	}
}

export function compareVersions(v1: string, v2: string): number {
	const parts1 = v1.split('.').map(Number);
	const parts2 = v2.split('.').map(Number);
	const maxLen = Math.max(parts1.length, parts2.length);
	for (let i = 0; i < maxLen; i++) {
		const num1 = parts1[i] || 0;
		const num2 = parts2[i] || 0;
		if (num1 > num2) return 1;
		if (num1 < num2) return -1;
	}
	return 0;
}
