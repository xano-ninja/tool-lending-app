import { workflowTest, s, ref, c, withFilters, fl, type Value } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { flagOverdueFn } from "../functions/flag_overdue.js";
import { overdueTask } from "../tasks/overdue.js";
import { itemTable } from "../tables/item.js";
import { loanTable } from "../tables/loan.js";

const loan = (as: string, status: "out" | "returned", due: string | Value, borrower = "member") =>
  s.db.add({
    table: loanTable,
    row: {
      item_id: ref("item.id"),
      user_id: ref(`${borrower}.id`),
      start_date: "2020-01-01",
      due_date: due,
      status,
    },
    as,
  });

const member = (as: string) =>
  s.db.add({
    table: userTable,
    row: { name: as, email: `${as}@example.com`, password: "borrow123", role: "member" },
    as,
  });

const item = s.db.add({
  table: itemTable,
  row: { name: "Test saw", category: "power tools", status: "on_loan" },
  as: "item",
});

const reread = (as: string) => s.db.get({ table: loanTable, fieldValue: ref(`${as}.id`), as: `${as}_after` });

export const overdueTest = workflowTest({
  name: "overdue job flags only loans out past due",
  stack: [
    member("member"),
    item,
    loan("late", "out", "2020-01-08"),
    loan("on_time", "out", "2099-01-08"),
    loan("back", "returned", "2020-01-08"),
    s.function.run({ fn: flagOverdueFn, as: "result" }),
    s.expect.to_equal({ expr: ref("result.flagged"), value: c.int(1) }),
    reread("late"),
    s.expect.to_be_true({ expr: ref("late_after.overdue") }),
    reread("on_time"),
    s.expect.to_be_false({ expr: ref("on_time_after.overdue") }),
    reread("back"),
    s.expect.to_be_false({ expr: ref("back_after.overdue") }),
  ],
});

export const overdueDueTodayTest = workflowTest({
  name: "overdue job leaves a loan due today alone",
  stack: [
    member("member"),
    item,
    s.set_var("today", withFilters(c.now(), fl.epochms_date("Y-m-d", "UTC"))),
    loan("today_loan", "out", ref("today")),
    s.function.run({ fn: flagOverdueFn, as: "result" }),
    s.expect.to_equal({ expr: ref("result.flagged"), value: c.int(0) }),
    reread("today_loan"),
    s.expect.to_be_false({ expr: ref("today_loan_after.overdue") }),
  ],
});

export const overdueNoBorrowerTest = workflowTest({
  name: "overdue job flags past a borrower it cannot email",
  stack: [
    member("gone"),
    member("member"),
    item,
    loan("orphan", "out", "2020-01-08", "gone"),
    loan("late", "out", "2020-01-09"),
    s.db.del({ table: userTable, fieldValue: ref("gone.id") }),
    s.function.run({ fn: flagOverdueFn, as: "result" }),
    s.expect.to_equal({ expr: ref("result.flagged"), value: c.int(2) }),
    s.expect.to_be_less_than({ expr: ref("result.reminded"), value: c.int(2) }),
    reread("orphan"),
    s.expect.to_be_true({ expr: ref("orphan_after.overdue") }),
    reread("late"),
    s.expect.to_be_true({ expr: ref("late_after.overdue") }),
  ],
});

export const overdueTaskTest = workflowTest({
  name: "nightly task flags a late loan",
  stack: [
    member("member"),
    item,
    loan("late", "out", "2020-01-08"),
    s.task.call({ task: overdueTask }),
    reread("late"),
    s.expect.to_be_true({ expr: ref("late_after.overdue") }),
  ],
});
