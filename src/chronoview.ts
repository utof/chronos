import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_CHRONOS = "chronos-view";

export class ChronosView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_CHRONOS;
	}

	getDisplayText() {
		return "Chronological view";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h4", { text: "Chronooooooo" });
	}

	async onClose() {
		// Nothing to clean up.
	}
}
