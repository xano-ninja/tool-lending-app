import { workflowTest, s, ref, c } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { flagOverdueFn } from "../functions/flag_overdue.js";
import { itemTable } from "../tables/item.js";
import { loanTable } from "../tables/loan.js";

const loan = (as: string, status: "out" | "returned", due: string) =>
  s.db.add({
    table: loanTable,
    row: {
      item_id: ref("item.id"),
      user_id: ref("member.id"),
      start_date: "2020-01-01",
      due_date: due,
      status,
    },
    as,
  });

export const overdueTest = workflowTest({
  name: "overdue job flags only loans out past due",
  stack: [
    s.db.add({
      table: userTable,
      row: { name: "Test member", email: "member@example.com", password: "borrow123", role: "member" },
      as: "member",
    }),
    s.db.add({
      table: itemTable,
      row: { name: "Test saw", category: "power tools", status: "on_loan" },
      as: "item",
    }),
    loan("late", "out", "2020-01-08"),
    loan("on_time", "out", "2099-01-08"),
    loan("back", "returned", "2020-01-08"),
    s.function.run({ fn: flagOverdueFn, as: "result" }),
    s.expect.to_equal({ expr: ref("result.flagged"), value: c.int(1) }),
    s.db.get({ table: loanTable, fieldValue: ref("late.id"), as: "late_after" }),
    s.expect.to_be_true({ expr: ref("late_after.overdue") }),
    s.db.get({ table: loanTable, fieldValue: ref("on_time.id"), as: "on_time_after" }),
    s.expect.to_be_false({ expr: ref("on_time_after.overdue") }),
    s.db.get({ table: loanTable, fieldValue: ref("back.id"), as: "back_after" }),
    s.expect.to_be_false({ expr: ref("back_after.overdue") }),
  ],
});
