import type { BadgeVariant } from "$lib/components/ui/badge";

export function today(): string {
  return isoDate(new Date());
}

export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

// Dates come back as YYYY-MM-DD; parsing them bare would read them as UTC midnight.
export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type LoanLike = { status: string; due_date: string };

export function isOverdue(loan: LoanLike): boolean {
  return loan.status === "out" && loan.due_date < today();
}

export function loanLabel(loan: LoanLike): string {
  if (isOverdue(loan)) return "overdue";
  return loan.status === "out" ? "checked out" : loan.status;
}

export function loanVariant(loan: LoanLike): BadgeVariant {
  if (isOverdue(loan)) return "destructive";
  if (loan.status === "out" || loan.status === "approved") return "default";
  if (loan.status === "requested") return "secondary";
  return "outline";
}

export function errorMessage(e: unknown, fallback: string): string {
  if (!(e instanceof Error)) return fallback;
  try {
    const body = JSON.parse(e.message);
    if (typeof body?.message === "string" && body.message) return body.message;
  } catch {
    // not a JSON error body
  }
  return e.message || fallback;
}
