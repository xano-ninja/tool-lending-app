<script lang="ts">
  import { page } from "$app/state";

  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { memberLoans, removeWaitlistEntry, type MemberLoans } from "$lib/api";
  import {
    errorMessage,
    formatDate,
    formatTimestamp,
    holdUntil,
    inLine,
    isOverdue,
    loanLabel,
    loanVariant,
  } from "$lib/format";
  import { session } from "$lib/session.svelte";

  type MemberLoan = MemberLoans["loans"][number];

  const id = $derived(Number(page.params.id));
  const isAdmin = $derived(session.user?.role === "admin");

  let data = $state<MemberLoans | null>(null);
  let error = $state("");

  const loans = $derived(data?.loans ?? []);
  const current = $derived(
    loans
      .filter((l) => l.status === "requested" || l.status === "approved" || l.status === "out")
      .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a))),
  );
  const past = $derived(loans.filter((l) => l.status === "returned" || l.status === "rejected"));
  const late = $derived(loans.filter((l) => l.overdue).length);
  const waitlist = $derived(data?.waitlist ?? []);

  async function remove(entryId: number) {
    try {
      await removeWaitlistEntry(entryId);
      data = await memberLoans(id);
    } catch (e) {
      error = errorMessage(e, "Could not remove this entry.");
    }
  }

  $effect(() => {
    if (!isAdmin || !Number.isInteger(id)) return;
    memberLoans(id)
      .then((d) => (data = d))
      .catch((e) => (error = errorMessage(e, "Could not load this member.")));
  });
</script>

<svelte:head>
  <title>{data?.member.name ?? "Member"} · Tool library</title>
</svelte:head>

{#snippet loanRow(loan: MemberLoan)}
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
  {#if !session.ready}
    <p class="text-muted-foreground text-sm">Loading...</p>
  {:else if !isAdmin}
    <p class="text-muted-foreground">This page is for admins.</p>
    {#if !session.user}<Button href="/login?next=/admin/members/{id}">Sign in</Button>{/if}
  {:else if error}
    <p class="text-destructive text-sm">{error}</p>
  {:else if !data}
    <p class="text-muted-foreground text-sm">Loading...</p>
  {:else}
    <div class="space-y-1">
      <div class="flex items-center gap-3">
        <h1 class="text-3xl font-semibold tracking-tight">{data.member.name}</h1>
        <Badge variant="outline">{data.member.role}</Badge>
      </div>
      <p class="text-muted-foreground text-sm">
        {data.member.email} · member since {formatTimestamp(data.member.created_at)}
      </p>
      <p class="text-muted-foreground text-sm">
        {loans.length} {loans.length === 1 ? "loan" : "loans"}, {late} late
      </p>
    </div>

    <section class="space-y-2">
      <h2 class="text-lg font-medium">Current</h2>
      {#if current.length === 0}
        <p class="text-muted-foreground text-sm">Nothing borrowed or requested.</p>
      {:else}
        <ul class="divide-y rounded-lg border">
          {#each current as loan (loan.id)}{@render loanRow(loan)}{/each}
        </ul>
      {/if}
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-medium">Waitlist</h2>
      {#if waitlist.length === 0}
        <p class="text-muted-foreground text-sm">Not waiting on any tools.</p>
      {:else}
        <ul class="divide-y rounded-lg border">
          {#each waitlist as entry (entry.id)}
            {@const held = holdUntil(entry.notified_at)}
            <li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div class="space-y-0.5">
                <a href="/admin/items/{entry.item_id}" class="font-medium hover:underline">
                  {entry.item_name ?? `Item ${entry.item_id}`}
                </a>
                <p class="text-muted-foreground text-sm">
                  {inLine(entry.ahead)} · since {formatTimestamp(entry.created_at)}
                </p>
              </div>
              <div class="flex items-center gap-2">
                {#if held}<Badge variant="secondary">held until {held}</Badge>{/if}
                <Button variant="ghost" size="sm" onclick={() => remove(entry.id)}>Remove</Button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-medium">History</h2>
      {#if past.length === 0}
        <p class="text-muted-foreground text-sm">No past loans.</p>
      {:else}
        <ul class="divide-y rounded-lg border">
          {#each past as loan (loan.id)}{@render loanRow(loan)}{/each}
        </ul>
      {/if}
    </section>
  {/if}
</main>
