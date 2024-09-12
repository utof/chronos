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

    // Hide the inline-title element once it's rendered
    const observer = new MutationObserver(() => {
        const inlineTitle = editorContainer.querySelector('.inline-title');
        if (inlineTitle) {
            (inlineTitle as HTMLElement).style.display = 'none'; // Hide the inline title
        }
    });

    // Observe for any changes in the editorContainer's children
    observer.observe(editorContainer, { childList: true, subtree: true });
});

    onDestroy(() => {
        if (activeView) {
            activeView.clear(); // Clear the view on destroy
        }
    });

    // Function to open the editor using MarkdownView
    async function openEditor(file: TFile) {
    if (file) {
        app.workspace.detachLeavesOfType("markdown");
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
            type: "markdown",
            state: { file: file.path },
        });

        const view = leaf.view as MarkdownView;
        if (view) {
            // Apply height and layout styles to the editor container
            editorContainer.style.height = "100%";
            editorContainer.style.display = "flex";
            editorContainer.style.flexDirection = "column";

            // Append the actual Obsidian content to the container
            editorContainer.appendChild(view.contentEl);
            
            // Add more styling to the contentEl to ensure full height
            view.contentEl.style.flexGrow = "1";
            view.contentEl.style.height = "100%";
            view.contentEl.style.overflow = "auto";
            // overflow x hidden
            view.contentEl.style.overflowX = "hidden";

            const content = await app.vault.cachedRead(file);
            view.editor.setValue(content); // Load the content into the active editor
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
    height: 100%; /* Fill the parent */
    min-height: 300px;
    max-height: 500px; /* You can adjust this if needed */
    display: flex;
    flex-direction: column;
    overflow: hidden; /* Prevent extra scrollbars */
    box-sizing: border-box;
}

</style>

<div>
    <h3>Edit: {currentFile?.name}</h3>
    <div bind:this={editorContainer} class="editor-container"></div>
    <button on:click={saveFile}>Save</button>
    <button on:click={getSelectedText}>Get Selected Text</button>
    <button on:click={scrollToTop}>Scroll to Top</button>
</div>
