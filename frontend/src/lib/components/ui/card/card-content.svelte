<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import type { WithElementRef } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
  bind:this={ref}
  data-slot="card-content"
  class={cn("px-6", className)}
  {...restProps}
>
  {@render children?.()}
</div>
