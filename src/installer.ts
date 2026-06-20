import { App, Notice, requestUrl } from 'obsidian';

export async function installPluginFromRepo(app: App, repo: string): Promise<string | null> {
	try {
		let cleanRepo = repo.trim();
		if (cleanRepo.includes('github.com/')) {
			cleanRepo = cleanRepo.split('github.com/')[1];
		}
		if (cleanRepo.endsWith('/')) {
			cleanRepo = cleanRepo.slice(0, -1);
		}

		new Notice(`Fetching latest release for ${cleanRepo}...`);

		const releaseUrl = `https://api.github.com/repos/${cleanRepo}/releases/latest`;
		const releaseResponse = await requestUrl({ url: releaseUrl });
		const releaseData = releaseResponse.json;

		const manifestAsset = releaseData.assets?.find((a: any) => a.name === 'manifest.json');
		const mainJsAsset = releaseData.assets?.find((a: any) => a.name === 'main.js');
		const stylesCssAsset = releaseData.assets?.find((a: any) => a.name === 'styles.css');

		const tagName = releaseData.tag_name;
		const rawBaseUrl = `https://raw.githubusercontent.com/${cleanRepo}/${tagName}`;

		// 1. Fetch manifest.json
		let manifestJson: any;
		try {
			if (manifestAsset) {
				const res = await requestUrl({ url: manifestAsset.browser_download_url });
				manifestJson = res.json;
			} else {
				const res = await requestUrl({ url: `${rawBaseUrl}/manifest.json` });
				manifestJson = res.json;
			}
		} catch (e) {
			new Notice(`Failed to download manifest.json for ${cleanRepo}. Ensure the repository has it in the release or root directory.`);
			return null;
		}

		const pluginId = manifestJson.id;
		if (!pluginId) {
			new Notice(`Invalid manifest.json in ${cleanRepo}: missing plugin ID.`);
			return null;
		}

		const pluginDir = `.obsidian/plugins/${pluginId}`;
		const adapter = app.vault.adapter;
		
		if (!(await adapter.exists(pluginDir))) {
			await adapter.mkdir(pluginDir);
		}

		// Save manifest.json
		await adapter.write(`${pluginDir}/manifest.json`, JSON.stringify(manifestJson, null, 2));

		// 2. Fetch main.js
		try {
			let mainJsArrayBuffer: ArrayBuffer;
			if (mainJsAsset) {
				const res = await requestUrl({ url: mainJsAsset.browser_download_url });
				mainJsArrayBuffer = res.arrayBuffer;
			} else {
				const res = await requestUrl({ url: `${rawBaseUrl}/main.js` });
				mainJsArrayBuffer = res.arrayBuffer;
			}
			await adapter.writeBinary(`${pluginDir}/main.js`, mainJsArrayBuffer);
		} catch (e) {
			new Notice(`Failed to download main.js for ${cleanRepo}.`);
			return null;
		}

		// 3. Fetch styles.css (optional)
		try {
			let stylesArrayBuffer: ArrayBuffer | null = null;
			if (stylesCssAsset) {
				const res = await requestUrl({ url: stylesCssAsset.browser_download_url });
				stylesArrayBuffer = res.arrayBuffer;
			} else {
				// Don't throw if raw styles.css is missing
				const res = await requestUrl({ url: `${rawBaseUrl}/styles.css`, throw: false } as any);
				if (res.status === 200) {
					stylesArrayBuffer = res.arrayBuffer;
				}
			}
			
			if (stylesArrayBuffer) {
				await adapter.writeBinary(`${pluginDir}/styles.css`, stylesArrayBuffer);
			}
		} catch (e) {
			// Silently ignore styles failure
		}

		new Notice(`Successfully installed ${pluginId}! Please reload the app or enable it in Settings.`);
		return pluginId;

	} catch (error: any) {
		console.error(error);
		new Notice(`Failed to install ${repo}: ${error.message || error}`);
		return null;
	}
}
