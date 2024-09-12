<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { TFile, MarkdownView } from "obsidian";
    import { fileStore } from "./stores"; // Store for managing files

    export let app; // Obsidian app instance
    let markdownFiles: TFile[] = [];
    let currentFile: TFile;
    let activeView: MarkdownView;
    let editorContainer: HTMLElement;

    onMount(() => {
        markdownFiles = $fileStore;
        if (markdownFiles.length > 0) {
            currentFile = markdownFiles[0]; // Load the first file
            openEditor(currentFile); // Open editor for the file
        }
    });

    onDestroy(() => {
        if (activeView) {
            activeView.clear(); // Clear the view on destroy
        }
    });

    // Function to open the editor using MarkdownView
    function openEditor(file: TFile) {
        if (file) {
            // Create a new markdown view inside the editorContainer
            activeView = app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                app.workspace.detachLeavesOfType("markdown");
                const leaf = app.workspace.getLeaf(false);
                leaf.setViewState({
                    type: "markdown",
                    state: { file: file.path },
                }).then(() => {
                    const view = leaf.view as MarkdownView;
                    // Bind the view's container to the editorContainer
                    editorContainer.appendChild(view.contentEl);
                    app.vault.cachedRead(file).then(content => {
                        view.editor.setValue(content); // Load the content into the active editor
                    });
                });
            }
        }
    }

    // Function to save content
    async function saveFile() {
        if (activeView && currentFile) {
            const updatedContent = activeView.editor.getValue(); // Get the edited content
            await app.vault.modify(currentFile, updatedContent); // Save content back to the vault
        }
    }

    // Example of getting selected text
    function getSelectedText() {
        if (activeView) {
            const selectedText = activeView.editor.getSelection(); // Get selected text
            console.log('Selected text:', selectedText);
        }
    }

    // Example of managing scroll
    function scrollToTop() {
        if (activeView) {
            activeView.editor.scrollTo(0, 0); // Scroll to top
        }
    }
</script>

<style>
    .editor-container {
        border: 1px solid #ccc;
        padding: 10px;
        width: 100%;
        min-height: 300px;
        /* background-color: #fff; */
        margin: 10px 0;
    }
</style>

<div>
    <h3>Edit: {currentFile?.name}</h3>
    <div bind:this={editorContainer} class="editor-container"></div>
    <button on:click={saveFile}>Save</button>
    <button on:click={getSelectedText}>Get Selected Text</button>
    <button on:click={scrollToTop}>Scroll to Top</button>
</div>
