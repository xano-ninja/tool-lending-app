import { workflowTest, s, ref, c, col, expr, out } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { aheadInLineAddon } from "../api/waitlist.js";
import { expireHoldsFn, notifyWaitlistFn, removeWaitlistEntryFn } from "../functions/waitlist_notice.js";
import { itemTable } from "../tables/item.js";
import { loanTable } from "../tables/loan.js";
import { waitlistTable } from "../tables/waitlist.js";

const LONG_AGO = 1577836800000;

const member = (as: string) =>
  s.db.add({
    table: userTable,
    row: { name: as, email: `${as}@example.com`, password: "borrow123", role: "member" },
    as,
  });

const entry = (as: string, joined: number, notified: "now" | number | null = null) =>
  s.db.add({
    table: waitlistTable,
    row: {
      item_id: ref("item.id"),
      user_id: ref(`${as}.id`),
      created_at: joined,
      notified_at: notified === "now" ? c.now() : notified,
    },
    as: `${as}_entry`,
  });

const fixtures = (status: "available" | "in_repair" = "available") => [
  s.db.add({
    table: itemTable,
    row: { name: "Test sander", category: "power tools", status },
    as: "item",
  }),
  member("first"),
  member("second"),
];

const notify = s.function.run({ fn: notifyWaitlistFn, input: { item_id: ref("item.id") }, as: "notice" });

const reread = (as: string) =>
  s.db.get({ table: waitlistTable, fieldValue: ref(`${as}_entry.id`), as: `${as}_after` });

export const holdFirstTest = workflowTest({
  name: "waitlist notice holds the item for the first in line",
  stack: [
    ...fixtures(),
    entry("first", 1000),
    entry("second", 2000),
    notify,
    s.expect.to_equal({ expr: ref("notice.notified_user_id"), value: ref("first.id") }),
    reread("first"),
    s.expect.to_not_be_null({ expr: ref("first_after.notified_at") }),
    reread("second"),
    s.expect.to_be_null({ expr: ref("second_after.notified_at") }),
  ],
});

export const holdTakenTest = workflowTest({
  name: "waitlist notice skips an item already held",
  stack: [
    ...fixtures(),
    entry("first", 1000, "now"),
    entry("second", 2000),
    notify,
    s.expect.to_be_null({ expr: ref("notice.notified_user_id") }),
    reread("second"),
    s.expect.to_be_null({ expr: ref("second_after.notified_at") }),
  ],
});

export const holdRepairTest = workflowTest({
  name: "waitlist notice skips an item in repair",
  stack: [
    ...fixtures("in_repair"),
    entry("first", 1000),
    notify,
    s.expect.to_be_null({ expr: ref("notice.notified_user_id") }),
  ],
});

export const holdPromisedTest = workflowTest({
  name: "waitlist notice skips an item with an approved loan",
  stack: [
    ...fixtures(),
    entry("first", 1000),
    s.db.add({
      table: loanTable,
      row: {
        item_id: ref("item.id"),
        user_id: ref("second.id"),
        start_date: "2026-11-01",
        due_date: "2026-11-08",
        status: "approved",
      },
    }),
    notify,
    s.expect.to_be_null({ expr: ref("notice.notified_user_id") }),
  ],
});

export const expireHoldTest = workflowTest({
  name: "lapsed hold passes the item to the next in line",
  stack: [
    ...fixtures(),
    entry("first", 1000, LONG_AGO),
    entry("second", 2000),
    s.function.run({ fn: expireHoldsFn, as: "result" }),
    s.expect.to_equal({ expr: ref("result.expired"), value: c.int(1) }),
    reread("first"),
    s.expect.to_be_null({ expr: ref("first_after") }),
    reread("second"),
    s.expect.to_not_be_null({ expr: ref("second_after.notified_at") }),
  ],
});

export const expireFreshTest = workflowTest({
  name: "a hold inside its window is kept",
  stack: [
    ...fixtures(),
    entry("first", 1000, "now"),
    entry("second", 2000),
    s.function.run({ fn: expireHoldsFn, as: "result" }),
    reread("first"),
    s.expect.to_not_be_null({ expr: ref("first_after") }),
    reread("second"),
    s.expect.to_be_null({ expr: ref("second_after.notified_at") }),
  ],
});

const position = (as: string) =>
  s.db.query({
    table: waitlistTable,
    where: expr(col("id"), "=", ref(`${as}_entry.id`)),
    addon: [
      {
        addon: aheadInLineAddon,
        as: "ahead",
        input: { item_id: out("item_id"), created_at: out("created_at") },
      },
    ],
    returnType: "single",
    as: `${as}_position`,
  });

export const aheadInLineTest = workflowTest({
  name: "waitlist position counts only earlier entries",
  stack: [
    ...fixtures(),
    entry("first", 1000),
    entry("second", 2000),
    position("first"),
    s.expect.to_equal({ expr: ref("first_position.ahead"), value: c.int(0) }),
    position("second"),
    s.expect.to_equal({ expr: ref("second_position.ahead"), value: c.int(1) }),
  ],
});

export const removeHeldTest = workflowTest({
  name: "removing a held entry passes the item on",
  stack: [
    ...fixtures(),
    entry("first", 1000, "now"),
    entry("second", 2000),
    s.function.run({ fn: removeWaitlistEntryFn, input: { entry_id: ref("first_entry.id") } }),
    reread("first"),
    s.expect.to_be_null({ expr: ref("first_after") }),
    reread("second"),
    s.expect.to_not_be_null({ expr: ref("second_after.notified_at") }),
  ],
});

export const removeMissingTest = workflowTest({
  name: "removing an unknown waitlist entry is refused",
  stack: [
    s.expect.to_throw({
      body: [s.function.run({ fn: removeWaitlistEntryFn, input: { entry_id: c.int(999999) } })],
      exception: c.text("Waitlist entry not found"),
    }),
  ],
});
