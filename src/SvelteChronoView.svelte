<script lang="ts">
    export let variable: number;
</script>
  
<div class="number">
    <span>My number is {variable}!</span>
</div>

<button on:click={() => variable += 1}>Increment</button>
  
<style>
.number {
    color: red;
}
</style>