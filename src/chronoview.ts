// chronoview.ts
import { ItemView, WorkspaceLeaf } from "obsidian";
import SvelteChronoView from "./SvelteChronoView.svelte";
export const VIEW_TYPE_EXAMPLE = "example-view";

export class ChronosView extends ItemView {
	component: SvelteChronoView;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_EXAMPLE;
	}

	getDisplayText() {
		return "Chronos";
	}

	async onOpen() {
		this.component = new SvelteChronoView({
			target: this.contentEl,
			props: {
				app: this.app,
			},
		});
	}

	async onClose() {
		this.component.$destroy();
	}
}
