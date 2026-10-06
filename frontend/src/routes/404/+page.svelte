<script lang="ts">
  // Prerendered to 404.html, which is what tells the static host to answer an
  // unmatched path with a real 404 instead of quietly serving the app shell
  // with a 200 (a missing asset would then reach the browser as HTML, which it
  // reports as "Unexpected token '<'").
  //
  // It must be a route, not +error.svelte: SvelteKit never prerenders the error
  // component to a file, so relying on it would ship no 404.html at all.
  //
  // Delete this directory and an unmatched path serves the home page with a 200
  // instead — which is worse, not better, so keep it unless you have a reason.
  import ErrorState from "$lib/components/error-state.svelte";
</script>

<svelte:head>
  <title>Page not found</title>
</svelte:head>

<ErrorState status={404} />
