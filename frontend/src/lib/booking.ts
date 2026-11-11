import type { ItemDetail } from "$lib/api";
import { addDays, isOverdue } from "$lib/format";

export type Booking = ItemDetail["booked"][number];

// Mirrors find_booking_clash: ranges are inclusive, and an overdue loan holds
// the item until it is returned.
export function clash(booked: Booking[], start: string, due: string): Booking | undefined {
  return booked.find((b) => b.start_date <= due && (isOverdue(b) || b.due_date >= start));
}

export function isBooked(booked: Booking[], day: string): boolean {
  return clash(booked, day, day) !== undefined;
}

export function firstFree(booked: Booking[], from: string, days: number): string | null {
  let start = from;
  for (let i = 0; i <= booked.length; i++) {
    const hit = clash(booked, start, addDays(start, days - 1));
    if (!hit) return start;
    if (isOverdue(hit)) return null;
    start = addDays(hit.due_date, 1);
  }
  return null;
}
