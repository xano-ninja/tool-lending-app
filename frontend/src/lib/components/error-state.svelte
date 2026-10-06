<script lang="ts">
  // Shared by the prerendered /404 route and +error.svelte.
  let { status = 404, message = "" }: { status?: number; message?: string } = $props();
</script>

<main class="grid min-h-screen place-items-center p-8">
  <div class="max-w-md space-y-4 text-center">
    <p class="text-6xl font-semibold tracking-tight">{status}</p>
    <h1 class="text-xl font-medium">
      {status === 404 ? "We can't find that page." : "Something went wrong."}
    </h1>
    <p class="text-muted-foreground text-sm">
      {message !== "" ? message : "The link may be broken, or the page may have moved."}
    </p>
    <a
      href="/"
      class="bg-primary text-primary-foreground ring-offset-background focus-visible:ring-ring inline-flex h-10 items-center rounded-md px-5 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      Back to safety
    </a>
  </div>
</main>
