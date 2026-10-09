import { getToken, logout, me, type Me } from "./api";

export const session = $state<{ user: Me | null; ready: boolean }>({ user: null, ready: false });

export async function loadSession() {
  if (!getToken()) {
    session.user = null;
    session.ready = true;
    return;
  }
  try {
    session.user = await me();
  } catch {
    logout();
    session.user = null;
  } finally {
    session.ready = true;
  }
}

export function signOut() {
  logout();
  session.user = null;
}
