<script lang="ts">
  import Wrench from "@lucide/svelte/icons/wrench";
  import type { XanoFileRef } from "@xano/sdk";

  import { photoUrl } from "$lib/api";
  import { cn } from "$lib/utils.js";

  let {
    photo,
    alt,
    class: className,
  }: { photo: XanoFileRef | null | undefined; alt: string; class?: string } = $props();

  const src = $derived(photoUrl(photo));
  let broken = $state(false);

  $effect(() => {
    void src;
    broken = false;
  });
</script>

{#if src && !broken}
  <img {src} {alt} loading="lazy" class={cn("bg-muted object-cover", className)} onerror={() => (broken = true)} />
{:else}
  <div class={cn("bg-muted text-muted-foreground flex items-center justify-center", className)} aria-hidden="true">
    <Wrench class="size-8" />
  </div>
{/if}
