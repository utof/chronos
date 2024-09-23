<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { normalizePath, TFile, TFolder } from "obsidian";
    import { fileStore } from "./stores";
    import NoteItem from "./NoteItem.svelte";

    export let app; // Obsidian app instance

    let noteStates = [];
    let unsubscribe;

    let allMOCs: TFile[] = [];
    let allFolders: TFile[] = [];

    let selectedFilterPath: string = '';
    let filterType: 'all' | 'MOC' | 'folder' = 'all';

    onMount(() => {
        // Subscribe to fileStore changes
        unsubscribe = fileStore.subscribe((files) => {
            if (filterType === 'all') {
                loadNotes(files);
            } else {
                applyFilter();
            }
        });

        // Load all MOCs and Folders
        loadAllMOCsAndFolders();
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });

    async function loadNotes(files: TFile[]) {
        console.log("Loading notes:", files);
        const newNoteStates = [];
        for (let file of files) {
            const content = await app.vault.cachedRead(file);
            newNoteStates.push({
                file,
                content,
                isEditing: false,
                container: null,
            });
        }
        noteStates = newNoteStates; // Reassign to trigger reactivity
        console.log("Note states:", noteStates);
    }

    function loadAllMOCsAndFolders() {
        const allFiles = app.vault.getMarkdownFiles();
        allMOCs = [];
        allFolders = [];

        for (const file of allFiles) {
            const cache = app.metadataCache.getFileCache(file);
            const tags = getAllTags(cache);

            if (tags.has('#MOC') || tags.has('MOC')) {
                allMOCs.push(file);
            }

            if (tags.has('#folder') || tags.has('folder')) {
                allFolders.push(file);
            }
        }
    }

    function getAllTags(cache) {
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
                if (typeof frontmatterTags === 'string') {
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

    async function applyFilter() {
        if (filterType === 'all') {
            const files = app.vault.getMarkdownFiles();
            loadNotes(files);
        } else if (filterType === 'MOC' && selectedFilterPath) {
            const mocNote = app.vault.getAbstractFileByPath(selectedFilterPath) as TFile;
            if (mocNote) {
                const children = await getMOCChildren(mocNote);
                loadNotes(children);
            } else {
                console.error('MOC note not found.');
            }
        } else if (filterType === 'folder' && selectedFilterPath) {
            const folderNote = app.vault.getAbstractFileByPath(selectedFilterPath) as TFile;
            if (folderNote) {
                // Attempt to get the folder path from frontmatter
                console.log('Folder note1:', folderNote);
                const cache = app.metadataCache.getFileCache(folderNote);
                let folderPath = '';

                // console.log('eFolder path3:', folderNote.path);
                console.log('eFolder parentpath:', folderNote.parent.path);
                // Fallback: Assume folder has the same name as note's basename

                // folderPath = folderNote.path.replace(/\.md$/, '');
                folderPath = normalizePath(folderNote.parent.path);
                // console.log('normalized path:', folderPath);

                const folder = app.vault.getAbstractFileByPath(folderPath);
                if (folder && folder instanceof TFolder) {
                    console.log('Folder4:', folder);
                    const children = await getFolderChildren(folder as TFolder, true);
                    // Filter out TFolders, we only want TFiles
                    const files = children.filter(item => item instanceof TFile) as TFile[];
                    loadNotes(files);
                } else {
                    console.error('Folder not found for selected filter.');
                }
            } else {
                console.error('Folder note not found.');
            }
        }
    }

    async function getMOCChildren(mocNote: TFile): Promise<TFile[]> {
        const children: TFile[] = [];
        const cache = app.metadataCache.getFileCache(mocNote);
        let parentOf = [];

        if (cache?.frontmatter?.parent_of) {
            parentOf = cache.frontmatter.parent_of;
            if (typeof parentOf === 'string') {
                parentOf = [parentOf];
            }
            for (const link of parentOf) {
                // Clean up the link
                const cleanLink = link.replace(/^\[\[|\]\]$/g, '');
                const resolvedFile = app.metadataCache.getFirstLinkpathDest(cleanLink, mocNote.path);
                if (resolvedFile) {
                    children.push(resolvedFile);
                } else {
                    console.warn(`Could not resolve link: ${link} in MOC: ${mocNote.path}`);
                }
            }
        } else {
            console.warn(`No parent_of field found in MOC: ${mocNote.path}`);
        }
        return children;
    }

    async function getFolderChildren(folder: TFolder, recursive = true): Promise<(TFile | TFolder)[]> {
        const children: (TFile | TFolder)[] = [];

        for (const child of folder.children) {
            if (child instanceof TFile || child instanceof TFolder) {
                children.push(child);
            }
            if (recursive && child instanceof TFolder) {
                const subChildren = await getFolderChildren(child, recursive);
                children.push(...subChildren);
            }
        }

        return children;
    }
</script>

<!-- UI for selecting the filter -->
<div>
    <label>
        <input type="radio" bind:group={filterType} value="all" on:change={applyFilter}>
        All Notes
    </label>
    <label>
        <input type="radio" bind:group={filterType} value="MOC" on:change={applyFilter}>
        Filter by MOC
    </label>
    <label>
        <input type="radio" bind:group={filterType} value="folder" on:change={applyFilter}>
        Filter by Folder
    </label>
</div>

{#if filterType === 'MOC'}
    <select bind:value={selectedFilterPath} on:change={applyFilter}>
        <option value="">Select MOC</option>
        {#each allMOCs as moc}
            <option value={moc.path}>{moc.basename}</option>
        {/each}
    </select>
{/if}

{#if filterType === 'folder'}
    <select bind:value={selectedFilterPath} on:change={applyFilter}>
        <option value="">Select Folder Note</option>
        {#each allFolders as folderNote}
            <option value={folderNote.path}>{folderNote.basename}</option>
        {/each}
    </select>
{/if}

{#if noteStates.length === 0}
    <p>Loading notes...</p>
{:else}
    {#each noteStates as noteState (noteState.file.path)}
        <NoteItem {noteState} {app} />
    {/each}
{/if}
