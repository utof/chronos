<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { TFile, TFolder, MarkdownRenderer } from "obsidian";
    import { EditorView, basicSetup } from '@codemirror/basic-setup';
    import { EditorState } from "@codemirror/state";

    export let app;
    export let noteState: {
        file: TFile;
        content: string;
        isEditing: boolean;
        container: HTMLElement;
    };

    let containerEl: HTMLElement;
    let editorView: EditorView | null = null;
    let parentNotes: { file: TFile, tag: string }[] = [];
    let parentInputEl: HTMLInputElement;
    let suggestionList: {
        file: TFile,
        tag: string,
        childCount: number,
        neighborCount: number
    }[] = [];
    let showSuggestions = false;
    let query = '';
    let sortOption = 'name';

    // Variables for move functionality
    let moveError: string = '';

    $: if (!noteState.isEditing && containerEl) {
        renderNoteContent();
    }

    onMount(async () => {
        await loadParentNotes();
    });

    async function renderNoteContent() {
        const { content, file } = noteState;
        containerEl.innerHTML = '';
        await MarkdownRenderer.renderMarkdown(
            content,
            containerEl,
            file.path,
            null
        );
    }
    async function moveNoteToParentFolder(parentEntry) {
        const parentFile = parentEntry.file;
        const targetFolder = parentFile.parent;
        if (targetFolder) {
            const newPath = `${targetFolder.path}/${noteState.file.name}`;
            try {
                await app.vault.rename(noteState.file, newPath);
                noteState.file = app.vault.getAbstractFileByPath(newPath) as TFile;
                noteState.file.path = newPath;
                await loadParentNotes();
                renderNoteContent();
            } catch (error) {
                moveError = `Failed to move note: ${error.message}`;
            }
        } else {
            console.error("Parent note has no parent folder.");
        }
    }
    function editNote() {
        noteState.isEditing = true;
        containerEl.innerHTML = '';
        const state = EditorState.create({
            doc: noteState.content,
            extensions: [basicSetup],
        });
        editorView = new EditorView({
            state,
            parent: containerEl,
        });
    }

    async function saveNote() {
        if (editorView && noteState.file) {
            const updatedContent = editorView.state.doc.toString();
            await app.vault.modify(noteState.file, updatedContent);
            noteState.content = updatedContent;
            editorView.destroy();
            editorView = null;
            noteState.isEditing = false;
            renderNoteContent();
        }
    }

    function cancelEdit() {
        if (editorView) {
            editorView.destroy();
            editorView = null;
        }
        noteState.isEditing = false;
        renderNoteContent();
    }

    async function loadParentNotes() {
        parentNotes = [];

        const allFiles = app.vault.getMarkdownFiles();
        const thisNoteLink = `[[${noteState.file.basename}]]`;

        for (const file of allFiles) {
            const cache = app.metadataCache.getFileCache(file);

            let parentOf = [];

            if (cache?.frontmatter?.parent_of) {
                parentOf = cache.frontmatter.parent_of;
                if (typeof parentOf === 'string') {
                    parentOf = [parentOf];
                }

                if (parentOf.includes(thisNoteLink)) {
                    // Get tags
                    const tags = getAllTags(cache);
                    let tag = '';
                    if (tags.has('folder')) {
                        tag = '#folder';
                    } else if (tags.has('MOC')) {
                        tag = '#MOC';
                    }

                    parentNotes.push({ file, tag });
                }
            }
        }
    }

    function onInput(event) {
        query = event.target.value;
        updateSuggestions();
    }

    function onFocus() {
        updateSuggestions();
        showSuggestions = true;
    }

    function onBlur() {
        // Delay hiding suggestions to allow click event to register
        setTimeout(() => {
            showSuggestions = false;
        }, 100);
    }

    async function updateSuggestions() {
        const allFiles = app.vault.getMarkdownFiles();

        // Filter files to only those with #MOC or #folder tags
        const filteredFiles = [];
        for (const file of allFiles) {
            const cache = app.metadataCache.getFileCache(file);
            const tags = getAllTags(cache);

            let isMOC = tags.has('#MOC') || tags.has('MOC');
            let isFolder = tags.has('#folder') || tags.has('folder');

            if ((isMOC || isFolder) && (query.length === 0 || file.basename.toLowerCase().includes(query.toLowerCase()))) {
                filteredFiles.push(file);
            }
        }

        // Get neighbor counts
        const neighborCounts = await getBestParentPaths(noteState.file);

        // Build suggestion list with counts and tags
        suggestionList = filteredFiles.map(file => {
            const neighborCountEntry = neighborCounts.get(file.path);
            const neighborCount = neighborCountEntry ? neighborCountEntry[1] : 0;

            const cache = app.metadataCache.getFileCache(file);
            const tags = getAllTags(cache);
            let tag = '';
            if (tags.has('#folder') || tags.has('folder')) {
                tag = '#folder';
            } else if (tags.has('#MOC') || tags.has('MOC')) {
                tag = '#MOC';
            }

            // Compute child count
            let childCount = 0;

            if (tag === '#MOC') {
                childCount = getMOCChildCount(file);
            }

            if (tag === '#folder') {
                const folderPath = file.parent.path;
                const folder = app.vault.getAbstractFileByPath(folderPath);
                if (folder && folder instanceof TFolder) {
                    childCount = getFolderChildCount(folder);
                }
            }

            return {
                file,
                tag,
                childCount,
                neighborCount
            };
        });

        // Remove already selected parents
        suggestionList = suggestionList.filter(suggestion => !parentNotes.some(p => p.file.path === suggestion.file.path));

        // Sort suggestions
        suggestionList.sort((a, b) => {
            if (sortOption === 'name') {
                return a.file.basename.localeCompare(b.file.basename);
            } else if (sortOption === 'lastUpdated') {
                return b.file.stat.mtime - a.file.stat.mtime;
            } else if (sortOption === 'childCount') {
                return b.childCount - a.childCount;
            } else if (sortOption === 'neighborCount') {
                return b.neighborCount - a.neighborCount;
            } else {
                return a.file.basename.localeCompare(b.file.basename);
            }
        });

        showSuggestions = true;
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

    async function selectSuggestion(suggestion) {
        const file = suggestion.file;
        const tag = suggestion.tag;
        // Add to parentNotes
        if (!parentNotes.some(p => p.file.path === file.path)) {
            parentNotes = [...parentNotes, { file, tag }]; // Reassign to trigger reactivity
            await updateParentOf(file, noteState.file);
        }

        query = '';
        showSuggestions = false;
        parentInputEl.focus();
    }

    async function updateParentOf(parentFile: TFile, childFile: TFile) {
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

    async function removeParent(parentEntry) {
        const parentFile = parentEntry.file;
        // Remove from parentNotes
        parentNotes = parentNotes.filter(p => p.file.path !== parentFile.path);

        // Update parent_of in parentFile's frontmatter
        await app.fileManager.processFrontMatter(parentFile, (frontmatter) => {
            if (frontmatter.parent_of) {
                const childFileLink = `[[${noteState.file.basename}]]`;
                if (typeof frontmatter.parent_of === 'string') {
                    if (frontmatter.parent_of === childFileLink) {
                        delete frontmatter.parent_of;
                    }
                } else if (Array.isArray(frontmatter.parent_of)) {
                    frontmatter.parent_of = frontmatter.parent_of.filter(link => link !== childFileLink);
                    if (frontmatter.parent_of.length === 0) {
                        delete frontmatter.parent_of;
                    }
                }
            }
        });
    }

    async function getBestParentPaths(note: TFile): Promise<Map<string, [TFile, number]>> {
        const mocTag = 'MOC';
        const folderTag = 'folder';

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
            const neighborFile = app.vault.getAbstractFileByPath(neighborPath) as TFile;
            if (neighborFile) {
                const neighborLinks = app.metadataCache.resolvedLinks[neighborPath] || {};
                const neighborBacklinks = app.metadataCache.getBacklinksForFile(neighborFile)?.data || {};

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

    function getMOCChildCount(mocFile: TFile): number {
        const cache = app.metadataCache.getFileCache(mocFile);
        let parentOf = [];

        if (cache?.frontmatter?.parent_of) {
            parentOf = cache.frontmatter.parent_of;
            if (typeof parentOf === 'string') {
                parentOf = [parentOf];
            }
            return parentOf.length;
        }
        return 0;
    }

    function getFolderChildCount(folder: TFolder): number {
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

    onDestroy(() => {
        if (editorView) {
            editorView.destroy();
        }
    });
</script>

<div class="note-container">
    <h3>{noteState.file.name}</h3>
    <div bind:this={containerEl} class="editor-container"></div>
    {#if noteState.isEditing}
        <div class="button-group">
            <button on:click={saveNote}>Save</button>
            <button on:click={cancelEdit}>Cancel</button>
        </div>
    {:else}
        <div class="button-group">
            <button on:click={editNote}>Edit</button>
        </div>
    {/if}

    <!-- Display parent notes with Move button -->
    <div class="parent-input-container">
        {#each parentNotes as parentEntry}
            <div class="parent-note {parentEntry.tag === '#folder' ? 'folder' : ''}">
                <button on:click={() => moveNoteToParentFolder(parentEntry)} style="font-size: 0.5em; padding: 1px 2px">
                    M
                </button>
                {parentEntry.file.basename}
                <span class="remove-parent" on:click={() => removeParent(parentEntry)}>×</span>
            </div>
        {/each}
        <!-- Input for adding new parents -->
        <input type="text" bind:this={parentInputEl} bind:value={query} on:input={onInput} on:focus={onFocus} on:blur={onBlur} placeholder="Add parent..." />
        <!-- Sorting options -->
        <div class="sort-options">
            <label>
                Sort by:
                <select bind:value={sortOption} on:change={updateSuggestions}>
                    <option value="name">Name</option>
                    <option value="lastUpdated">Last Updated</option>
                    <option value="childCount">Child Count</option>
                    <option value="neighborCount">Neighbor Count</option>
                </select>
            </label>
        </div>
        {#if showSuggestions}
            <div class="suggestions">
                {#each suggestionList as suggestion}
                    <div class="suggestion-item {suggestion.tag === '#folder' ? 'folder' : ''}" on:click={() => selectSuggestion(suggestion)}>
                        <span>
                            {suggestion.file.basename} ({suggestion.childCount})
                            {#if suggestion.neighborCount > 0}
                                {` Neighbor Count: ${suggestion.neighborCount}`}
                            {/if}
                            {#if suggestion.tag}
                                {` ${suggestion.tag}`}
                            {/if}
                        </span>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
    {#if moveError}
        <div class="error">{moveError}</div>
    {/if}
</div>
    <style>
        .suggestion-item.folder {
        background-color: #e6f2ff; /* Slightly blueish background for folders */
        }
        .move-note-container {
        margin-top: 10px;
        }
        .move-note-container input {
            margin-right: 5px;
            padding: 5px;
            width: 300px;
        }
        .error {
            color: red;
        }
        .note-container {
            border: 1px solid #ccc;
            padding: 10px;
            margin-bottom: 20px;
        }
    
        .editor-container {
            width: 100%;
            min-height: 100px;
            max-height: 500px;
            overflow: auto;
        }
    
        .button-group {
            margin-top: 10px;
        }
    
        .parent-notes {
            display: flex;
            flex-wrap: wrap;
            margin-top: 10px;
        }
    
        .parent-note {
            background-color: #e0e0e0;
            color: #333;
            padding: 5px 10px;
            margin-right: 5px;
            margin-bottom: 5px;
            border-radius: 5px;
            display: flex;
            align-items: center;
        }
    
        .parent-note.folder {
            background-color: #e6f2ff; /* Slightly blueish background for folders */
        }
    
        .parent-note .remove-parent {
            margin-left: 8px;
            cursor: pointer;
            font-weight: bold;
        }
    
        .suggestions {
            position: absolute;
            background-color: white;
            border: 1px solid #ccc;
            max-height: 150px;
            overflow-y: auto;
            z-index: 1000;
            width: calc(100% - 20px);
            top: 100%;
            left: 0;
        }
    
        .suggestion-item {
            padding: 5px 10px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            color: #333;
        }
    
        .suggestion-item:hover {
            background-color: #f0f0f0;
        }
    
        .suggestion-item.folder {
            background-color: #e6f2ff; /* Slightly blueish background for folders */
        }
    
        .parent-input-container {
            position: relative;
            margin-top: 10px;
            display: flex;
            align-items: center;
            flex-wrap: wrap;
        }
    
        .parent-input-container input {
            flex: 1;
            min-width: 150px;
            margin-top: 5px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
    </style>