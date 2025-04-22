import { ItemView, WorkspaceLeaf } from "obsidian";

// Import the Counter Svelte component and the `mount` and `unmount` methods.
import Counter from "./Component.svelte";
import { mount, unmount } from "svelte";

export const CHRONOS_VIEW_TYPE = "example-view";

export class ChronosView extends ItemView {
	// A variable to hold on to the Counter instance mounted in this ItemView.
	counter: ReturnType<typeof Counter> | undefined;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	files = this.app.vault.getMarkdownFiles();

	getViewType() {
		return CHRONOS_VIEW_TYPE;
	}

	getDisplayText() {
		return "Example view";
	}

	async onOpen() {
		// Attach the Svelte component to the ItemViews content element and provide the needed props.
		this.counter = mount(Counter, {
			target: this.contentEl,
			props: {
				startCount: 3,
				files: this.files,
			},
		});

		// Since the component instance is typed, the exported `increment` method is known to TypeScript.
		this.counter.increment();
	}

	async onClose() {
		if (this.counter) {
			// Remove the Counter from the ItemView.
			unmount(this.counter);
		}
	}
}
