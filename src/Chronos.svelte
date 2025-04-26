<!-- Chronos.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { App, MarkdownRenderer, TFile, ItemView } from 'obsidian';

    export let viewComponent: ItemView;
    let files: TFile[] = viewComponent.app.vault.getMarkdownFiles();
    let app: App = viewComponent.app;

    // A reference to the div where we'll render the markdown
    let renderTarget: HTMLDivElement;

    // render after adding to dom
    onMount(async () => {
      // Ensure we have the necessary elements/data and at least one file
      if (files.length > 0 && renderTarget && app && viewComponent) {
        const fileToRender = files[3];
  
        try {
          const content = await app.vault.cachedRead(fileToRender);
          const sourcePath = fileToRender.path; // Needed for link resolution

          // Clear the target div before rendering new content
          renderTarget.empty();

          // Pass viewComponent as the last argument for lifecycle management
          // This ensures links, embeds, etc., work correctly and are cleaned up
          await MarkdownRenderer.render(
            app,
            content,
            renderTarget,
            sourcePath,
            viewComponent // IMPORTANT: Links rendering context and lifecycle
          );
  
        } catch (error) {
          console.error("Error rendering file:", fileToRender.path, error);
          renderTarget.setText(`Error rendering file: ${fileToRender.path}`);
        }
      } else if (renderTarget) {
          renderTarget.setText("No markdown files found in the vault.");
      }
    });
  
  </script>
  
  <!-- This div will contain the rendered markdown content -->
  <div bind:this={renderTarget} class="chronos-markdown-render">
    Loading content...
  </div>
  
  <style>
    .chronos-markdown-render {
      /* Make the container take up space */
      height: 100%;
      width: 100%;
      overflow-y: auto; /* Allow scrolling if content is long */
    }
  
    /* Ensure Obsidian's default markdown styles apply within our container */
    /* :global() is needed because MarkdownRenderer adds elements dynamically */
   .chronos-markdown-render :global(.markdown-rendered) {
      /* You might not need specific rules here if the renderer adds its own container */
   }
  </style>