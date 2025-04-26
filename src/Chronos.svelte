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
      // Find the dedicated content area within the placeholder
      const contentArea = targetEl.querySelector('.note-placeholder-content') as HTMLElement;
  
      // Avoid re-rendering if already done or if content area is missing
      if (!contentArea || targetEl.dataset.rendered === 'true') return;
  
      targetEl.dataset.rendered = 'true'; // Mark as rendering/rendered
      contentArea.innerHTML = 'Loading full note...'; // Indicate loading
  
      try {
        const content = await app.vault.cachedRead(file);
        contentArea.empty(); // Clear the loading message
  
        // Render directly into the content area
        await MarkdownRenderer.render(
          app,
          content,
          contentArea, // Target the existing content area
          file.path, // Source path for link resolution
          viewComponent // Component context for lifecycle management
        );
        // Optional: Adjust height based on rendered content if needed
        // targetEl.style.minHeight = 'auto'; // Can cause layout shifts
      } catch (error) {
        console.error("Error rendering file:", file.path, error);
        if (contentArea) {
            contentArea.setText(`Error rendering file: ${file.path}`);
        }
        targetEl.dataset.rendered = 'error'; // Mark as error
      }
    }
  
     // Optional: Function to un-render a file when it scrolls far out of view
     function unrenderFile(targetEl: HTMLElement) {
      // Find the dedicated content area
      const contentArea = targetEl.querySelector('.note-placeholder-content') as HTMLElement;
  
      // Only unrender if it was successfully rendered and content area exists
      if (!contentArea || targetEl.dataset.rendered !== 'true') return;
  
      contentArea.empty(); // Clear the rendered content
  
      targetEl.style.minHeight = `${estimatedItemHeight}px`; // Reset height
      targetEl.dataset.rendered = 'false'; // Mark as not rendered
     }
  
  
    onMount(() => {
      // Get and sort files by modification time (newest first)
      files = app.vault.getMarkdownFiles().sort((a, b) => b.stat.mtime - a.stat.mtime);
  
      // Ensure containerEl is available before setting up observer
      if (!containerEl) {
          console.error("Scroll container not found on mount.");
          return;
      }
  
      const options = {
        root: containerEl, // Use the scroll container as the viewport
        rootMargin: '400px 0px', // Load items 400px above/below the viewport edge
        threshold: 0 // Trigger as soon as any part of the placeholder is visible
      };
  
      observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          const targetEl = entry.target as HTMLElement;
          const fileIndex = parseInt(targetEl.dataset.index || '-1', 10);
  
          if (fileIndex === -1 || fileIndex >= files.length) return; // Skip if index is invalid or out of bounds
  
          if (entry.isIntersecting) {
            // Element is entering or intersecting the viewport
            renderFile(files[fileIndex], targetEl);
          } else {
            // Element is leaving the viewport
            // Optional: Unload content if it's far out of view to save memory
             unrenderFile(targetEl);
          }
        });
      }, options);
  
      // Use requestAnimationFrame to ensure DOM is ready after #each block
      requestAnimationFrame(() => {
          if (containerEl) {
              const placeholders = containerEl.querySelectorAll('.note-placeholder');
              placeholders.forEach(el => observer.observe(el));
          }
      });
  
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
        <!-- Area for loading text, error messages, or the actual rendered content -->
        <div class="note-placeholder-content"></div>
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
       /* Remove default italic/faint style if content will go here */
       /* font-style: italic; */
       /* color: var(--text-faint); */
       margin-top: 10px; /* Add some space between header and content */
     }
  
    /* Ensure Obsidian's markdown styles apply correctly */
    /* :global() targets dynamically added elements inside .note-placeholder-content */
    .note-placeholder-content :global(.markdown-rendered) {
       /* Reset margin if the container already provides it */
       margin-top: 0;
    }
    .note-placeholder-content :global(h1),
    .note-placeholder-content :global(h2),
    .note-placeholder-content :global(h3),
    .note-placeholder-content :global(h4),
    .note-placeholder-content :global(h5),
    .note-placeholder-content :global(h6) {
        /* Example: Adjust heading margins if needed */
        margin-top: 0.8em;
        margin-bottom: 0.4em;
    }
  
    /* Basic responsive images/videos within rendered markdown */
    .note-placeholder-content :global(img),
    .note-placeholder-content :global(video) {
        max-width: 100%;
        height: auto;
        display: block; /* Prevent extra space below images */
        margin-top: 5px;
        margin-bottom: 5px;
        border-radius: 3px; /* Optional: slightly rounded corners for media */
    }
  </style>