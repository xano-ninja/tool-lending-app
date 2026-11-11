import { defineFunction, input, inp, col, cmp, expr, or, s, ref, c, guard, withFilters, fl } from "@xano/sdk";
import { BOOKED_LOAN_STATUSES } from "./booking.js";
import { conditionNoteTable } from "../tables/condition_note.js";
import { itemTable } from "../tables/item.js";
import { loanTable } from "../tables/loan.js";
import { waitlistTable } from "../tables/waitlist.js";

export const itemDetailFn = defineFunction({
  name: "item_detail",
  description: "One item with its current loan, upcoming bookings, waitlist count, condition notes and loan history.",
  input: { item_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: itemTable, fieldValue: inp("item_id"), as: "item" }),
    guard.found("item", { message: "Item not found." }),
    s.db.query({
      table: loanTable,
      where: [
        expr(col("item_id"), "=", inp("item_id")),
        cmp(col("status"), "in", c.array([...BOOKED_LOAN_STATUSES])),
      ],
      sort: [{ sortBy: "start_date", dir: "asc" }],
      output: ["id", "start_date", "due_date", "status"],
      returnType: "single",
      as: "current_loan",
    }),
    s.set_var("today", withFilters(c.now(), fl.epochms_date("Y-m-d", "UTC"))),
    s.db.query({
      table: loanTable,
      where: [
        expr(col("item_id"), "=", inp("item_id")),
        cmp(col("status"), "in", c.array([...BOOKED_LOAN_STATUSES])),
        or(expr(col("due_date"), ">=", ref("today")), expr(col("status"), "=", c.text("out"))),
      ],
      sort: [{ sortBy: "start_date", dir: "asc" }],
      output: ["id", "start_date", "due_date", "status", "overdue"],
      as: "booked",
    }),
    s.db.query({
      table: waitlistTable,
      where: expr(col("item_id"), "=", inp("item_id")),
      returnType: "count",
      as: "waitlist_count",
    }),
    s.db.query({
      table: conditionNoteTable,
      where: expr(col("item_id"), "=", inp("item_id")),
      sort: [{ sortBy: "created_at", dir: "desc" }],
      output: ["id", "created_at", "note"],
      as: "notes",
    }),
    s.db.query({
      table: loanTable,
      where: [
        expr(col("item_id"), "=", inp("item_id")),
        cmp(col("status"), "in", c.array(["out", "returned"])),
      ],
      sort: [{ sortBy: "start_date", dir: "desc" }],
      output: ["id", "start_date", "due_date", "returned_at", "status"],
      as: "history",
    }),
  ],
  response: {
    item: ref("item"),
    current_loan: ref("current_loan"),
    booked: ref("booked"),
    waitlist_count: ref("waitlist_count"),
    notes: ref("notes"),
    history: ref("history"),
  },
});
