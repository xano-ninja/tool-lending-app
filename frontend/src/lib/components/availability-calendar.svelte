<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";

  import { Button } from "$lib/components/ui/button/index.js";
  import { clash, isBooked, type Booking } from "$lib/booking";
  import { isoDate, today } from "$lib/format";
  import { cn } from "$lib/utils";

  const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  let {
    booked,
    start = $bindable(),
    due = $bindable(),
    selectable = false,
  }: {
    booked: Booking[];
    start?: string;
    due?: string;
    selectable?: boolean;
  } = $props();

  let offset = $state(0);
  let pickingDue = $state(false);

  const first = $derived.by(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + offset, 1);
  });

  const months = $derived(
    [0, 1].map((i) => {
      const month = new Date(first.getFullYear(), first.getMonth() + i, 1);
      const days: (string | null)[] = Array(month.getDay()).fill(null);
      const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= length; d++) {
        days.push(isoDate(new Date(month.getFullYear(), month.getMonth(), d)));
      }
      return {
        label: month.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        days,
      };
    }),
  );

  function pick(day: string) {
    if (pickingDue && start && day >= start && !clash(booked, start, day)) {
      due = day;
      pickingDue = false;
    } else {
      start = day;
      due = day;
      pickingDue = true;
    }
  }

  function inRange(day: string) {
    return selectable && !!start && !!due && day >= start && day <= due;
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <Button
      variant="ghost"
      size="icon"
      aria-label="Previous months"
      disabled={offset === 0}
      onclick={() => (offset -= 1)}
    >
      <ChevronLeft />
    </Button>
    <Button variant="ghost" size="icon" aria-label="Next months" onclick={() => (offset += 1)}>
      <ChevronRight />
    </Button>
  </div>

  {#each months as month (month.label)}
    <div class="space-y-1">
      <p class="text-sm font-medium">{month.label}</p>
      <div class="grid grid-cols-7 gap-0.5 text-center text-xs">
        {#each WEEKDAYS as weekday (weekday)}
          <span class="text-muted-foreground py-1">{weekday}</span>
        {/each}
        {#each month.days as day, i (day ?? `blank-${i}`)}
          {#if day === null}
            <span></span>
          {:else}
            {@const past = day < today()}
            {@const taken = isBooked(booked, day)}
            <button
              type="button"
              class={cn(
                "rounded-md py-1.5 tabular-nums",
                taken && "bg-muted text-muted-foreground line-through",
                !taken && inRange(day) && "bg-primary text-primary-foreground",
                past && !taken && "text-muted-foreground/50",
                selectable && !past && !taken && !inRange(day) && "hover:bg-accent",
              )}
              disabled={!selectable || past || taken}
              aria-pressed={selectable ? inRange(day) : undefined}
              aria-label={`${day}${taken ? ", booked" : ""}`}
              onclick={() => pick(day)}
            >
              {Number(day.slice(8))}
            </button>
          {/if}
        {/each}
      </div>
    </div>
  {/each}

  <div class="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
    <span class="flex items-center gap-1.5"><span class="bg-muted size-3 rounded-sm"></span> Booked</span>
    {#if selectable}
      <span class="flex items-center gap-1.5"><span class="bg-primary size-3 rounded-sm"></span> Your dates</span>
    {/if}
  </div>
  {#if selectable && pickingDue}
    <p class="text-muted-foreground text-xs">Pick the day you bring it back.</p>
  {/if}
</div>
