<!-- Chronos.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { App, MarkdownRenderer, TFile, ItemView } from 'obsidian';

  export let viewComponent: ItemView;
  let app: App = viewComponent.app;
  let files: TFile[] = [];
  let containerEl: HTMLDivElement; // Main scroll container
  let observer: IntersectionObserver;

  // Estimate height for placeholders. Adjust if notes are typically much larger/smaller.
  const estimatedItemHeight = 300; // pixels

  // Function to render a specific file into its placeholder element
  async function renderFile(file: TFile, targetEl: HTMLElement) {
    // Avoid re-rendering if already done or if target is missing
    if (!targetEl || targetEl.dataset.rendered === 'true') return;

    targetEl.dataset.rendered = 'true'; // Mark as rendering/rendered
    // Keep placeholder title/meta visible while loading
    const placeholderContent = targetEl.querySelector('.note-placeholder-content');
    if (placeholderContent) {
        placeholderContent.innerHTML = 'Loading full note...'; // Indicate loading
    }


    try {
      const content = await app.vault.cachedRead(file);
      // Clear only the loading indicator/placeholder content area
      if (placeholderContent) placeholderContent.empty();

      // Create a div specifically for the markdown content
      const renderDiv = targetEl.createDiv();

      await MarkdownRenderer.render(
        app,
        content,
        renderDiv, // Render into the new div
        file.path, // Source path for link resolution
        viewComponent // Component context for lifecycle management
      );
      // Adjust height based on rendered content if needed, though might cause layout shifts
      // targetEl.style.minHeight = 'auto';
    } catch (error) {
      console.error("Error rendering file:", file.path, error);
      if (placeholderContent) {
          placeholderContent.setText(`Error rendering file: ${file.path}`);
      }
      targetEl.dataset.rendered = 'error'; // Mark as error
    }
  }

   // Optional: Function to un-render a file when it scrolls far out of view
   function unrenderFile(targetEl: HTMLElement) {
    if (!targetEl || targetEl.dataset.rendered !== 'true') return;

    // Find the div holding the rendered markdown (excluding placeholder title/meta)
    const renderedContent = targetEl.querySelector('.markdown-rendered')?.parentElement;
    if (renderedContent) {
        renderedContent.empty(); // Clear only rendered content
        renderedContent.remove(); // Remove the container div
    }

    // Reset placeholder content if needed (or leave title/meta)
    const placeholderContent = targetEl.querySelector('.note-placeholder-content');
     if (placeholderContent) {
        placeholderContent.innerHTML = ''; // Clear loading/error text
     }


    targetEl.style.minHeight = `${estimatedItemHeight}px`; // Reset height
    targetEl.dataset.rendered = 'false'; // Mark as not rendered
   }


  onMount(() => {
    // Get and sort files by modification time (newest first)
    files = app.vault.getMarkdownFiles().sort((a, b) => b.stat.mtime - a.stat.mtime);

    const options = {
      root: containerEl, // Use the scroll container as the viewport
      rootMargin: '400px 0px', // Load items 400px above/below the viewport edge
      threshold: 0 // Trigger as soon as any part of the placeholder is visible
    };

    observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        const targetEl = entry.target as HTMLElement;
        const fileIndex = parseInt(targetEl.dataset.index || '-1', 10);

        if (fileIndex === -1) return; // Skip if index is invalid

        if (entry.isIntersecting) {
          // Element is entering or intersecting the viewport
          renderFile(files[fileIndex], targetEl);
        } else {
          // Element is leaving the viewport
          // Optional: Unload content if it's far out of view to save memory
          // Consider adding a check here to only unrender if it's *really* far,
          // e.g., using entry.boundingClientRect.top > containerEl.clientHeight + 500
           unrenderFile(targetEl); // Let's try unloading for better memory usage
        }
      });
    }, options);

    // After the #each block renders, query and observe the placeholders
    const placeholders = containerEl.querySelectorAll('.note-placeholder');
    placeholders.forEach(el => observer.observe(el));

  });

  onDestroy(() => {
    // Clean up the observer when the component is destroyed
    if (observer) {
      observer.disconnect();
    }
  });

</script>

<!-- Main scrollable container -->
<div class="chronos-scroll-container" bind:this={containerEl}>
  {#each files as file, i (file.path)}
    <!-- Placeholder for each note -->
    <div
      class="note-placeholder"
      data-index={i}
      data-path={file.path}
      data-rendered="false"
      style="min-height: {estimatedItemHeight}px;"
    >
      <!-- Basic info visible before full render -->
      <div class="note-placeholder-header">
        <div class="note-placeholder-title">{file.basename}</div>
        <div class="note-placeholder-meta">{new Date(file.stat.mtime).toLocaleString()}</div>
      </div>
      <!-- Area for loading text or error messages -->
      <div class="note-placeholder-content"></div>
      <!-- Actual Markdown content will be rendered inside this div by renderFile -->
    </div>
  {/each}
  {#if files.length === 0}
    <div>No markdown files found in the vault.</div>
  {/if}
</div>

<style>
  .chronos-scroll-container {
    height: 100%; /* Fill the view */
    width: 100%;
    overflow-y: auto; /* Enable vertical scrolling */
    padding: 15px; /* Padding around the entire list */
    box-sizing: border-box;
  }

  .note-placeholder {
    border: 1px solid var(--background-modifier-border);
    border-radius: 5px;
    margin-bottom: 15px; /* Space between notes */
    padding: 10px 15px; /* Padding inside each note card */
    overflow: hidden; /* Contain rendered content */
    background-color: var(--background-secondary); /* Subtle background */
    transition: min-height 0.2s ease-out; /* Smooth height transition if content loads */
  }

  .note-placeholder-header {
    margin-bottom: 10px;
  }

  .note-placeholder-title {
    font-weight: bold;
    font-size: 1.1em;
    color: var(--text-normal);
  }

  .note-placeholder-meta {
    font-size: 0.85em;
    color: var(--text-muted);
  }

   .note-placeholder-content {
     font-style: italic;
     color: var(--text-faint);
   }

  /* Ensure Obsidian's markdown styles apply correctly */
  /* :global() targets dynamically added elements */
  .note-placeholder :global(.markdown-rendered) {
     /* Add padding/margin if needed, e.g., margin-top: 10px; */
     margin-top: 10px;
  }

  /* Basic responsive images/videos within rendered markdown */
  .note-placeholder :global(img),
  .note-placeholder :global(video) {
      max-width: 100%;
      height: auto;
      display: block; /* Prevent extra space below images */
      margin-top: 5px;
      margin-bottom: 5px;
  }
</style>
