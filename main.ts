import { Plugin, WorkspaceLeaf } from "obsidian";

// Assuming ChronosView will be in src/example.ts
import { ChronosView, CHRONOS_VIEW_TYPE } from "./src/example";

// Remember to rename these classes and interfaces!

export default class ChronosPlugin extends Plugin {
	async onload() {
		this.registerView(CHRONOS_VIEW_TYPE, (leaf) => new ChronosView(leaf));

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-chronos-feed",
			name: "Open Chronos Feed",
			callback: () => {
				this.activateView();
			},
		});

		console.log("Chronos Plugin Loaded");
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(CHRONOS_VIEW_TYPE);
		console.log("Chronos Plugin Unloaded");
	}

	async activateView() {
		// Check if the view is already open
		const existingLeaves =
			this.app.workspace.getLeavesOfType(CHRONOS_VIEW_TYPE);
		if (existingLeaves.length > 0) {
			// If already open, reveal the existing leaf
			this.app.workspace.revealLeaf(existingLeaves[0]);
			return;
		}

		// If not open, get a new leaf (try right split first)
		let leaf: WorkspaceLeaf | null = null;
		const existingLeaf = this.app.workspace.getMostRecentLeaf();

		if (existingLeaf) {
			leaf = this.app.workspace.getLeaf("tab");
		} else {
			leaf = this.app.workspace.getLeaf(true); // Create new leaf if no recent leaf exists
		}

		// Set the view state for the new leaf
		await leaf.setViewState({
			type: CHRONOS_VIEW_TYPE,
			active: true, // Focus the new leaf
		});

		// Reveal the leaf in the UI
		this.app.workspace.revealLeaf(leaf);
	}
}
