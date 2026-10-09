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
import type { myLoansQuery, requestLoanQuery } from "../../../xano/api/loans.js";
import type { addNoteQuery } from "../../../xano/api/notes.js";
import type {
  joinWaitlistQuery,
  leaveWaitlistQuery,
  myWaitlistQuery,
} from "../../../xano/api/waitlist.js";
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
export type ConditionNote = InferResponse<typeof addNoteQuery>;
export type Loan = InferResponse<typeof requestLoanQuery>;
export type LoanRequest = RouteInputs["POST loans"];
export type MyLoan = Omit<InferResponse<typeof myLoansQuery>[number], "item_name"> & {
  item_name: string | null;
};
export type WaitlistEntry = InferResponse<typeof joinWaitlistQuery>;
export type MyWaitlistEntry = Omit<InferResponse<typeof myWaitlistQuery>[number], "item_name"> & {
  item_name: string | null;
};
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
  return request<Item>("POST items", routePath("POST items"), input);
}

export function updateItem(id: number, input: Omit<RouteInputs["PATCH items/{id}"], "id">) {
  return request<Item>(
    "PATCH items/{id}",
    routePath("PATCH items/{id}", { id }),
    input,
  );
}

export function requestLoan(input: LoanRequest) {
  return request<Loan>("POST loans", routePath("POST loans"), input);
}

export function myLoans() {
  return request<MyLoan[]>("GET me/loans", routePath("GET me/loans"));
}

export function joinWaitlist(id: number) {
  return request<WaitlistEntry>(
    "POST items/{id}/waitlist",
    routePath("POST items/{id}/waitlist", { id }),
  );
}

export function leaveWaitlist(id: number) {
  return request<InferResponse<typeof leaveWaitlistQuery>>(
    "DELETE items/{id}/waitlist",
    routePath("DELETE items/{id}/waitlist", { id }),
  );
}

export function myWaitlist() {
  return request<MyWaitlistEntry[]>("GET me/waitlist", routePath("GET me/waitlist"));
}

export function addNote(id: number, input: Omit<RouteInputs["POST items/{id}/notes"], "id">) {
  return request<ConditionNote>(
    "POST items/{id}/notes",
    routePath("POST items/{id}/notes", { id }),
    input,
  );
}
