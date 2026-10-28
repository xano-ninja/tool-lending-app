import { workflowTest, s, ref, c } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { expireHoldsFn, joinWaitlistFn, leaveWaitlistFn, notifyWaitlistFn, removeWaitlistEntryFn } from "../functions/waitlist_notice.js";
import { itemWaitlistFn, memberWaitlistFn } from "../functions/waitlist_queue.js";
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

const fixtures = (status: "available" | "in_repair" | "retired" = "available") => [
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

export const expireManyTest = workflowTest({
  name: "every lapsed hold in a run is passed on",
  stack: [
    ...fixtures(),
    s.db.add({
      table: itemTable,
      row: { name: "Test ladder", category: "ladders", status: "available" },
      as: "ladder",
    }),
    entry("first", 1000, LONG_AGO),
    entry("second", 2000),
    s.db.add({
      table: waitlistTable,
      row: { item_id: ref("ladder.id"), user_id: ref("second.id"), created_at: 1000, notified_at: LONG_AGO },
      as: "ladder_entry",
    }),
    s.db.add({
      table: waitlistTable,
      row: { item_id: ref("ladder.id"), user_id: ref("first.id"), created_at: 2000 },
      as: "ladder_next_entry",
    }),
    s.function.run({ fn: expireHoldsFn, as: "result" }),
    s.expect.to_equal({ expr: ref("result.expired"), value: c.int(2) }),
    reread("second"),
    s.expect.to_not_be_null({ expr: ref("second_after.notified_at") }),
    reread("ladder_next"),
    s.expect.to_not_be_null({ expr: ref("ladder_next_after.notified_at") }),
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

const queue = (as: string) =>
  s.function.run({ fn: memberWaitlistFn, input: { user_id: ref(`${as}.id`) }, as: `${as}_queue` });

export const aheadInLineTest = workflowTest({
  name: "waitlist position counts only earlier entries",
  stack: [
    ...fixtures(),
    entry("first", 1000),
    entry("second", 2000),
    queue("first"),
    s.expect.to_equal({ expr: ref("first_queue.0.ahead"), value: c.int(0) }),
    queue("second"),
    s.expect.to_equal({ expr: ref("second_queue.0.ahead"), value: c.int(1) }),
    s.expect.to_equal({ expr: ref("second_queue.0.item_name"), value: c.text("Test sander") }),
  ],
});

export const itemQueueTest = workflowTest({
  name: "item waitlist lists members in the order they joined",
  stack: [
    ...fixtures(),
    s.db.add({
      table: itemTable,
      row: { name: "Test ladder", category: "ladders", status: "available" },
      as: "ladder",
    }),
    entry("first", 2000),
    entry("second", 1000),
    s.db.add({
      table: waitlistTable,
      row: { item_id: ref("ladder.id"), user_id: ref("first.id"), created_at: 500 },
    }),
    s.function.run({ fn: itemWaitlistFn, input: { item_id: ref("item.id") }, as: "line" }),
    s.expect.to_equal({ expr: ref("line.0.user_name"), value: c.text("second") }),
    s.expect.to_equal({ expr: ref("line.1.user_name"), value: c.text("first") }),
    s.expect.to_not_be_defined({ expr: ref("line.2") }),
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

export const leaveHeldTest = workflowTest({
  name: "leaving with a hold passes the item on",
  stack: [
    ...fixtures(),
    entry("first", 1000, "now"),
    entry("second", 2000),
    s.function.run({ fn: leaveWaitlistFn, input: { item_id: ref("item.id"), user_id: ref("first.id") } }),
    reread("first"),
    s.expect.to_be_null({ expr: ref("first_after") }),
    reread("second"),
    s.expect.to_not_be_null({ expr: ref("second_after.notified_at") }),
  ],
});

export const leaveNotWaitingTest = workflowTest({
  name: "leaving a waitlist you are not on is refused",
  stack: [
    s.expect.to_throw({
      body: [
        ...fixtures(),
        entry("first", 1000),
        s.function.run({ fn: leaveWaitlistFn, input: { item_id: ref("item.id"), user_id: ref("second.id") } }),
      ],
      exception: c.text("You are not on the waitlist"),
    }),
  ],
});

const join = (as: string) =>
  s.function.run({ fn: joinWaitlistFn, input: { item_id: ref("item.id"), user_id: ref(`${as}.id`) }, as: `${as}_joined` });

export const joinTest = workflowTest({
  name: "joining puts the member at the back of the line",
  stack: [
    ...fixtures(),
    entry("first", 1000),
    join("second"),
    s.expect.to_equal({ expr: ref("second_joined.user_id"), value: ref("second.id") }),
    s.expect.to_be_null({ expr: ref("second_joined.notified_at") }),
    s.function.run({ fn: memberWaitlistFn, input: { user_id: ref("second.id") }, as: "second_queue" }),
    s.expect.to_equal({ expr: ref("second_queue.0.ahead"), value: c.int(1) }),
  ],
});

export const joinTwiceTest = workflowTest({
  name: "joining a waitlist twice is refused",
  stack: [
    s.expect.to_throw({
      body: [...fixtures(), entry("first", 1000), join("first")],
      exception: c.text("You are already on the waitlist"),
    }),
  ],
});

export const joinRetiredTest = workflowTest({
  name: "joining the waitlist of a retired item is refused",
  stack: [
    s.expect.to_throw({
      body: [...fixtures("retired"), join("first")],
      exception: c.text("This item is retired"),
    }),
  ],
});
