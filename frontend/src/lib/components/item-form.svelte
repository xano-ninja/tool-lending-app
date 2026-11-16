<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import ItemPhoto from "$lib/components/item-photo.svelte";
  import type { Item, ItemInput, PhotoChange } from "$lib/api";
  import { errorMessage } from "$lib/format";

  const STATUSES = ["available", "on_loan", "in_repair", "retired"] as const;
  const MAX_PHOTO_MB = 5;

  let {
    item,
    onsubmit,
    submitLabel,
  }: {
    item?: Item;
    onsubmit: (input: ItemInput, photo: PhotoChange) => Promise<void>;
    submitLabel: string;
  } = $props();

  // svelte-ignore state_referenced_locally
  let name = $state(item?.name ?? "");
  // svelte-ignore state_referenced_locally
  let category = $state(item?.category ?? "");
  // svelte-ignore state_referenced_locally
  let description = $state(item?.description ?? "");
  // svelte-ignore state_referenced_locally
  let status = $state<(typeof STATUSES)[number]>(item?.status ?? "available");
  let error = $state("");
  let busy = $state(false);

  let fileInput = $state<HTMLInputElement | null>(null);
  let file = $state<File | null>(null);
  let removed = $state(false);
  let preview = $state<string | null>(null);
  let photoError = $state("");

  $effect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    preview = url;
    return () => {
      URL.revokeObjectURL(url);
      preview = null;
    };
  });

  function pick() {
    const picked = fileInput?.files?.[0] ?? null;
    photoError = "";
    if (picked && !picked.type.startsWith("image/")) {
      photoError = "Pick an image file.";
      resetFile();
      return;
    }
    if (picked && picked.size > MAX_PHOTO_MB * 1024 * 1024) {
      photoError = `Photos must be under ${MAX_PHOTO_MB} MB.`;
      resetFile();
      return;
    }
    file = picked;
    if (picked) removed = false;
  }

  function resetFile() {
    file = null;
    if (fileInput) fileInput.value = "";
  }

  const photoChange = $derived<PhotoChange>(file ?? (removed ? "remove" : "keep"));

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    error = "";
    try {
      await onsubmit({ name, category, description, status }, photoChange);
    } catch (e) {
      error = errorMessage(e, "Could not save the item.");
    } finally {
      busy = false;
    }
  }
</script>

<form class="space-y-4" onsubmit={submit}>
  <div class="space-y-2">
    <Label for="name">Name</Label>
    <Input id="name" bind:value={name} required />
  </div>
  <div class="space-y-2">
    <Label for="category">Category</Label>
    <Input id="category" bind:value={category} required />
  </div>
  <div class="space-y-2">
    <Label for="description">Description</Label>
    <Textarea id="description" bind:value={description} />
  </div>
  <div class="space-y-2">
    <Label for="photo">Photo</Label>
    {#if preview}
      <img src={preview} alt="New photo of {name || 'the item'}" class="bg-muted aspect-[4/3] w-48 rounded-lg border object-cover" />
    {:else if item?.photo && !removed}
      <ItemPhoto photo={item.photo} alt={item.name} class="aspect-[4/3] w-48 rounded-lg border" />
    {/if}
    <Input id="photo" type="file" accept="image/*" bind:ref={fileInput} onchange={pick} />
    <div class="flex flex-wrap items-center gap-2 text-sm">
      {#if file}
        <Button type="button" variant="ghost" size="sm" onclick={resetFile}>Clear selection</Button>
      {:else if item?.photo && !removed}
        <Button type="button" variant="ghost" size="sm" onclick={() => (removed = true)}>Remove photo</Button>
      {:else if removed}
        <span class="text-muted-foreground">The photo will be removed when you save.</span>
        <Button type="button" variant="ghost" size="sm" onclick={() => (removed = false)}>Keep it</Button>
      {/if}
    </div>
    {#if photoError}
      <p class="text-destructive text-sm">{photoError}</p>
    {/if}
  </div>
  <div class="space-y-2">
    <Label for="status">Status</Label>
    <select
      id="status"
      bind:value={status}
      class="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
    >
      {#each STATUSES as s (s)}
        <option value={s}>{s.replace("_", " ")}</option>
      {/each}
    </select>
  </div>
  {#if error}
    <p class="text-destructive text-sm">{error}</p>
  {/if}
  <Button type="submit" disabled={busy}>{submitLabel}</Button>
</form>
