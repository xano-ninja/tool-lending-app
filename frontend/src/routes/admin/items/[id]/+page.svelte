<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";

  import { Button } from "$lib/components/ui/button/index.js";
  import ItemForm from "$lib/components/item-form.svelte";
  import { getItem, itemWaitlist, removeWaitlistEntry, updateItem, type Item, type ItemWaitlistEntry, type ItemInput } from "$lib/api";
  import { errorMessage, formatTimestamp } from "$lib/format";
  import { session } from "$lib/session.svelte";

  const id = $derived(Number(page.params.id));
  const isAdmin = $derived(session.user?.role === "admin");

  let item = $state<Item | null>(null);
  let error = $state("");
  let waitlist = $state<ItemWaitlistEntry[]>([]);

  async function save(input: ItemInput) {
    await updateItem(id, input);
    await goto(`/items/${id}`);
  }

  async function remove(entryId: number) {
    try {
      await removeWaitlistEntry(entryId);
      waitlist = waitlist.filter((e) => e.id !== entryId);
    } catch (e) {
      error = errorMessage(e, "Could not remove this entry.");
    }
  }

  $effect(() => {
    if (!isAdmin || !Number.isInteger(id)) return;
    getItem(id)
      .then((detail) => (item = detail.item))
      .catch((e) => (error = errorMessage(e, "Could not load this item.")));
    itemWaitlist(id)
      .then((entries) => (waitlist = entries))
      .catch(() => (waitlist = []));
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
    <section class="space-y-2">
      <h2 class="text-xl font-semibold">Waitlist</h2>
      {#if waitlist.length === 0}
        <p class="text-muted-foreground text-sm">Nobody is waiting.</p>
      {:else}
        <ol class="list-decimal space-y-1 pl-5 text-sm">
          {#each waitlist as entry (entry.id)}
            <li>
              <a class="underline" href="/admin/members/{entry.user_id}">{entry.user_name ?? `Member ${entry.user_id}`}</a>
              <span class="text-muted-foreground">since {formatTimestamp(entry.created_at)}</span>
              <Button variant="ghost" size="sm" onclick={() => remove(entry.id)}>Remove</Button>
            </li>
          {/each}
        </ol>
      {/if}
    </section>
  {:else}
    <p class="text-muted-foreground text-sm">Loading...</p>
  {/if}
</main>
