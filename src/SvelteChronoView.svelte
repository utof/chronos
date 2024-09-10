<!-- SvelteChronoView.svelte -->
 
<script lang="ts">
    import { fileStore } from "./stores";
    export let variable: number;
</script>

<style>
    .number {
        color: red;
    }
</style>

<div class="number">
    <span>My number is {variable}!</span>
</div>

<button on:click={() => variable += 1}>Increment</button>

{#each $fileStore as file }
    <li>
        {file.name}
    </li>
{/each}
  
