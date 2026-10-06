<script lang="ts">
  import ArrowRight from "@lucide/svelte/icons/arrow-right";

  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
</script>

<main class="mx-auto flex min-h-screen max-w-2xl flex-col justify-center p-8">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-3xl tracking-tight">tool-lending-app</Card.Title>
      <Card.Description class="text-base">
        Your Xano SDK project is ready. The backend lives in <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">xano/</code> and this frontend in <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">frontend/</code>.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ol class="text-muted-foreground list-inside list-decimal space-y-2">
        <li>Author your first table + endpoint in <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">xano/index.ts</code> (see <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">xano/EXAMPLE.md</code>).</li>
        <li>Wire it into the UI from <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">frontend/src/lib/api.ts</code>.</li>
        <li>Run it on the Xano Engine: <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">npm run xano:deploy</code>.</li>
      </ol>
    </Card.Content>
    <Card.Footer>
      <!-- Components come from shadcn-svelte — add more with
           `npx shadcn-svelte@latest add <name>`. -->
      <Button href="https://ui.shadcn.com/docs/components" target="_blank" rel="noreferrer">
        Browse UI components
        <ArrowRight />
      </Button>
    </Card.Footer>
  </Card.Root>
</main>
