<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { TFile, MarkdownView } from "obsidian";
    import { fileStore } from "./stores";

    export let app; // Obsidian app instance
    let markdownFiles: TFile[] = [];
    let currentFile: TFile;
    let activeView: MarkdownView;
    let editorContainer: HTMLElement;

    // Open a markdown file and render it in the editor
    async function openEditor(file: TFile) {
        if (!file) return;
        
        app.workspace.detachLeavesOfType("markdown");
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({
            type: "markdown",
            state: { file: file.path },
        });

        const view = leaf.view as MarkdownView;
        if (view) {
            setupEditorView(view, file);
        }
    }

    // Setup the editor view and apply styling
    function setupEditorView(view: MarkdownView, file: TFile) {
        editorContainer.style.cssText = `
            height: 100%;
            display: flex;
            flex-direction: column;
        `;

        view.contentEl.style.cssText = `
            flex-grow: 1;
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
        `;

        editorContainer.appendChild(view.contentEl);
        loadFileContent(view, file);
        hideInlineTitleOnRender();
        activeView = view;
    }

    // Load file content into the editor
    async function loadFileContent(view: MarkdownView, file: TFile) {
        const content = await app.vault.cachedRead(file);
        view.editor.setValue(content);
    }

    // Hide inline-title once it's rendered
    function hideInlineTitleOnRender() {
    const observer = new MutationObserver(() => {
        const inlineTitle = editorContainer.querySelector('.inline-title');
        if (inlineTitle && inlineTitle instanceof HTMLElement) {
            inlineTitle.style.display = 'none'; // Cast Element to HTMLElement
        }
    });

    observer.observe(editorContainer, { childList: true, subtree: true });
}

    // Save the current file's content
    async function saveFile() {
        if (activeView && currentFile) {
            const updatedContent = activeView.editor.getValue();
            await app.vault.modify(currentFile, updatedContent);
        }
    }

    // Get selected text from the editor
    function getSelectedText() {
        if (activeView) {
            const selectedText = activeView.editor.getSelection();
            console.log('Selected text:', selectedText);
        }
    }

    // Scroll editor to the top
    function scrollToTop() {
        activeView?.editor.scrollTo(0, 0);
    }

    onMount(() => {
        markdownFiles = $fileStore;
        if (markdownFiles.length > 0) {
            currentFile = markdownFiles[0];
            openEditor(currentFile);
        }
    });

    onDestroy(() => {
        activeView?.clear();
    });
</script>

<style>
    .editor-container {
        border: 1px solid #ccc;
        padding: 10px;
        width: 100%;
        height: 100%;
        min-height: 300px;
        max-height: 500px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
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
