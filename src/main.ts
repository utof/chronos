import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { ChronosModal } from "./modal";
import { ChronosView, VIEW_TYPE_EXAMPLE } from "./chronoview";
import { fileStore } from "./stores";

export default class Chronos extends Plugin {
	async onload() {
		this.registerView(VIEW_TYPE_EXAMPLE, (leaf) => new ChronosView(leaf));

		new Notice("Chronos loaded!");

		["create", "modify", "delete", "rename"].forEach((event) => {
			this.registerEvent(
				(this.app.vault as any).on(
					event,
					this.writeVaultFilesToStore.bind(this)
				)
			);
		}); //TG i wonder what bind is

		this.addRibbonIcon("clock", "Chronos", () => {
			// Creating a function that will display all the notes in chronological order as a modal

			new Notice("This is a notice!");
			this.activateView();
			// const modal = new ChronosModal(this.app).open();
		});
	}
	// What is "New"? A: It is a keyword that creates a new instance of a user-defined object type or of one of the built-in object types that has a constructor function.
	// Why not just Notice? A: Because it is a class, and we need to create an instance of it.
	// How do i know when to write New and when not? A: This will come with experience, but generally, if you are working with a class, you will need to use the new keyword.
	async onunload() {
		new Notice("Chronos unloaded");
	}

	writeVaultFilesToStore() {
		const files = this.app.vault.getMarkdownFiles(); // maybe get all files instead?
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
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getLeaf(true);
			// leaf = workspace.getLeaf(true);
			await leaf.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
		}
		// "Reveal" the leaf in case it is in a collapsed sidebar
		// make new window beforehand:

		workspace.revealLeaf(leaf);

		// workspace.revealLeaf(leaf);
	}
}
