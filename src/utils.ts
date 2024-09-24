// utils.ts
import { TFile, TFolder } from "obsidian";

export function getAllTags(cache): Set<string> {
	const tags = new Set<string>();

	// Inline tags
	if (cache?.tags) {
		for (let tagObj of cache.tags) {
			tags.add(tagObj.tag);
		}
	}

	// Frontmatter tags
	if (cache?.frontmatter) {
		const frontmatterTags = cache.frontmatter.tags;
		if (frontmatterTags) {
			if (typeof frontmatterTags === "string") {
				tags.add(frontmatterTags);
			} else if (Array.isArray(frontmatterTags)) {
				for (let tag of frontmatterTags) {
					tags.add(tag);
				}
			}
		}
	}
	return tags;
}

export function getMOCChildCount(app, mocFile: TFile): number {
	const cache = app.metadataCache.getFileCache(mocFile);
	let parentOf = [];

	if (cache?.frontmatter?.parent_of) {
		parentOf = cache.frontmatter.parent_of;
		if (typeof parentOf === "string") {
			parentOf = [parentOf];
		}
		return parentOf.length;
	}
	return 0;
}

export function getFolderChildCount(folder: TFolder): number {
	let count = 0;

	for (const child of folder.children) {
		if (child instanceof TFile || child instanceof TFolder) {
			count++;
		}
		if (child instanceof TFolder) {
			count += getFolderChildCount(child);
		}
	}
	return count;
}

export async function updateParentOf(app, parentFile: TFile, childFile: TFile) {
	await app.fileManager.processFrontMatter(parentFile, (frontmatter) => {
		if (!frontmatter.parent_of) {
			frontmatter.parent_of = [];
		}

		const childFileLink = `[[${childFile.basename}]]`;
		if (!frontmatter.parent_of.includes(childFileLink)) {
			frontmatter.parent_of.push(childFileLink);
		}
	});
}

export function arraysEqual(a1: string[], a2: string[]): boolean {
	if (a1.length !== a2.length) return false;
	for (let i = 0; i < a1.length; i++) {
		if (a1[i] !== a2[i]) return false;
	}
	return true;
}

export async function getBestParentPaths(
	app,
	note: TFile
): Promise<Map<string, [TFile, number]>> {
	const mocTag = "MOC";
	const folderTag = "folder";

	// Step 1: Get links and backlinks of the current note
	const links = app.metadataCache.resolvedLinks[note.path] || {};
	const backlinks = app.metadataCache.getBacklinksForFile(note)?.data || {};

	// Combine links and backlinks into a set of neighbor paths
	const neighborPaths = new Set<string>();

	for (let path in links) {
		neighborPaths.add(path);
	}
	for (let path in backlinks) {
		neighborPaths.add(path);
	}
	// Exclude the current note
	neighborPaths.delete(note.path);

	// Step 2: For each neighbor, get their links and backlinks
	const mocCounts: Map<string, [TFile, number]> = new Map();

	for (let neighborPath of neighborPaths) {
		const neighborFile = app.vault.getAbstractFileByPath(
			neighborPath
		) as TFile;
		if (neighborFile) {
			const neighborLinks =
				app.metadataCache.resolvedLinks[neighborPath] || {};
			const neighborBacklinks =
				app.metadataCache.getBacklinksForFile(neighborFile)?.data || {};

			// Combine neighbor's links and backlinks
			const neighborNeighborPaths = new Set<string>();

			for (let path in neighborLinks) {
				neighborNeighborPaths.add(path);
			}
			for (let path in neighborBacklinks) {
				neighborNeighborPaths.add(path);
			}
			// Exclude the neighbor and the current note
			neighborNeighborPaths.delete(neighborPath);
			neighborNeighborPaths.delete(note.path);

			// Step 3: Check which of these links are MOCs or folders
			for (let path of neighborNeighborPaths) {
				const file = app.vault.getAbstractFileByPath(path) as TFile;
				if (file) {
					const cache = app.metadataCache.getFileCache(file);
					const tags = getAllTags(cache);
					if (tags.has(mocTag) || tags.has(folderTag)) {
						// Increment the count for this MOC/folder
						const existing = mocCounts.get(file.path);
						if (existing) {
							existing[1] += 1;
						} else {
							mocCounts.set(file.path, [file, 1]);
						}
					}
				}
			}
		}
	}

	return mocCounts;
}
