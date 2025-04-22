<script lang="ts">
	import type { TFile } from "obsidian";


    interface Props {
      startCount: number;
      files: TFile[]
    }
  
    let {
      startCount, files
    }: Props = $props();
  
    let count = $state(startCount);
    let file = files[0]
  
    export function increment() {
      count += 1;
    }
  </script>
  
  <div class="number">
    <span>My number is {count}!</span>
    <div> {file.basename} </div>
    
  </div>
  
  <style>
    .number {
      color: peachpuff;
    }
  </style>