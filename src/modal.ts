import { Modal, App } from "obsidian";

export class ChronosModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h1", { text: "Chronological Notes" });

		// Assuming we have a method to get notes in chronological order
		const notes = this.getChronologicalNotes();
		notes.forEach((note) => {
			contentEl.createEl("div", { text: note });
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	getChronologicalNotes(): string[] {
		const files = this.app.vault.getMarkdownFiles();
		const notesWithDates = files.map((file) => ({
			path: file.path,
			date: file.stat.mtime, // or file.stat.mtime for modification date
		}));

		notesWithDates.sort((a, b) => a.date - b.date);

		return notesWithDates.map((note) => note.path);
	}
}
