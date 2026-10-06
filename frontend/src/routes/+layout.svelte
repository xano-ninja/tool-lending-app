<script lang="ts">
  // The shared token stylesheet — semantic colors (bg-primary,
  // text-muted-foreground) plus the Tailwind v4 theme. Imported once here so
  // every route gets it.
  import "../index.css";

  let { children } = $props();
</script>

{@render children()}
