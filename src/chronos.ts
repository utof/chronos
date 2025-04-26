// chronos.ts
import { ItemView, WorkspaceLeaf, TFile } from "obsidian";

import ChronosComponent from "./Chronos.svelte";
import { mount, unmount } from "svelte";

export const CHRONOS_VIEW_TYPE = "chronos-view";

export class ChronosView extends ItemView {
	rendererComponent: ReturnType<typeof ChronosComponent> | undefined;
	files: TFile[];

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return CHRONOS_VIEW_TYPE;
	}

	getDisplayText() {
		return "Chronological File View";
	}

	async onOpen() {
		// Ensure the content element is empty before mounting
		this.contentEl.empty();

		this.rendererComponent = mount(ChronosComponent, {
			target: this.contentEl,
			props: {
				viewComponent: this,
			},
		});
	}

	async onClose() {
		if (this.rendererComponent) {
			unmount(this.rendererComponent);
		}
	}
}
