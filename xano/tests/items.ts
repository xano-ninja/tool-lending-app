import { workflowTest, s, ref, c } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemDetailFn } from "../functions/item_detail.js";
import { listItemsFn } from "../functions/list_items.js";
import { updateItemFn } from "../functions/update_item.js";
import { conditionNoteTable } from "../tables/condition_note.js";
import { ITEM_STATUSES, itemTable } from "../tables/item.js";
import { LOAN_STATUSES, loanTable } from "../tables/loan.js";
import { waitlistTable } from "../tables/waitlist.js";

const item = (as: string, category: string, status: (typeof ITEM_STATUSES)[number]) =>
  s.db.add({ table: itemTable, row: { name: as, category, status }, as });

export const listItemsFilterTest = workflowTest({
  name: "items list filters by category and status, sorted by name",
  stack: [
    item("saw", "power tools", "available"),
    item("drill", "power tools", "available"),
    item("sander", "power tools", "in_repair"),
    item("ladder", "access", "available"),
    s.function.run({
      fn: listItemsFn,
      input: { category: c.text("power tools"), status: c.text("available") },
      as: "rows",
    }),
    s.expect.to_equal({ expr: ref("rows.0.name"), value: c.text("drill") }),
    s.expect.to_equal({ expr: ref("rows.1.name"), value: c.text("saw") }),
    s.expect.to_not_be_defined({ expr: ref("rows.2") }),
  ],
});

const borrower = s.db.add({
  table: userTable,
  row: { name: "zoe", email: "zoe@example.com", password: "borrow123", role: "member" },
  as: "zoe",
});

const loan = (as: string, start: string, due: string, status: (typeof LOAN_STATUSES)[number]) =>
  s.db.add({
    table: loanTable,
    row: { item_id: ref("drill.id"), user_id: ref("zoe.id"), start_date: start, due_date: due, status },
    as,
  });

export const itemDetailTest = workflowTest({
  name: "item detail shows current loan, waitlist, notes and history",
  stack: [
    borrower,
    item("drill", "power tools", "on_loan"),
    item("saw", "power tools", "available"),
    loan("first", "2026-01-01", "2026-01-08", "returned"),
    loan("second", "2026-02-01", "2026-02-08", "returned"),
    loan("current", "2026-03-01", "2026-03-08", "out"),
    loan("asked", "2026-04-01", "2026-04-08", "requested"),
    s.db.add({ table: waitlistTable, row: { item_id: ref("drill.id"), user_id: ref("zoe.id") } }),
    s.db.add({ table: waitlistTable, row: { item_id: ref("saw.id"), user_id: ref("zoe.id") } }),
    s.db.add({
      table: conditionNoteTable,
      row: { item_id: ref("drill.id"), user_id: ref("zoe.id"), note: "chuck slips" },
    }),
    s.function.run({ fn: itemDetailFn, input: { item_id: ref("drill.id") }, as: "detail" }),
    s.expect.to_equal({ expr: ref("detail.item.id"), value: ref("drill.id") }),
    s.expect.to_equal({ expr: ref("detail.current_loan.id"), value: ref("current.id") }),
    s.expect.to_equal({ expr: ref("detail.waitlist_count"), value: c.int(1) }),
    s.expect.to_equal({ expr: ref("detail.notes.0.note"), value: c.text("chuck slips") }),
    s.expect.to_not_be_defined({ expr: ref("detail.notes.1") }),
    s.expect.to_equal({ expr: ref("detail.history.0.id"), value: ref("current.id") }),
    s.expect.to_equal({ expr: ref("detail.history.1.id"), value: ref("second.id") }),
    s.expect.to_equal({ expr: ref("detail.history.2.id"), value: ref("first.id") }),
    s.expect.to_not_be_defined({ expr: ref("detail.history.3") }),
  ],
});

export const itemDetailIdleTest = workflowTest({
  name: "item detail is empty for an item never lent",
  stack: [
    item("ladder", "access", "available"),
    s.function.run({ fn: itemDetailFn, input: { item_id: ref("ladder.id") }, as: "detail" }),
    s.expect.to_be_null({ expr: ref("detail.current_loan") }),
    s.expect.to_equal({ expr: ref("detail.waitlist_count"), value: c.int(0) }),
    s.expect.to_be_empty({ expr: ref("detail.notes") }),
    s.expect.to_be_empty({ expr: ref("detail.history") }),
  ],
});

export const itemDetailMissingTest = workflowTest({
  name: "item detail refuses an unknown item",
  stack: [
    s.expect.to_throw({
      body: [s.function.run({ fn: itemDetailFn, input: { item_id: c.int(999999) } })],
      exception: c.text("Item not found"),
    }),
  ],
});

const waiting = [
  borrower,
  s.db.add({
    table: waitlistTable,
    row: { item_id: ref("drill.id"), user_id: ref("zoe.id"), created_at: 1000 },
    as: "entry",
  }),
];

const reread = s.db.get({ table: waitlistTable, fieldValue: ref("entry.id"), as: "entry_after" });

export const updateItemKeepsTest = workflowTest({
  name: "item update keeps the fields it is not given",
  stack: [
    s.db.add({
      table: itemTable,
      row: { name: "drill", category: "power tools", description: "18V", status: "available" },
      as: "drill",
    }),
    s.function.run({
      fn: updateItemFn,
      input: { item_id: ref("drill.id"), description: c.text("18V, two batteries") },
      as: "updated",
    }),
    s.expect.to_equal({ expr: ref("updated.name"), value: c.text("drill") }),
    s.expect.to_equal({ expr: ref("updated.category"), value: c.text("power tools") }),
    s.expect.to_equal({ expr: ref("updated.description"), value: c.text("18V, two batteries") }),
    s.expect.to_equal({ expr: ref("updated.status"), value: c.text("available") }),
  ],
});

export const updateItemRepairedTest = workflowTest({
  name: "item back from repair notifies the waitlist",
  stack: [
    item("drill", "power tools", "in_repair"),
    ...waiting,
    s.function.run({
      fn: updateItemFn,
      input: { item_id: ref("drill.id"), status: c.text("available") },
      as: "updated",
    }),
    s.expect.to_equal({ expr: ref("updated.status"), value: c.text("available") }),
    reread,
    s.expect.to_not_be_null({ expr: ref("entry_after.notified_at") }),
  ],
});

export const updateItemStillAvailableTest = workflowTest({
  name: "item edit that stays available leaves the waitlist alone",
  stack: [
    item("drill", "power tools", "available"),
    ...waiting,
    s.function.run({ fn: updateItemFn, input: { item_id: ref("drill.id"), name: c.text("Drill") } }),
    reread,
    s.expect.to_be_null({ expr: ref("entry_after.notified_at") }),
  ],
});

export const updateItemMissingTest = workflowTest({
  name: "item update refuses an unknown item",
  stack: [
    s.expect.to_throw({
      body: [s.function.run({ fn: updateItemFn, input: { item_id: c.int(999999), name: c.text("x") } })],
      exception: c.text("Item not found"),
    }),
  ],
});
