<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { normalizePath, TFile, TFolder } from "obsidian";
    import { fileStore } from "./stores";
    import NoteItem from "./NoteItem.svelte";
    import {
        getAllTags,
        getMOCChildCount,
        getFolderChildCount
    } from "./utils";

    export let app; // Obsidian app instance

    let noteStates = [];
    let unsubscribe;

    let combinedMOCsAndFolders = [];

    let selectedFilterPath: string = '';
    let filterType: 'all' | 'MOCFolder' = 'all';

    let sortOption = 'name';
    let noteSortOption = 'creationDate';

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

        sortNotes();
    }

    function sortNotes() {
        if (noteSortOption === 'creationDate') {
            noteStates = [...noteStates].sort((a, b) => b.file.stat.ctime - a.file.stat.ctime);
        } else if (noteSortOption === 'lastUpdated') {
            noteStates = [...noteStates].sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
        } else if (noteSortOption === 'lastUpdatedExcludingHeader') {
            // Placeholder: Implement logic to exclude header updates
            noteStates = [...noteStates].sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
        }
    }

    function loadAllMOCsAndFolders() {
        const allFiles = app.vault.getMarkdownFiles();
        combinedMOCsAndFolders = [];

        for (const file of allFiles) {
            const cache = app.metadataCache.getFileCache(file);
            const tags = getAllTags(cache);

            let isMOC = tags.has('#MOC') || tags.has('MOC');
            let isFolder = tags.has('#folder') || tags.has('folder');

            if (isMOC || isFolder) {
                // Compute child count
                let childCount = 0;

                if (isMOC) {
                    childCount = getMOCChildCount(app, file);
                }

                if (isFolder) {
                    const folderPath = file.parent.path;
                    const folder = app.vault.getAbstractFileByPath(folderPath);
                    if (folder && folder instanceof TFolder) {
                        childCount = getFolderChildCount(folder);
                    }
                }

                combinedMOCsAndFolders.push({
                    file,
                    tag: isFolder ? '#folder' : '#MOC',
                    childCount,
                });
            }
        }

        sortCombinedList();
    }

    async function applyFilter() {
        if (filterType === 'all') {
            const files = app.vault.getMarkdownFiles();
            loadNotes(files);
        } else if (filterType === 'MOCFolder' && selectedFilterPath) {
            const selectedFile = app.vault.getAbstractFileByPath(selectedFilterPath) as TFile;
            const selectedItem = combinedMOCsAndFolders.find(item => item.file.path === selectedFilterPath);

            if (selectedItem) {
                let children = [];
                if (selectedItem.tag === '#MOC') {
                    children = await getMOCChildren(selectedFile);
                } else if (selectedItem.tag === '#folder') {
                    const folderPath = normalizePath(selectedFile.parent.path);
                    const folder = app.vault.getAbstractFileByPath(folderPath);
                    if (folder && folder instanceof TFolder) {
                        children = await getFolderChildren(folder as TFolder, true);
                        // Filter out TFolders, we only want TFiles
                        children = children.filter(item => item instanceof TFile) as TFile[];
                    } else {
                        console.error('Folder not found for selected filter.');
                    }
                }

                noteStates = []; // Clear existing notes
                await loadNotes(children);
            } else {
                console.error('Selected item not found in combined list.');
            }
        }
    }

    function sortCombinedList() {
        if (sortOption === 'name') {
            combinedMOCsAndFolders = [...combinedMOCsAndFolders].sort((a, b) => a.file.basename.localeCompare(b.file.basename));
        } else if (sortOption === 'lastUpdated') {
            combinedMOCsAndFolders = [...combinedMOCsAndFolders].sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
        } else if (sortOption === 'childCount') {
            combinedMOCsAndFolders = [...combinedMOCsAndFolders].sort((a, b) => b.childCount - a.childCount);
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
                const cleanLink = link.replace(/^\[\[|\]\]$/g, '');
                const resolvedFile = app.metadataCache.getFirstLinkpathDest(cleanLink, mocNote.path);
                if (resolvedFile) {
                    if (!children.includes(resolvedFile)) {
                        children.push(resolvedFile);
                    }
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
        <input type="radio" bind:group={filterType} value="MOCFolder" on:change={applyFilter}>
        Filter by MOC/Folder
    </label>
    {#if filterType === 'MOCFolder'}
        <label>
            Sort by:
            <select bind:value={sortOption} on:change={() => { sortCombinedList(); }}>
                <option value="name">Name</option>
                <option value="lastUpdated">Last Updated</option>
                <option value="childCount">Child Count</option>
            </select>
        </label>
    {/if}
    <!-- Sorting for notes -->
    <div>
        <label>
            Note Sorting:
            <select bind:value={noteSortOption} on:change={sortNotes}>
                <option value="creationDate">Creation Date</option>
                <option value="lastUpdated">Last Updated</option>
                <option value="lastUpdatedExcludingHeader">Last Updated (Excluding Header)</option>
            </select>
        </label>
    </div>
</div>

{#if filterType === 'MOCFolder'}
    <select bind:value={selectedFilterPath} on:change={applyFilter}>
        <option value="">Select MOC or Folder</option>
        {#each combinedMOCsAndFolders as item}
            <option value={item.file.path} class:folder-option={item.tag === '#folder'}>
                {item.file.basename} ({item.childCount}) {item.tag === '#folder' ? '[folder]' : ''}
            </option>
        {/each}
    </select>
{/if}

<!-- Existing code for displaying notes -->
{#if noteStates.length === 0}
    <p>Loading notes...</p>
{:else}
    {#each noteStates as noteState (noteState.file.path)}
        <NoteItem {noteState} {app} />
    {/each}
{/if}


<style>
    /* Style for folder options in the select dropdown */
    .folder-option {
        background-color: #e6f2ff; /* bluish background */
        color: black;
    }
    /* Existing styles... */
</style>
