<script lang="ts">
  import { page } from "$app/state";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";

  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import {
    addNote,
    getItem,
    joinWaitlist,
    leaveWaitlist,
    myWaitlist,
    requestLoan,
    type ItemDetail,
  } from "$lib/api";
  import {
    addDays,
    errorMessage,
    formatDate,
    formatTimestamp,
    loanLabel,
    loanVariant,
    today,
  } from "$lib/format";
  import { session } from "$lib/session.svelte";

  const id = $derived(Number(page.params.id));

  let detail = $state<ItemDetail | null>(null);
  let error = $state("");
  let loading = $state(true);

  let onWaitlist = $state(false);
  let waitlistError = $state("");

  let startDate = $state(today());
  let dueDate = $state(addDays(today(), 7));
  let requestError = $state("");
  let requested = $state(false);

  let note = $state("");
  let noteError = $state("");

  let busy = $state(false);

  async function load() {
    loading = true;
    error = "";
    try {
      detail = await getItem(id);
    } catch (e) {
      detail = null;
      error = errorMessage(e, "Could not load this item.");
    } finally {
      loading = false;
    }
  }

  async function loadWaitlist() {
    try {
      onWaitlist = (await myWaitlist()).some((entry) => entry.item_id === id);
    } catch {
      onWaitlist = false;
    }
  }

  $effect(() => {
    if (Number.isInteger(id)) load();
  });

  $effect(() => {
    if (session.user && Number.isInteger(id)) loadWaitlist();
  });

  async function submitRequest(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    requestError = "";
    try {
      await requestLoan({ item_id: id, start_date: startDate, due_date: dueDate });
      requested = true;
    } catch (e) {
      requestError = errorMessage(e, "Could not send the request.");
    } finally {
      busy = false;
    }
  }

  async function toggleWaitlist() {
    busy = true;
    waitlistError = "";
    try {
      if (onWaitlist) await leaveWaitlist(id);
      else await joinWaitlist(id);
      onWaitlist = !onWaitlist;
      await load();
    } catch (e) {
      waitlistError = errorMessage(e, "Could not update the waitlist.");
    } finally {
      busy = false;
    }
  }

  async function submitNote(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    noteError = "";
    try {
      const added = await addNote(id, { note });
      if (detail) detail.notes = [added, ...detail.notes];
      note = "";
    } catch (e) {
      noteError = errorMessage(e, "Could not save the note.");
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head>
  <title>{detail ? detail.item.name : "Item"} · Tool library</title>
</svelte:head>

<main class="mx-auto max-w-5xl space-y-6 p-8">
  <a href="/" class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
    <ArrowLeft class="size-4" /> Catalog
  </a>

  {#if error}
    <p class="text-destructive text-sm">{error}</p>
  {:else if loading && !detail}
    <p class="text-muted-foreground text-sm">Loading...</p>
  {:else if detail}
    {@const { item, current_loan, waitlist_count, notes, history } = detail}
    <header class="space-y-2">
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-3xl font-semibold tracking-tight">{item.name}</h1>
        <Badge variant={item.status === "available" ? "default" : "secondary"}>
          {item.status.replace("_", " ")}
        </Badge>
      </div>
      <p class="text-muted-foreground">{item.category}</p>
      {#if item.description}<p>{item.description}</p>{/if}
    </header>

    <div class="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div class="space-y-6">
        {#if item.photo}
          <img src={item.photo} alt={item.name} class="max-h-80 rounded-lg border object-cover" />
        {/if}

        <section class="space-y-2">
          <h2 class="text-lg font-medium">Loan history</h2>
          {#if history.length === 0}
            <p class="text-muted-foreground text-sm">Not borrowed yet.</p>
          {:else}
            <ul class="divide-y rounded-lg border text-sm">
              {#each history as loan (loan.id)}
                <li class="flex items-center justify-between gap-3 px-4 py-2">
                  <span>{formatDate(loan.start_date)} to {formatDate(loan.due_date)}</span>
                  <span class="text-muted-foreground">
                    {#if loan.returned_at}
                      returned {formatTimestamp(loan.returned_at)}
                    {:else}
                      <Badge variant={loanVariant(loan)}>{loanLabel(loan)}</Badge>
                    {/if}
                  </span>
                </li>
              {/each}
            </ul>
          {/if}
        </section>

        <section class="space-y-2">
          <h2 class="text-lg font-medium">Condition notes</h2>
          {#if session.user?.role === "admin"}
            <form class="space-y-2" onsubmit={submitNote}>
              <Label for="note" class="sr-only">New note</Label>
              <Textarea id="note" bind:value={note} placeholder="Blade replaced, cord taped..." required />
              {#if noteError}<p class="text-destructive text-sm">{noteError}</p>{/if}
              <Button type="submit" size="sm" disabled={busy || !note.trim()}>Add note</Button>
            </form>
          {/if}
          {#if notes.length === 0}
            <p class="text-muted-foreground text-sm">No notes.</p>
          {:else}
            <ul class="space-y-2 text-sm">
              {#each notes as n (n.id)}
                <li class="rounded-lg border px-4 py-2">
                  <p class="text-muted-foreground text-xs">{formatTimestamp(n.created_at)}</p>
                  <p class="whitespace-pre-line">{n.note}</p>
                </li>
              {/each}
            </ul>
          {/if}
        </section>
      </div>

      <aside class="space-y-4">
        <Card.Root>
          <Card.Header>
            <Card.Title>Availability</Card.Title>
            <Card.Description>
              {#if current_loan}
                {current_loan.status === "out" ? "Out" : "Booked"} until {formatDate(current_loan.due_date)}
              {:else if item.status === "available"}
                On the shelf
              {:else}
                {item.status.replace("_", " ")}
              {/if}
              · {waitlist_count} waiting
            </Card.Description>
          </Card.Header>
          <Card.Content class="space-y-4">
            {#if item.status === "retired"}
              <p class="text-muted-foreground text-sm">This item is retired and cannot be borrowed.</p>
            {:else if !session.user}
              <Button href="/login?next=/items/{id}" class="w-full">Sign in to borrow</Button>
            {:else if requested}
              <p class="text-sm">Request sent. An admin will review it.</p>
              <Button href="/me/loans" variant="outline" class="w-full">My loans</Button>
            {:else}
              <form class="space-y-3" onsubmit={submitRequest}>
                <div class="space-y-2">
                  <Label for="start">From</Label>
                  <Input id="start" type="date" bind:value={startDate} min={today()} required />
                </div>
                <div class="space-y-2">
                  <Label for="due">Until</Label>
                  <Input id="due" type="date" bind:value={dueDate} min={startDate} required />
                </div>
                {#if requestError}<p class="text-destructive text-sm">{requestError}</p>{/if}
                <Button type="submit" class="w-full" disabled={busy}>Request to borrow</Button>
              </form>
            {/if}

            {#if session.user && item.status !== "retired"}
              <Button variant="outline" class="w-full" disabled={busy} onclick={toggleWaitlist}>
                {onWaitlist ? "Leave waitlist" : "Join waitlist"}
              </Button>
              {#if waitlistError}<p class="text-destructive text-sm">{waitlistError}</p>{/if}
            {/if}
          </Card.Content>
        </Card.Root>
      </aside>
    </div>
  {/if}
</main>
