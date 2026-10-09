<script lang="ts">
  import { goto } from "$app/navigation";

  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { login, me, signup } from "$lib/api";
  import { errorMessage } from "$lib/format";
  import { session } from "$lib/session.svelte";

  let mode = $state<"login" | "signup">("login");
  let name = $state("");
  let email = $state("");
  let password = $state("");
  let error = $state("");
  let busy = $state(false);

  // Only follow same-origin paths, so ?next= cannot send someone off-site.
  function nextPath(): string {
    const next = new URLSearchParams(location.search).get("next") ?? "";
    return next.startsWith("/") && !next.startsWith("//") ? next : "/";
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    error = "";
    try {
      if (mode === "signup") await signup({ name, email, password });
      else await login({ email, password });
      session.user = await me();
      await goto(nextPath());
    } catch (e) {
      error = errorMessage(e, "Could not sign in.");
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head>
  <title>{mode === "login" ? "Sign in" : "Create account"} · Tool library</title>
</svelte:head>

<main class="mx-auto max-w-sm p-8">
  <Card.Root>
    <Card.Header>
      <Card.Title>{mode === "login" ? "Sign in" : "Create an account"}</Card.Title>
      <Card.Description>
        {mode === "login"
          ? "Members sign in to borrow tools."
          : "Join the library to request tools."}
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <form class="space-y-4" onsubmit={submit}>
        {#if mode === "signup"}
          <div class="space-y-2">
            <Label for="name">Name</Label>
            <Input id="name" bind:value={name} required autocomplete="name" />
          </div>
        {/if}
        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input id="email" type="email" bind:value={email} required autocomplete="email" />
        </div>
        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            type="password"
            bind:value={password}
            required
            minlength={8}
            autocomplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
        {#if error}
          <p class="text-destructive text-sm">{error}</p>
        {/if}
        <Button type="submit" class="w-full" disabled={busy}>
          {mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </Card.Content>
    <Card.Footer class="text-muted-foreground text-sm">
      {#if mode === "login"}
        No account?
        <Button variant="link" class="h-auto p-1" onclick={() => (mode = "signup")}>Sign up</Button>
      {:else}
        Already a member?
        <Button variant="link" class="h-auto p-1" onclick={() => (mode = "login")}>Sign in</Button>
      {/if}
    </Card.Footer>
  </Card.Root>
</main>
