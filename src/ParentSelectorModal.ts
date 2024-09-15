//ParentSelectorModal.ts
import { App, Modal, TFile } from "obsidian";

export class ParentSelectorModal extends Modal {
	app: App;
	onChooseItems: (items: TFile[]) => void;
	files: TFile[];
	selectedItems: Set<TFile>;
	filteredFiles: TFile[];
	searchQuery: string;
	fileListContainer: HTMLElement;
	relevantParents: Map<TFile, number>;

	constructor(
		app: App,
		onChooseItems: (items: TFile[]) => void,
		relevantParents: [TFile, number][]
	) {
		super(app);
		this.app = app;
		this.onChooseItems = onChooseItems;
		this.files = this.app.vault.getMarkdownFiles();
		this.selectedItems = new Set();
		this.filteredFiles = this.files;
		this.searchQuery = "";
		this.relevantParents = new Map(relevantParents);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Select Parent Notes" });

		const searchInput = contentEl.createEl("input", {
			type: "text",
			placeholder: "Search...",
		});
		searchInput.addEventListener("input", (e) => {
			this.searchQuery = (
				e.target as HTMLInputElement
			).value.toLowerCase();
			this.updateFileList();
		});

		this.fileListContainer = contentEl.createDiv({ cls: "file-list" });
		this.updateFileList();

		const buttonContainer = contentEl.createDiv({
			cls: "modal-button-container",
		});

		const addButton = buttonContainer.createEl("button", {
			text: "Add Parents",
			cls: "mod-cta",
		});
		addButton.addEventListener("click", () => {
			this.onChooseItems(Array.from(this.selectedItems));
			this.close();
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel",
		});
		cancelButton.addEventListener("click", () => {
			this.close();
		});
	}

	updateFileList() {
		if (this.fileListContainer) {
			this.fileListContainer.empty();

			// Combine relevant parents and other files
			const allFilesWithCounts: { file: TFile; count: number }[] = [];

			// Add relevant parents first
			for (let [file, count] of this.relevantParents.entries()) {
				if (file.path.toLowerCase().includes(this.searchQuery)) {
					allFilesWithCounts.push({ file, count });
				}
			}

			// Add other files without counts
			for (let file of this.files) {
				if (this.relevantParents.has(file)) continue; // Skip already added relevant parents
				if (file.path.toLowerCase().includes(this.searchQuery)) {
					allFilesWithCounts.push({ file, count: 0 });
				}
			}

			// Display files
			allFilesWithCounts.forEach(({ file, count }) => {
				const fileItem = this.fileListContainer.createDiv({
					cls: "file-item",
				});
				const checkbox = fileItem.createEl("input", {
					type: "checkbox",
				});
				checkbox.checked = this.selectedItems.has(file);
				checkbox.addEventListener("change", () => {
					if (checkbox.checked) {
						this.selectedItems.add(file);
					} else {
						this.selectedItems.delete(file);
					}
				});
				const label = fileItem.createEl("label");
				label.appendText(file.path);
				if (count > 0) {
					label.appendText(` (${count})`);
				}
				label.prepend(checkbox);
			});
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
