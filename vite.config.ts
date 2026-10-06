import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import adapter from "@xano/sdk/sveltekit";
import tailwindcss from "@tailwindcss/vite";

// Vite's root is the project root. The framework resolves its own file
// locations from the plugin config below — this file is the ONLY place that
// config lives — and routes the build through its adapter, which writes
// frontend/dist, the directory `npm run xano:deploy:ephemeral` ships as the frontend.
export default defineConfig({
  plugins: [tailwindcss(), sveltekit({
    // RUNES MODE, FORCED — not left to Svelte 5's per-component detection.
    //
    // By default a component that uses `export let` and `<slot>` simply
    // compiles in legacy mode and works, so the Svelte 4 API an assistant
    // reaches for from older training data produces no error at all. Pinning
    // runes here turns that into a compile failure naming the file, which is
    // the same guidance the agent brief gives, enforced instead of stated.
    //
    // `node_modules` is exempted (returning undefined restores detection):
    // an installed library compiles under whatever mode ITS author wrote for,
    // and forcing ours onto it would break dependencies this project does not
    // own. Removable in Svelte 6, where runes stop being opt-in.
    compilerOptions: {
      runes: ({ filename }) =>
        filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
    },
    // No `preprocess`. vite-plugin-svelte 7 compiles `<script lang="ts">`
    // itself, so `vitePreprocess()` is the no-op it looks like — `sv create`
    // emits none either. Verified against a real build: components typecheck
    // and compile without it.
    //
    // The deploy target is a static host with NO server runtime — Xano is the
    // backend. Routes are PRERENDERED (see frontend/src/routes/+layout.ts):
    // each becomes its own HTML file at build time, and the host resolves a URL
    // to it by trying the exact key, then `{path}.html`, then
    // `{path}/index.html`. That is why no `trailingSlash` is configured — both
    // output shapes resolve, so this stays on SvelteKit's default.
    //
    // The SDK's adapter, writing to frontend/dist. Every prerendered route is
    // its own file; a route that sets `prerender = false` (a detail page for
    // rows created at runtime) has no file, so the host answers it with
    // 404.html, which the adapter writes as the app shell whenever such a
    // route exists: the shell boots the app and renders the route in the
    // browser, so a reload or a deep link works. While every route is
    // prerendered, 404.html stays the prerendered /404 page.
    //
    // Do not swap it for `@sveltejs/adapter-static` with a `fallback`: that
    // writes the shell at index.html, over the prerendered home page.
    //
    // `xanosdk deploy --static-env` still finds its anchor: every document
    // renders from app.html, so each has a <head> that gets the injected globals.
    adapter: adapter({ out: "frontend/dist" }),
    // Absolute asset URLs, pinned rather than left to the default. Prerendered
    // pages live at varying URL depths, and a relative `../_app/…` computed for
    // one depth 404s at another.
    paths: { relative: false },
    prerender: {
      // A hash link in the shared layout — `<a href="#services">`, the default
      // shape of a one-page site's nav — renders into EVERY prerendered route,
      // including the scaffold's own /404. There it resolves to /404#services,
      // an anchor that by definition is not on that page, and SvelteKit's
      // default handler THROWS: the vite build succeeds and the prerender pass
      // after it kills the build, with a stack trace naming only files inside
      // node_modules and a route the author never wrote.
      //
      // So ignore a missing id on /404 specifically, rather than reaching for a
      // blanket `handleMissingId: "warn"`. A hash link that is genuinely broken
      // on a real route still fails the build, which is the check worth keeping.
      handleMissingId: ({ path, message }) => {
        if (path === "/404") return;
        throw new Error(message);
      },
    },
    // SvelteKit's project layout, redirected under frontend/ so this stays a
    // single-root project: one package.json, one tsconfig.json, and xano/
    // sitting alongside as the backend half. NOTE these are what make
    // frontend/src/routes the routes directory — a file added under a
    // top-level src/routes/ is not a route and will not be served.
    files: {
      routes: "frontend/src/routes",
      lib: "frontend/src/lib",
      appTemplate: "frontend/src/app.html",
      assets: "frontend/static",
    },
  })],
  server: { host: "127.0.0.1", port: 5173 },
});
