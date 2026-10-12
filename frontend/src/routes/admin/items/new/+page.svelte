<script lang="ts">
  import { goto } from "$app/navigation";

  import { Button } from "$lib/components/ui/button/index.js";
  import ItemForm from "$lib/components/item-form.svelte";
  import { createItem, type ItemInput } from "$lib/api";
  import { session } from "$lib/session.svelte";

  async function create(input: ItemInput) {
    const item = await createItem(input);
    await goto(`/items/${item.id}`);
  }
</script>

<svelte:head>
  <title>Add item · Tool library</title>
</svelte:head>

<main class="mx-auto max-w-xl space-y-6 p-8">
  <h1 class="text-3xl font-semibold tracking-tight">Add item</h1>
  {#if !session.ready}
    <p class="text-muted-foreground text-sm">Loading...</p>
  {:else if session.user?.role !== "admin"}
    <p class="text-muted-foreground">This page is for admins.</p>
    {#if !session.user}<Button href="/login?next=/admin/items/new">Sign in</Button>{/if}
  {:else}
    <ItemForm onsubmit={create} submitLabel="Add item" />
  {/if}
</main>
