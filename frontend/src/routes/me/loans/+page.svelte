<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { leaveWaitlist, myLoans, myWaitlist, type MyLoan, type MyWaitlistEntry } from "$lib/api";
  import { errorMessage, formatDate, formatTimestamp, isOverdue, loanLabel, loanVariant } from "$lib/format";
  import { session } from "$lib/session.svelte";

  let loans = $state<MyLoan[]>([]);
  let waitlist = $state<MyWaitlistEntry[]>([]);
  let error = $state("");
  let loading = $state(true);

  const current = $derived(
    loans
      .filter((l) => l.status === "requested" || l.status === "approved" || l.status === "out")
      .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a))),
  );
  const past = $derived(loans.filter((l) => l.status === "returned" || l.status === "rejected"));

  async function load() {
    loading = true;
    error = "";
    try {
      [loans, waitlist] = await Promise.all([myLoans(), myWaitlist()]);
    } catch (e) {
      error = errorMessage(e, "Could not load your loans.");
    } finally {
      loading = false;
    }
  }

  async function leave(entry: MyWaitlistEntry) {
    try {
      await leaveWaitlist(entry.item_id);
      waitlist = waitlist.filter((w) => w.id !== entry.id);
    } catch (e) {
      error = errorMessage(e, "Could not leave the waitlist.");
    }
  }

  $effect(() => {
    if (session.user) load();
  });
</script>

<svelte:head>
  <title>My loans · Tool library</title>
</svelte:head>

{#snippet loanRow(loan: MyLoan)}
  <li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
    <div class="space-y-0.5">
      <a href="/items/{loan.item_id}" class="font-medium hover:underline">
        {loan.item_name ?? `Item ${loan.item_id}`}
      </a>
      <p class="text-muted-foreground text-sm">
        {formatDate(loan.start_date)} to {formatDate(loan.due_date)}
        {#if loan.returned_at}· returned {formatTimestamp(loan.returned_at)}{/if}
      </p>
    </div>
    <Badge variant={loanVariant(loan)}>{loanLabel(loan)}</Badge>
  </li>
{/snippet}

<main class="mx-auto max-w-3xl space-y-8 p-8">
  <h1 class="text-3xl font-semibold tracking-tight">My loans</h1>

  {#if !session.ready}
    <p class="text-muted-foreground text-sm">Loading...</p>
  {:else if !session.user}
    <div class="space-y-3">
      <p class="text-muted-foreground">Sign in to see what you have borrowed.</p>
      <Button href="/login?next=/me/loans">Sign in</Button>
    </div>
  {:else if error}
    <p class="text-destructive text-sm">{error}</p>
  {:else if loading}
    <p class="text-muted-foreground text-sm">Loading...</p>
  {:else}
    <section class="space-y-2">
      <h2 class="text-lg font-medium">Current</h2>
      {#if current.length === 0}
        <p class="text-muted-foreground text-sm">
          Nothing borrowed or requested. <a href="/" class="underline">Browse the catalog.</a>
        </p>
      {:else}
        <ul class="divide-y rounded-lg border">
          {#each current as loan (loan.id)}{@render loanRow(loan)}{/each}
        </ul>
      {/if}
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-medium">Waitlist</h2>
      {#if waitlist.length === 0}
        <p class="text-muted-foreground text-sm">You are not waiting on any tools.</p>
      {:else}
        <ul class="divide-y rounded-lg border">
          {#each waitlist as entry (entry.id)}
            <li class="flex items-center justify-between gap-3 px-4 py-3">
              <div class="space-y-0.5">
                <a href="/items/{entry.item_id}" class="font-medium hover:underline">
                  {entry.item_name ?? `Item ${entry.item_id}`}
                </a>
                <p class="text-muted-foreground text-sm">since {formatTimestamp(entry.created_at)}</p>
              </div>
              <Button variant="ghost" size="sm" onclick={() => leave(entry)}>Leave</Button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    {#if past.length > 0}
      <section class="space-y-2">
        <h2 class="text-lg font-medium">Past</h2>
        <ul class="divide-y rounded-lg border">
          {#each past as loan (loan.id)}{@render loanRow(loan)}{/each}
        </ul>
      </section>
    {/if}
  {/if}
</main>
