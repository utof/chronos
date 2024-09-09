import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { ChronosModal } from "./modal";
import { ChronosView, VIEW_TYPE_CHRONOS } from "./chronoview";

export default class Chronos extends Plugin {
	async onload() {
		this.registerView(VIEW_TYPE_CHRONOS, (leaf) => new ChronosView(leaf));

		new Notice("Chronos loaded!");

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

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CHRONOS);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(true);
			// leaf = workspace.getLeaf(true);
			await leaf.setViewState({ type: VIEW_TYPE_CHRONOS, active: true });
		}
		// "Reveal" the leaf in case it is in a collapsed sidebar
		// make new window beforehand:

		workspace.revealLeaf(leaf);

		// workspace.revealLeaf(leaf);
	}
}
