# tool-lending-app

Lending app for a neighborhood or makerspace tool library. Members browse the
catalog of drills, ladders and saws and request items for a date range; admins
approve loans, mark returns and log condition notes.

Built so far: email sign-in, the catalog, an item page where members request
a loan, join the waitlist and read the loan history and condition notes, and a
My loans page. Admin approval, check-out and return, the admin pages and the
nightly overdue task are not built yet.

The backend under [`xano/`](xano/) is TypeScript on the [Xano SDK](https://github.com/xano-sdk/sdk).
The SvelteKit frontend under [`frontend/`](frontend/) takes its request paths and
types from the backend defs.

## Run it

```bash
npm install
npm run xano:deploy   # backend on the local Xano Engine, seeded with sample items
npm run dev           # frontend, pointed at it
```

No Xano account needed. `npm run xano:check` and `npm run build` must pass
before a change is done.

## Run it on your machine

The Xano Engine is Xano running on your machine. `npm run xano:deploy` typechecks the
backend and deploys it to the engine: no sign-in, and no network round-trip.
It prints the backend URL, a link that opens Xano's visual builder on the engine, and
points `npm run dev` at it through `.env.local` (restart the dev server if it was already
running).

- **It works on a fresh machine with nothing set.** The first run downloads the latest
  engine once per machine and pins its version in `package.json`. Commit that change, so
  everyone on the project runs the same engine.
- **It keeps your table rows across redeploys** (`--keep-data`). The first run seeds and
  later runs merge your changes in without re-seeding. Rows survive only in tables and columns that keep
  their names (a rename drops the old one with its rows), and only while the engine runs. An
  engine update or restart starts it empty and the next run seeds again.
  `npm run xano:deploy -- --reset` gives a clean, re-seeded slate.
- **Updates are yours to take.** When a newer engine ships, a deploy offers it and never
  applies it without a yes. `npx xanosdk local update` moves the pin on purpose,
  and `npx xanosdk local cache clear` reclaims the disk space. To try another engine
  without moving the pin, export `XANOSDK_ENGINE_OVERRIDE` with a version (`v0.1.5`)
  or an engine archive path.
- **The rest of the CLI follows.** After a local deploy, `npm run xano:test`,
  `npx xanosdk tables` and `npx xanosdk status` reach the engine with no flag.
  `npx xanosdk local stop <name>` shuts it down.

## Deploy to Xano's cloud

```bash
npx xanosdk login               # once, to authenticate against your Xano account
npm run xano:deploy:ephemeral   # build the frontend, then ship it with the backend
```

That deploys the backend and the built frontend to a live **ephemeral** environment on
Xano and prints its URL. Run it again to refresh the same environment; if it expired, a
fresh one is created and the new URL is called out. `npx xanosdk status` says who you
are signed in as, which workspace you are bound to, and which environment this project
last deployed to — its URL, and when it expires — so you never have to remember the
environment's name. Your **workspace** is reached through a release (`deploy --ephemeral --test`,
`release create`, `promote`); see the
[deploying guide](https://github.com/xano-sdk/sdk/blob/main/guides/deploying.md).

The other scripts:

- `npm run xano:deploy:frontend` rebuilds the frontend and republishes it to the
  environment this project last deployed to — no backend compile or import, so it
  is the quick loop for UI-only changes. After `npm run xano:deploy` the engine serves
  it; `npm run xano:deploy:frontend -- --to ephemeral` sends it to an ephemeral instead,
  and `npx xanosdk publish ./frontend/dist --to workspace` puts the same build in front
  of your real workspace.
- `npm run xano:test` runs the tests the DEPLOYED environment carries — the `tests`
  on a query/function/middleware and any `workflowTest()`. It compiles nothing, so
  deploy first. A failing suite exits 5, distinct from a crash. `npx xanosdk deploy
  ./xano/index.ts --test` does both in one step.
- `npm run xano:export` compiles the backend to `workspace.json` (don't commit it).

## `xano.lock` — commit it

Object identity derives from `(type, name)`, so a rename would otherwise change
an object's guid and the engine would **delete and recreate** it rather than
renaming it in place — losing its rows on a record-preserving import.
[`xano/xano.lock`](xano/xano.lock) freezes each guid and each API group's
canonical slug, so renames and re-deploys keep the same identities (and the same
public URLs).

Every build writes it — no flag — and it **must be committed**. Ignoring it means
each build mints identities and public URLs that are thrown away and re-invented
next time. If you release to a workspace that already exists, adopt what it
already serves first with `npx xanosdk lock import <live-bundle.json> --lock=xano/xano.lock`;
that is also the recovery path once identities have drifted.

```bash
npm run xano:check      # CI: fail on ANY build warning (it runs --strict), if the export
                        # would change xano.lock, or if the lock carries an entry no
                        # object matches — writes nothing and needs no secrets, so a
                        # fresh clone runs it as-is
```

To rename an object: rename it in code and run `npm run xano:export`. Only if it
warns of an orphaned entry, run the `npx xanosdk lock rename <kind> <old> <new>` it prints, then
export again. Every `lock` subcommand finds `xano/xano.lock` from the project entry, as
`export` does — `--entry=<file>` names another entry, `--lock=<path>` the lock itself.

## The one contract

[`frontend/src/lib/api.ts`](frontend/src/lib/api.ts) takes request paths from
`xano/routes.gen.ts` (`routePath("GET notes/{id}", { id })`), request types from the
same file (`RouteInputs["POST create_note"]`, `MessageInputs[...]` for realtime), and
response types from the query defs (`import type` + `InferResponse`).
Never hand-type a URL or a request body — change a def and the frontend follows.

`npm run xano:routes` writes `xano/routes.gen.ts` from the defs; `dev`, `build`
and `typecheck` run it first, and `xano:check` fails on a missing or stale copy — commit it.
`init --from` and `pull` write it with the decoded backend.
It is plain data that imports nothing. Importing a def as a value for its
`getPath()` would instead pull the backend graph and the SDK runtime into the
browser bundle.

> To spot-check a def from Node (read `getPath()`/`verb`, log a value), run a real
> file with `tsx <file.ts>` **from inside the project root** — not `tsx -e`, not
> bare `node file.ts`, and not from another directory (they mis-resolve the
> intra-workspace `.js` imports and the `@xano/sdk` specifier). Or use
> `npx xanosdk routes xano/index.ts` to list every endpoint's verb + path.

## The frontend

[SvelteKit](https://svelte.dev/docs/kit) with Svelte 5, styled with
[Tailwind CSS](https://tailwindcss.com) v4 and
[shadcn-svelte](https://shadcn-svelte.com).

Pages live in [`frontend/src/routes/`](frontend/src/routes/) — `+page.svelte`
is a page, a subdirectory is a nested route. Routes are **prerendered**: each
becomes its own HTML document at build time, so a page loads as itself rather
than as a shell that fills in afterwards, and an unmatched path returns a real
404 from [`+error.svelte`](frontend/src/routes/+error.svelte).

> **There is no server.** `npm run xano:deploy:ephemeral` ships this app to a static host
> with no runtime of its own; Xano is the backend, reached through
> [`frontend/src/lib/api.ts`](frontend/src/lib/api.ts). So `+page.server.ts`,
> form actions, and server `load` have nothing to run on — and **nothing warns
> you**: a project using them builds and deploys green, then fails in the
> browser. Treat them as unavailable. That is the trade — the backend is
> authored in [`xano/`](xano/) as TypeScript and deployed alongside the
> frontend, so it is a real backend, just not this one.
>
> `frontend/src/routes/+layout.ts` sets `prerender = true` for the whole app.
> Because prerendering renders at build time, module-scope `window`/`document`
> access now fails the **build** rather than the browser — use `onMount`, or
> guard with `import { browser } from "$app/environment"`.

**A dynamic route fails the build until it says how it renders.** A route like
`/posts/[id]` cannot be prerendered unless the build knows which ids exist, so
the build stops and names it. For rows created at runtime (the usual detail
page), render it in the browser:

```ts
// frontend/src/routes/posts/[id]/+page.ts
export const prerender = false;
```

The host has no file for `/posts/42`, so it answers with `404.html`, which the
SDK's adapter (`@xano/sdk/sveltekit`, in `vite.config.ts`) writes as the app
shell: it boots the app and renders the route, so a reload or a deep link works
(the response status is still 404). Only for ids known at build time, list them
instead — each gets its own page, and no other id has one:
`export const entries = () => [{ id: "1" }, { id: "2" }];`

[`frontend/src/routes/404/+page.svelte`](frontend/src/routes/404/+page.svelte)
prerenders to `404.html` while every route is prerendered, which is what makes
an unmatched path return a real 404. It has to be a route: SvelteKit never
prerenders `+error.svelte` to a file. Once a route sets `prerender = false`,
the adapter writes the app shell there instead, and an unmatched path renders
`+error.svelte` in the browser, still with a 404.

shadcn-svelte is not a dependency —
its components are copied into
[`frontend/src/lib/components/ui/`](frontend/src/lib/components/ui/) and owned by
this project, so edit them freely. `Button` and `Card` are already there; add
more with:

```bash
npx shadcn-svelte@latest add dialog input form
```

[`components.json`](components.json) is pre-configured, so that works with no
`shadcn-svelte init` step. Icons are [Lucide](https://lucide.dev/icons), installed as `@lucide/svelte` —
**not** `lucide-react`, which is the wrong package here in the same way the
plain `shadcn` CLI is. Import them one per module, and kebab-case the name into
the path: the icon is that module's DEFAULT export, and `ArrowRight` lives at
`arrow-right` — `import ArrowRight from "@lucide/svelte/icons/arrow-right";`.
Never from the package root, which pulls the whole set into the bundle.

```ts
import ArrowRight from "@lucide/svelte/icons/arrow-right";
```

[`frontend/src/routes/+page.svelte`](frontend/src/routes/+page.svelte) already
does, and that is the form `npx shadcn-svelte@latest add` writes too.

Components import through the `$lib` alias
(`$lib/components/ui/button`, `$lib/utils`), which SvelteKit points at
`frontend/src/lib/` via `kit.files` in
[`vite.config.ts`](vite.config.ts) — there is no `paths` entry to keep in
sync, and adding one would just be a second answer that can disagree.

Colors come from the theme tokens in
[`frontend/src/index.css`](frontend/src/index.css) — see **Theming** below.

> `npm run typecheck` runs `svelte-kit sync && svelte-check`, not `tsc`. It
> checks both halves — the backend's TypeScript and the components — where
> `tsc` cannot read `.svelte` files at all. Keep it in the script: it is what
> makes the frontend unable to drift from the backend defs. `sync` regenerates
> `.svelte-kit/`, which `tsconfig.json` extends; `npm install` runs it too.

## Theming

Scaffolded with the **Mist** theme. Every color in the app comes from
the semantic tokens at the top of
[`frontend/src/index.css`](frontend/src/index.css) — `--primary`,
`--muted-foreground`, `--border`, the `--chart-*` ramp, the `--sidebar-*` set —
and every shadcn component reads those names, so editing one value rebrands
everything that uses it. Style with the token classes (`bg-primary`,
`text-muted-foreground`) rather than raw palette classes like `bg-gray-100`, or
the theme stops being one.

Tailwind v4 has no `tailwind.config.js`; that stylesheet *is* the config.

To swap the whole palette later:

```bash
npx shadcn@latest add https://ui.shadcn.com/r/themes/stone.json   # or any registry theme
```

This project was scaffolded with `--dark off`, so nothing switches
themes. The `.dark` block in the stylesheet is still there and still complete —
add `class="dark"` to `<html>` to see it, and wire that to a control (or the OS
setting) to turn it on for real.

## Add-ons

Xano SDK is composable with other `@xano-sdk/*` packages:

- **[`@xano-sdk/auth`](https://www.npmjs.com/package/@xano-sdk/auth)** — turnkey
  authentication (user/login/signup tables and endpoints). Install it with
  `npx xanosdk marketplace install @xano-sdk/auth`, then register it in
  `xano/index.ts`. Authentication only — **not** authorization: it has no
  roles, permissions, or route guards, and its tokens carry no role claim.
  Enforce roles off the caller's row with `@xano/sdk`: spread
  `...guard.role(userTable, "admin")` into the endpoint's stack.
- More `@xano-sdk/*` packages register onto the same workspace. This list
  does not update itself — run `npx xanosdk marketplace list` for the live
  catalogue, `npx xanosdk marketplace search <words>` to narrow it, and
  `npx xanosdk marketplace details <package>` to see what an add-on installs and
  how to register it. All three work before you log in.

None of these ship with the scaffold. Install one only when you need it — an
add-on you never register is weight in `package.json` for nothing.

<!-- BEGIN:xanosdk-built-with -->
<!-- xanosdk 1.0.6 — generated; edits inside this block are overwritten -->

## Built with

- [Xano](https://xano.com) hosts everything under [`xano/`](xano/): the database, APIs,
  auth, background tasks, realtime, file storage and AI agents. It runs on your machine as
  the Xano Engine and in the cloud from the same command. [Docs](https://docs.xano.com) ·
  [Community](https://community.xano.com)
- [Xano SDK](https://github.com/xano-sdk/sdk) is the TypeScript the backend is authored in.
  The [guides](https://github.com/xano-sdk/sdk/blob/main/guides/README.md) cover signing in
  and deploying, releasing to production, the typed frontend, and every CLI command.
<!-- END:xanosdk-built-with -->
