// The one contract: endpoint paths and request types come from the generated
// route manifest, and response *types* from your xanosdk query defs. Never
// hand-type a URL or a request body: change a def and everything here follows.
//
// Keep the backend out of the browser bundle:
//   • Paths and verbs: `routePath()` / `ROUTES` from xano/routes.gen.ts, plain data
//     generated from the defs (`npm run xano:routes`; dev, build and typecheck
//     regenerate it). Never import a def as a VALUE for its getPath()/verb:
//     its s.*/c.* factory calls run at module load, so one import pulls in the
//     backend graph it references and the SDK runtime that builds it.
//   • Request types: `RouteInputs["<VERB> <name>"]` from the same file
//     (`ChannelInputs` / `MessageInputs` for realtime), types only. For
//     runtime validation, `npx xanosdk marketplace install zod` adds zod
//     schemas under the same keys.
//   • Response types: `import type` the def. InferResponse erases to nothing.
//

import type { InferResponse } from "@xano/sdk";
import type { itemQuery, itemsQuery } from "../../../xano/api/items.js";
import type { loginQuery, meQuery } from "@xano-sdk/auth";
import { ROUTES, routePath, type RouteInputs } from "../../../xano/routes.gen.js";

// Types the global the deploy injects, for every file in the project: the
// documented `window.XANO_HOST` reads compile anywhere. `undefined` in dev.
declare global {
  interface Window {
    XANO_HOST?: string;
  }
}

/**
 * The deployed Xano backend's base URL. Injected as `window.XANO_HOST` by
 * `npx xanosdk deploy <entry> --static <dir>`, or read from `VITE_XANO_HOST` in dev.
 * Empty string when neither is set (the UI runs with no backend).
 */
export const XANO_HOST: string =
  (typeof window !== "undefined" && window.XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

export type ItemFilters = RouteInputs["GET items"];
export type Item = InferResponse<typeof itemsQuery>[number];

export async function listItems(filters: ItemFilters = {}): Promise<Item[]> {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  const qs = params.size ? `?${params}` : "";
  const res = await fetch(XANO_HOST + routePath("GET items") + qs, {
    method: ROUTES["GET items"].verb,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type ItemDetail = InferResponse<typeof itemQuery>;
export type Credentials = RouteInputs["POST auth/login"];
export type SignupInput = RouteInputs["POST auth/signup"];
export type Session = InferResponse<typeof loginQuery>;
export type Me = NonNullable<InferResponse<typeof meQuery>>;

const TOKEN_KEY = "token";

export function getToken(): string | null {
  return typeof localStorage === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  route: keyof typeof ROUTES,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(XANO_HOST + path, {
    method: ROUTES[route].verb,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function authenticate(session: Promise<Session>): Promise<Session> {
  const s = await session;
  localStorage.setItem(TOKEN_KEY, s.authToken);
  return s;
}

export function login(input: Credentials) {
  return authenticate(request("POST auth/login", routePath("POST auth/login"), input));
}

export function signup(input: SignupInput) {
  return authenticate(request("POST auth/signup", routePath("POST auth/signup"), input));
}

export function me() {
  return request<Me>("GET auth/me", routePath("GET auth/me"));
}

export function getItem(id: number) {
  return request<ItemDetail>("GET items/{id}", routePath("GET items/{id}", { id }));
}

export function createItem(input: RouteInputs["POST items"]) {
  return request<ItemDetail>("POST items", routePath("POST items"), input);
}

export function updateItem(id: number, input: Omit<RouteInputs["PATCH items/{id}"], "id">) {
  return request<ItemDetail>(
    "PATCH items/{id}",
    routePath("PATCH items/{id}", { id }),
    input,
  );
}
