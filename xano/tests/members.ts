import { workflowTest, s, ref, c } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { listMembersFn, memberHistoryFn } from "../functions/members.js";
import { itemTable } from "../tables/item.js";
import { loanTable } from "../tables/loan.js";
import { waitlistTable } from "../tables/waitlist.js";

const member = (as: string) =>
  s.db.add({
    table: userTable,
    row: { name: as, email: `${as}@example.com`, password: "borrow123", role: "member" },
    as,
  });

const loan = (as: string, user: string, start: string, due: string) =>
  s.db.add({
    table: loanTable,
    row: {
      item_id: ref("item.id"),
      user_id: ref(`${user}.id`),
      start_date: start,
      due_date: due,
      status: "returned",
    },
    as,
  });

const fixtures = [
  member("zoe"),
  member("adam"),
  s.db.add({
    table: itemTable,
    row: { name: "Test drill", category: "power tools", status: "available" },
    as: "item",
  }),
];

const history = (user: string) =>
  s.function.run({ fn: memberHistoryFn, input: { user_id: ref(`${user}.id`) }, as: "history" });

export const membersSortedTest = workflowTest({
  name: "members list is sorted by name without passwords",
  stack: [
    ...fixtures,
    s.function.run({ fn: listMembersFn, as: "members" }),
    s.expect.to_equal({ expr: ref("members.0.name"), value: c.text("adam") }),
    s.expect.to_equal({ expr: ref("members.1.name"), value: c.text("zoe") }),
    s.expect.to_not_be_defined({ expr: ref("members.0.password") }),
  ],
});

export const memberLoansTest = workflowTest({
  name: "member history lists only that member's loans, newest first",
  stack: [
    ...fixtures,
    loan("older", "zoe", "2026-01-01", "2026-01-08"),
    loan("newer", "zoe", "2026-03-01", "2026-03-08"),
    loan("other", "adam", "2026-02-01", "2026-02-08"),
    history("zoe"),
    s.expect.to_equal({ expr: ref("history.member.id"), value: ref("zoe.id") }),
    s.expect.to_not_be_defined({ expr: ref("history.member.password") }),
    s.expect.to_equal({ expr: ref("history.loans.0.id"), value: ref("newer.id") }),
    s.expect.to_equal({ expr: ref("history.loans.0.item_name"), value: c.text("Test drill") }),
    s.expect.to_equal({ expr: ref("history.loans.1.id"), value: ref("older.id") }),
    s.expect.to_not_be_defined({ expr: ref("history.loans.2") }),
  ],
});

export const memberWaitlistTest = workflowTest({
  name: "member history includes the member's waitlist",
  stack: [
    ...fixtures,
    s.db.add({
      table: waitlistTable,
      row: { item_id: ref("item.id"), user_id: ref("adam.id"), created_at: 1000 },
    }),
    s.db.add({
      table: waitlistTable,
      row: { item_id: ref("item.id"), user_id: ref("zoe.id"), created_at: 2000 },
      as: "entry",
    }),
    history("zoe"),
    s.expect.to_equal({ expr: ref("history.waitlist.0.id"), value: ref("entry.id") }),
    s.expect.to_equal({ expr: ref("history.waitlist.0.item_name"), value: c.text("Test drill") }),
    s.expect.to_equal({ expr: ref("history.waitlist.0.ahead"), value: c.int(1) }),
    s.expect.to_not_be_defined({ expr: ref("history.waitlist.1") }),
  ],
});

export const memberMissingTest = workflowTest({
  name: "member history refuses an unknown member",
  stack: [
    s.expect.to_throw({
      body: [s.function.run({ fn: memberHistoryFn, input: { user_id: c.int(999999) } })],
      exception: c.text("Member not found"),
    }),
  ],
});
