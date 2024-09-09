import { Notice, Plugin } from "obsidian";

export default class Chronos extends Plugin {
	async onload() {
		new Notice("Chronos loaded!");
	}

	async onunload() {
		console.log("Chronos unloaded");
	}
}
