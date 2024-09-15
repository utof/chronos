// main.ts
import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { ChronosView, VIEW_TYPE_EXAMPLE } from "./chronoview";
import { fileStore } from "./stores";

export default class Chronos extends Plugin {
	async onload() {
		this.registerView(VIEW_TYPE_EXAMPLE, (leaf) => new ChronosView(leaf));

		new Notice("Chronos loaded!");
		this.writeVaultFilesToStore();

		["create", "modify", "delete", "rename"].forEach((event) => {
			this.registerEvent(
				(this.app.vault as any).on(
					event,
					this.writeVaultFilesToStore.bind(this)
				)
			);
		});

		this.addRibbonIcon("clock", "Chronos", () => {
			this.activateView();
		});
	}

	async onunload() {
		new Notice("Chronos unloaded");
	}

	writeVaultFilesToStore() {
		const files = this.app.vault.getMarkdownFiles();
		// files.sort((a, b) => a.stat.mtime - b.stat.mtime); // invert ordr
		files.sort((a, b) => b.stat.mtime - a.stat.mtime);
		fileStore.set(files);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Create a new leaf in the main workspace
			leaf = workspace.getLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
		}

		// Reveal the leaf
		workspace.revealLeaf(leaf);
	}
}
