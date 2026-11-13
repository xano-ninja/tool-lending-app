<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import {
    actOnLoan,
    extendLoan,
    listItems,
    listLoans,
    listMembers,
    type AdminLoan,
    type Item,
    type LoanAction,
    type Member,
  } from "$lib/api";
  import { addDays, errorMessage, formatDate, loanLabel, loanVariant, today } from "$lib/format";
  import { session } from "$lib/session.svelte";

  let requested = $state<AdminLoan[]>([]);
  let approved = $state<AdminLoan[]>([]);
  let overdue = $state<AdminLoan[]>([]);
  let out = $state<AdminLoan[]>([]);
  let repair = $state<Item[]>([]);
  let members = $state<Member[]>([]);
  let error = $state("");
  let loading = $state(true);
  let extending = $state<number | null>(null);
  let newDue = $state("");

  const isAdmin = $derived(session.user?.role === "admin");
  const onTime = $derived(out.filter((l) => !overdue.some((o) => o.id === l.id)));

  async function load() {
    loading = true;
    error = "";
    try {
      [requested, approved, overdue, out, repair, members] = await Promise.all([
        listLoans({ status: "requested" }),
        listLoans({ status: "approved" }),
        listLoans({ status: "overdue" }),
        listLoans({ status: "out" }),
        listItems({ status: "in_repair" }),
        listMembers(),
      ]);
    } catch (e) {
      error = errorMessage(e, "Could not load the dashboard.");
    } finally {
      loading = false;
    }
  }

  async function act(loan: AdminLoan, action: LoanAction) {
    error = "";
    try {
      await actOnLoan(loan.id, action);
      await load();
    } catch (e) {
      error = errorMessage(e, "Could not update the loan.");
    }
  }

  function earliestDue(loan: AdminLoan) {
    const next = addDays(loan.due_date, 1);
    return next > today() ? next : today();
  }

  function startExtend(loan: AdminLoan) {
    extending = loan.id;
    newDue = addDays(earliestDue(loan), 6);
  }

  async function extend(loan: AdminLoan) {
    error = "";
    try {
      await extendLoan(loan.id, { due_date: newDue });
      extending = null;
      await load();
    } catch (e) {
      error = errorMessage(e, "Could not extend the loan.");
    }
  }

  $effect(() => {
    if (isAdmin) load();
  });
</script>

<svelte:head>
  <title>Admin · Tool library</title>
</svelte:head>

{#snippet loanRow(loan: AdminLoan, actions: { label: string; action: LoanAction; variant?: "outline" }[], extendable: boolean)}
  <li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
    <div class="space-y-0.5">
      <a href="/items/{loan.item_id}" class="font-medium hover:underline">
        {loan.item_name ?? `Item ${loan.item_id}`}
      </a>
      <p class="text-muted-foreground text-sm">
        <a href="/admin/members/{loan.user_id}" class="hover:underline">
          {loan.user_name ?? `User ${loan.user_id}`}
        </a>
        · {formatDate(loan.start_date)} to {formatDate(loan.due_date)}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant={loanVariant(loan)}>{loanLabel(loan)}</Badge>
      {#each actions as a (a.action)}
        <Button size="sm" variant={a.variant ?? "default"} onclick={() => act(loan, a.action)}>
          {a.label}
        </Button>
      {/each}
      {#if extendable && extending !== loan.id}
        <Button size="sm" variant="outline" onclick={() => startExtend(loan)}>Extend</Button>
      {/if}
    </div>
    {#if extending === loan.id}
      <form
        class="flex w-full flex-wrap items-center justify-end gap-2"
        onsubmit={(e) => {
          e.preventDefault();
          extend(loan);
        }}
      >
        <label for="due-{loan.id}" class="text-muted-foreground text-sm">New due date</label>
        <Input id="due-{loan.id}" type="date" class="w-auto" min={earliestDue(loan)} bind:value={newDue} required />
        <Button size="sm" type="submit">Save</Button>
        <Button size="sm" variant="ghost" onclick={() => (extending = null)}>Cancel</Button>
      </form>
    {/if}
  </li>
{/snippet}

{#snippet section(title: string, loans: AdminLoan[], empty: string, actions: { label: string; action: LoanAction; variant?: "outline" }[], extendable = false)}
  <section class="space-y-2">
    <h2 class="text-lg font-medium">{title}</h2>
    {#if loans.length === 0}
      <p class="text-muted-foreground text-sm">{empty}</p>
    {:else}
      <ul class="divide-y rounded-lg border">
        {#each loans as loan (loan.id)}{@render loanRow(loan, actions, extendable)}{/each}
      </ul>
    {/if}
  </section>
{/snippet}

<main class="mx-auto max-w-4xl space-y-8 p-8">
  <div class="flex items-center justify-between gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Admin</h1>
    {#if isAdmin}
      <Button href="/admin/items/new">Add item</Button>
    {/if}
  </div>

  {#if !session.ready}
    <p class="text-muted-foreground text-sm">Loading...</p>
  {:else if !session.user}
    <Button href="/login?next=/admin">Sign in</Button>
  {:else if !isAdmin}
    <p class="text-muted-foreground">This page is for admins.</p>
  {:else}
    {#if error}
      <p class="text-destructive text-sm">{error}</p>
    {/if}
    {#if loading}
      <p class="text-muted-foreground text-sm">Loading...</p>
    {:else}
      {@render section("Pending requests", requested, "No requests waiting.", [
        { label: "Approve", action: "approve" },
        { label: "Reject", action: "reject", variant: "outline" },
      ])}
      {@render section("Ready for checkout", approved, "Nothing approved and waiting.", [
        { label: "Check out", action: "checkout" },
      ])}
      {@render section("Overdue", overdue, "Nothing overdue.", [
        { label: "Mark returned", action: "return" },
      ], true)}
      {@render section("On loan", onTime, "Nothing on loan.", [
        { label: "Mark returned", action: "return", variant: "outline" },
      ], true)}

      <section class="space-y-2">
        <h2 class="text-lg font-medium">In repair</h2>
        {#if repair.length === 0}
          <p class="text-muted-foreground text-sm">Nothing in repair.</p>
        {:else}
          <ul class="divide-y rounded-lg border">
            {#each repair as item (item.id)}
              <li class="flex items-center justify-between gap-3 px-4 py-3">
                <a href="/items/{item.id}" class="font-medium hover:underline">{item.name}</a>
                <Button href="/admin/items/{item.id}" variant="outline" size="sm">Edit</Button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
      <section class="space-y-2">
        <h2 class="text-lg font-medium">Members</h2>
        {#if members.length === 0}
          <p class="text-muted-foreground text-sm">No members yet.</p>
        {:else}
          <ul class="divide-y rounded-lg border">
            {#each members as member (member.id)}
              <li class="flex items-center justify-between gap-3 px-4 py-3">
                <a href="/admin/members/{member.id}" class="font-medium hover:underline">{member.name}</a>
                <span class="text-muted-foreground text-sm">{member.email}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}
  {/if}
</main>
