<script lang="ts">
    import { fileStore } from "./stores";
    import { onMount } from "svelte";
    
    let markdownFiles = [];

    onMount(() => {
        $: markdownFiles = $fileStore;
    });

    function renderMarkdown(content: string) {
        const el = document.createElement("div");
        el.innerHTML = content;
        this.app.plugins.getPlugin("markdown").renderer(el, content, {});
        return el.innerHTML;
    }
</script>

<style>
    .card {
        border: 1px solid #ccc;
        border-radius: 8px;
        margin: 10px 0;
        padding: 10px;
        width: 60%;
        background-color: #fff;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        margin-left: auto;
        margin-right: auto;
    }

    .card-content {
        /* white-space: pre-wrap; */
    }
</style>

{#each markdownFiles as file }
    <div class="card">
        <h3>{file.name}</h3>
        <div class="card-content">
            <!-- {@html renderMarkdown(file.content)} -->
        </div>
    </div>
{/each}