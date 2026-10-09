<script lang="ts">
  // The shared token stylesheet — semantic colors (bg-primary,
  // text-muted-foreground) plus the Tailwind v4 theme. Imported once here so
  // every route gets it.
  import "../index.css";

  import { onMount } from "svelte";

  import { Button } from "$lib/components/ui/button/index.js";
  import { loadSession, session, signOut } from "$lib/session.svelte";

  let { children } = $props();

  onMount(loadSession);
</script>

<header class="border-b">
  <nav class="mx-auto flex max-w-5xl items-center gap-4 px-8 py-3 text-sm">
    <a href="/" class="font-semibold">Tool library</a>
    <a href="/me/loans" class="text-muted-foreground hover:text-foreground">My loans</a>
    <span class="ml-auto"></span>
    {#if session.user}
      <span class="text-muted-foreground">{session.user.name}</span>
      <Button variant="ghost" size="sm" onclick={signOut}>Sign out</Button>
    {:else if session.ready}
      <Button href="/login" variant="outline" size="sm">Sign in</Button>
    {/if}
  </nav>
</header>

{@render children()}
