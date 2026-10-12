<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import type { Item, ItemInput } from "$lib/api";
  import { errorMessage } from "$lib/format";

  const STATUSES = ["available", "on_loan", "in_repair", "retired"] as const;

  let {
    item,
    onsubmit,
    submitLabel,
  }: {
    item?: Item;
    onsubmit: (input: ItemInput) => Promise<void>;
    submitLabel: string;
  } = $props();

  // svelte-ignore state_referenced_locally
  let name = $state(item?.name ?? "");
  // svelte-ignore state_referenced_locally
  let category = $state(item?.category ?? "");
  // svelte-ignore state_referenced_locally
  let description = $state(item?.description ?? "");
  // svelte-ignore state_referenced_locally
  let photo = $state(item?.photo ?? "");
  // svelte-ignore state_referenced_locally
  let status = $state<(typeof STATUSES)[number]>(item?.status ?? "available");
  let error = $state("");
  let busy = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    error = "";
    try {
      await onsubmit({ name, category, description, photo, status });
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
    <Label for="photo">Photo URL</Label>
    <Input id="photo" bind:value={photo} />
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
