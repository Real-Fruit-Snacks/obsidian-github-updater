<div align="center">

  # Obsidian GitHub Plugin Updater

  **Effortlessly install, manage, and update your unofficial plugins directly from GitHub.**

  [![License: MIT](https://img.shields.io/badge/License-MIT-cba6f7.svg)](https://opensource.org/licenses/MIT)
  [![Version](https://img.shields.io/badge/version-1.2.2-89b4fa)](https://github.com/Real-Fruit-Snacks/obsidian-github-updater/releases)
  
  [Documentation](https://Real-Fruit-Snacks.github.io/obsidian-github-updater/) • [Report Issue](https://github.com/Real-Fruit-Snacks/obsidian-github-updater/issues) • [Request Feature](https://github.com/Real-Fruit-Snacks/obsidian-github-updater/issues)

</div>

---

## Overview

A powerful plugin for Obsidian that allows you to effortlessly install, manage, and update your unofficial plugins directly from GitHub without relying on manual downloads.

### Key Features

- **Install from GitHub**: Easily install any plugin not found in the community store by simply entering the `username/repo`.
- **Auto-Detect Unofficial Plugins**: A built-in Vault Scanner compares your installed plugins against the official Community Plugins list. It flags unofficial ones and intelligently guesses their GitHub repository to automatically start tracking them.
- **Smart Update Checker**: Keep your unofficial plugins up to date. The plugin fetches the latest releases from GitHub and accurately compares versions.
- **Intelligent Fallback**: Can't find release assets? The updater automatically falls back to raw source code to securely download plugins if the developer didn't attach them.
- **Update All**: One-click button to securely update all your tracked plugins sequentially.
- **Native Release Notes Viewer**: View GitHub markdown release changelogs perfectly rendered within an Obsidian modal before you decide to update.
- **Ignore Updates**: Skip a specific update without losing tracking for future versions.

---

## Getting Started

### Installation

**Method 1: Using BRAT (Recommended)**
If you use [Obsidian BRAT](https://github.com/TfTHacker/obsidian-brat):
1. Open the BRAT settings and click **Add Beta plugin**.
2. Enter `Real-Fruit-Snacks/obsidian-github-updater`.
3. Enable the plugin in your Obsidian Community Plugins settings.

**Method 2: Manual Installation**
1. Go to the [Releases](https://github.com/Real-Fruit-Snacks/obsidian-github-updater/releases) page.
2. Download `main.js` and `manifest.json` from the latest release.
3. Create a folder named `obsidian-github-updater` inside your vault's `.obsidian/plugins/` directory.
4. Place the downloaded files into that folder.
5. Reload Obsidian and enable the plugin in your settings.

---

## Usage

1. Go to **Settings -> GitHub Plugin Updater**.
2. Click **Scan Vault** to auto-detect any currently installed unofficial plugins.
3. Or manually type a repository name (e.g., `TfTHacker/obsidian-brat`) into the **Add Repository** field.
4. Use the list to manage your tracked plugins, read release notes, and install updates!

---

## Architecture / File Structure

```text
obsidian-github-updater/
├── main.js              # Compiled plugin entry
├── manifest.json        # Obsidian plugin manifest
├── esbuild.config.mjs   # Build configuration
└── src/                 # TypeScript source code
```

---

## Contributing

Contributions from the community are highly encouraged. Whether it's adding new features, improving the scanner, or fixing bugs, your help is appreciated.

Please refer to the `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` files for full guidelines on how to submit pull requests and report issues.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

## Contact

Real-Fruit-Snacks - [https://github.com/Real-Fruit-Snacks](https://github.com/Real-Fruit-Snacks)

Project Link: [https://github.com/Real-Fruit-Snacks/obsidian-github-updater](https://github.com/Real-Fruit-Snacks/obsidian-github-updater)
