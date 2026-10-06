<script lang="ts">
  // Rendered when a client-side navigation or load fails inside the running
  // app. The static host never sees these — for a path that matched no
  // document at all, it serves the prerendered routes/404 page instead.
  import { page } from "$app/state";
  import ErrorState from "$lib/components/error-state.svelte";
</script>

<svelte:head>
  <title>{page.status === 404 ? "Page not found" : "Something went wrong"}</title>
</svelte:head>

<ErrorState status={page.status} message={page.error?.message ?? ""} />
