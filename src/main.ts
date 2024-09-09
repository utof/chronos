import { Notice, Plugin } from "obsidian";
import { ChronosModal } from "./modal";

export default class Chronos extends Plugin {
	async onload() {
		new Notice("Chronos loaded!");
		this.addRibbonIcon("clock", "Chronos", () => {
			// Creating a function that will display all the notes in chronological order as a modal

			new Notice("This is a notice!");

			// const modal = new ChronosModal(this.app).open();
		});
	}
	// What is "New"? A: It is a keyword that creates a new instance of a user-defined object type or of one of the built-in object types that has a constructor function.
	// Why not just Notice? A: Because it is a class, and we need to create an instance of it.
	// How do i know when to write New and when not? A: This will come with experience, but generally, if you are working with a class, you will need to use the new keyword.
	async onunload() {
		new Notice("Chronos unloaded");
	}
}
