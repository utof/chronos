import { ItemView, MarkdownView, WorkspaceLeaf } from "obsidian";

import Component from "./SvelteChronoView.svelte";

export const VIEW_TYPE_EXAMPLE = "example-view";

export class ChronosView extends ItemView {
	component: Component;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_EXAMPLE;
	}

	getDisplayText() {
		return "Example view";
	}

	async onOpen() {
		this.component = new Component({
			target: this.contentEl,
			props: {
				variable: 1,
				app: this.app,
			},
		});
	}

	async onClose() {
		this.component.$destroy();
	}
}
