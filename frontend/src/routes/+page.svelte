<script lang="ts">
  import { onMount } from "svelte";

  import * as Card from "$lib/components/ui/card/index.js";
  import { listItems, type Item, type ItemFilters } from "$lib/api";

  const statuses = ["available", "on_loan", "in_repair", "retired"] as const;

  let items = $state<Item[]>([]);
  let error = $state("");
  let loading = $state(true);
  let category = $state("");
  let status = $state<"" | NonNullable<ItemFilters["status"]>>("");

  async function load() {
    loading = true;
    error = "";
    try {
      items = await listItems({
        category: category || undefined,
        status: status || undefined,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not load items.";
    } finally {
      loading = false;
    }
  }

  const categories = $derived([...new Set(items.map((i) => i.category))].sort());

  onMount(load);
</script>

<main class="mx-auto max-w-5xl space-y-6 p-8">
  <header class="space-y-1">
    <h1 class="text-3xl font-semibold tracking-tight">Tool library</h1>
    <p class="text-muted-foreground">Browse what is on the shelf.</p>
  </header>

  <div class="flex flex-wrap gap-3">
    <label class="text-sm">
      <span class="text-muted-foreground mb-1 block">Category</span>
      <input
        class="border-input bg-background h-9 rounded-md border px-3 text-sm"
        list="categories"
        bind:value={category}
        onchange={load}
        placeholder="any"
      />
      <datalist id="categories">
        {#each categories as c (c)}<option value={c}></option>{/each}
      </datalist>
    </label>
    <label class="text-sm">
      <span class="text-muted-foreground mb-1 block">Status</span>
      <select
        class="border-input bg-background h-9 rounded-md border px-3 text-sm"
        bind:value={status}
        onchange={load}
      >
        <option value="">any</option>
        {#each statuses as s (s)}<option value={s}>{s.replace("_", " ")}</option>{/each}
      </select>
    </label>
  </div>

  {#if error}
    <p class="text-destructive text-sm">{error}</p>
  {:else if loading}
    <p class="text-muted-foreground text-sm">Loading...</p>
  {:else if items.length === 0}
    <p class="text-muted-foreground text-sm">No items match.</p>
  {:else}
    <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each items as item (item.id)}
        <li>
          <Card.Root class="h-full">
            <Card.Header>
              <Card.Title>{item.name}</Card.Title>
              <Card.Description>{item.category} · {item.status.replace("_", " ")}</Card.Description>
            </Card.Header>
            {#if item.description}
              <Card.Content class="text-sm">{item.description}</Card.Content>
            {/if}
          </Card.Root>
        </li>
      {/each}
    </ul>
  {/if}
</main>
