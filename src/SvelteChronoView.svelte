<script lang="ts">
    import { fileStore } from "./stores";
    import { onMount, tick } from "svelte";
    import { Component, MarkdownRenderer } from "obsidian";

    export let app;
    let markdownFiles = [];
    let contentEls: HTMLElement[] = []; // Store the content elements for each markdown file
    let component: Component;

    onMount(() => {
        component = new Component();
        markdownFiles = $fileStore;
        renderMarkdownForEachFile();
    });

    // Function to render markdown for each file individually
    async function renderMarkdownForEachFile() {
        await tick(); // Wait for DOM updates to finish
        if (markdownFiles.length > 0 && contentEls.length > 0) {
            for (let i = 0; i < markdownFiles.length; i++) {
                const file = markdownFiles[i];
                const contentEl = contentEls[i]; // Get the bound content element
                if (contentEl) {
                    const markdownContent = await app.vault.cachedRead(file); // Read the file content
                    await MarkdownRenderer.render(app, markdownContent, contentEl, file.path, component); // Render the markdown
                }
            }
        }
    }
</script>

<style>
    .card {
        border: 1px solid #ccc;
        border-radius: 8px;
        margin: 10px 0;
        padding: 10px;
        width: 80%;
        background-color: #fff;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        margin-left: auto;
        margin-right: auto;
    }

    .card-content {
        /* white-space: pre-wrap; */
    }
</style>

{#each markdownFiles as file, i}
    <div class="card">
        <h3>{file.name}</h3>
        <div class="card-content" bind:this={contentEls[i]}></div> <!-- Bind each card content to the array -->
    </div>
{/each}
