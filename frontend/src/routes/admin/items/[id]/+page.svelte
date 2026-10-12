<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";

  import { Button } from "$lib/components/ui/button/index.js";
  import ItemForm from "$lib/components/item-form.svelte";
  import { getItem, updateItem, type Item, type ItemInput } from "$lib/api";
  import { errorMessage } from "$lib/format";
  import { session } from "$lib/session.svelte";

  const id = $derived(Number(page.params.id));
  const isAdmin = $derived(session.user?.role === "admin");

  let item = $state<Item | null>(null);
  let error = $state("");

  async function save(input: ItemInput) {
    await updateItem(id, input);
    await goto(`/items/${id}`);
  }

  $effect(() => {
    if (!isAdmin || !Number.isInteger(id)) return;
    getItem(id)
      .then((detail) => (item = detail.item))
      .catch((e) => (error = errorMessage(e, "Could not load this item.")));
  });
</script>

<svelte:head>
  <title>Edit item · Tool library</title>
</svelte:head>

<main class="mx-auto max-w-xl space-y-6 p-8">
  <h1 class="text-3xl font-semibold tracking-tight">Edit item</h1>
  {#if !session.ready}
    <p class="text-muted-foreground text-sm">Loading...</p>
  {:else if !isAdmin}
    <p class="text-muted-foreground">This page is for admins.</p>
    {#if !session.user}<Button href="/login?next=/admin/items/{id}">Sign in</Button>{/if}
  {:else if error}
    <p class="text-destructive text-sm">{error}</p>
  {:else if item}
    <ItemForm {item} onsubmit={save} submitLabel="Save" />
  {:else}
    <p class="text-muted-foreground text-sm">Loading...</p>
  {/if}
</main>
