<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { TFile } from "obsidian";
    import { fileStore } from "./stores";
    import NoteItem from "./NoteItem.svelte";

    export let app; // Obsidian app instance

    let noteStates = [];

    let unsubscribe;

    onMount(() => {
        // Subscribe to fileStore changes
        unsubscribe = fileStore.subscribe((files) => {
            loadNotes(files);
        });
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
</script>

{#if noteStates.length === 0}
    <p>Loading notes...</p>
{:else}
    {#each noteStates as noteState (noteState.file.path)}
        <NoteItem {noteState} {app} />
    {/each}
{/if}
