<!-- NoteItem.svelte -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { TFile, MarkdownRenderer } from "obsidian";
    import { EditorView, basicSetup } from '@codemirror/basic-setup';
    import { EditorState } from '@codemirror/state';
    import { ParentSelectorModal } from './ParentSelectorModal';

    export let app;
    export let noteState: {
        file: TFile;
        content: string;
        isEditing: boolean;
        container: HTMLElement;
    };

    let containerEl: HTMLElement;
    let editorView: EditorView | null = null;

    $: if (!noteState.isEditing && containerEl) {
        renderNoteContent();
    }

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

    async function addParents() {
        // Get the relevant parents
        const bestParentPaths = await getBestParentPaths(noteState.file);

        const modal = new ParentSelectorModal(
            app,
            async (selectedFiles: TFile[]) => {
                // For each selected parent file, update its frontmatter
                for (let parentFile of selectedFiles) {
                    await updateFrontmatter(parentFile, noteState.file);
                }
                new app.Notice(
                    `'parent_of' relationship created in selected parent notes for ${noteState.file.name}`
                );
            },
            bestParentPaths // Pass the relevant parents to the modal
        );
        modal.open();
    }

    async function updateFrontmatter(file: TFile, childFile: TFile) {
        await app.fileManager.processFrontMatter(file, (frontmatter) => {
            // Initialize 'parent_of' if it doesn't exist
            if (!frontmatter.parent_of) {
                frontmatter.parent_of = [];
            }

            // Add the child file to 'parent_of'
            const childFileLink = `[[${childFile.basename}]]`;
            if (!frontmatter.parent_of.includes(childFileLink)) {
                frontmatter.parent_of.push(childFileLink);
            }
        });
    }

    async function getBestParentPaths(file: TFile): Promise<[TFile, number][]> {
        const mocTag = "#MOC"; // Customize the tag for MOCs
        const folderTag = "#folder"; // Customize the tag for folders

        // Get backlinks and outgoing links for the file
        const backlinks = app.metadataCache.getBacklinksForFile(file)?.data || {};
        const outgoingLinks = app.metadataCache.resolvedLinks[file.path] || {};

        // Create a set to store unique linked files
        const linkedFiles = new Set<TFile>();
        for (let linkPath in backlinks) {
            const linkedFile = app.metadataCache.getFirstLinkpathDest(
                linkPath,
                file.path
            );
            if (linkedFile) {
                linkedFiles.add(linkedFile);
            }
        }
        for (let linkPath in outgoingLinks) {
            const linkedFile = app.metadataCache.getFirstLinkpathDest(
                linkPath,
                file.path
            );
            if (linkedFile) {
                linkedFiles.add(linkedFile);
            }
        }

        // Create a map to count occurrences of parent MOCs/folders
        const parentCounts: Map<TFile, number> = new Map();

        // To avoid repetition when checking neighbors
        const processedFiles = new Set<TFile>();

        // Iterate over linked files and their neighbors
        for (const linkedFile of linkedFiles) {
            if (processedFiles.has(linkedFile)) continue;
            processedFiles.add(linkedFile);

            const isParent = await isMOCorFolder(linkedFile, mocTag, folderTag);
            if (isParent) {
                parentCounts.set(
                    linkedFile,
                    (parentCounts.get(linkedFile) || 0) + 1
                );
            }

            // Get neighbors of the linked file
            const neighborBacklinks = app.metadataCache.getBacklinksForFile(linkedFile)?.data || {};
            const neighborOutgoingLinks = app.metadataCache.resolvedLinks[linkedFile.path] || {};

            for (let neighborLinkPath in neighborBacklinks) {
                const neighborFile = app.metadataCache.getFirstLinkpathDest(
                    neighborLinkPath,
                    linkedFile.path
                );
                if (neighborFile && !processedFiles.has(neighborFile)) {
                    processedFiles.add(neighborFile);

                    const isNeighborParent = await isMOCorFolder(neighborFile, mocTag, folderTag);
                    if (isNeighborParent) {
                        parentCounts.set(
                            neighborFile,
                            (parentCounts.get(neighborFile) || 0) + 1
                        );
                    }
                }
            }
            for (let neighborLinkPath in neighborOutgoingLinks) {
                const neighborFile = app.metadataCache.getFirstLinkpathDest(
                    neighborLinkPath,
                    linkedFile.path
                );
                if (neighborFile && !processedFiles.has(neighborFile)) {
                    processedFiles.add(neighborFile);

                    const isNeighborParent = await isMOCorFolder(neighborFile, mocTag, folderTag);
                    if (isNeighborParent) {
                        parentCounts.set(
                            neighborFile,
                            (parentCounts.get(neighborFile) || 0) + 1
                        );
                    }
                }
            }
        }

        // Sort parent files based on count
        const sortedParentFiles = Array.from(parentCounts.entries()).sort(
            (a, b) => b[1] - a[1]
        );

        return sortedParentFiles;
    }

    async function isMOCorFolder(file: TFile, mocTag: string, folderTag: string): Promise<boolean> {
        const cache = app.metadataCache.getFileCache(file);

        // Collect all tags from inline and frontmatter
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

        // Check if the file has either the mocTag or folderTag
        return tags.has(mocTag) || tags.has(folderTag);
    }

    onDestroy(() => {
        if (editorView) {
            editorView.destroy();
        }
    });
</script>

<style>
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
</style>

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
            <button on:click={addParents}>Add Parents</button>
        </div>
    {/if}
</div>
