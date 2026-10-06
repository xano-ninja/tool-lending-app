// There is no server. The backend is Xano, reached through $lib/api.ts,
// and `npm run xano:deploy:ephemeral` ships this app to a static host with no runtime.
//
// prerender: true — every route is rendered to its own HTML file AT BUILD TIME
// and served as a real document. That is what makes each page load as itself
// rather than as an empty shell that fills in afterwards.
//
// Prerendering IS server-rendering, just at build time rather than per request.
// So module-scope `window`/`document` access now fails the BUILD instead of the
// browser — which is the better place to find out. Reach for browser globals
// inside onMount, or guard with `import { browser } from "$app/environment"`.
//
// A route with dynamic segments (e.g. /posts/[id]) cannot be prerendered unless
// the build knows which ones exist, so THE BUILD FAILS and names the route.
// In that route's +page.ts, either list the ids (only those get a page):
//
//   export const entries = () => [{ id: "1" }, { id: "2" }];
//
// or, for rows created at runtime, render it in the browser instead:
//
//   export const prerender = false;
//
// Inherited by every route below this one.
export const prerender = true;
