import { defineFunction, input, inp, col, cmp, expr, s, ref, c, withFilters, fl } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemTable } from "../tables/item.js";
import { LOAN_STATUSES, loanTable } from "../tables/loan.js";

export const listLoansFn = defineFunction({
  name: "list_loans",
  description: "Loans by status, soonest due first. Overdue means out and past its due date.",
  input: { status: input.enum([...LOAN_STATUSES, "overdue"]) },
  stack: [
    s.set_var("status_filter", inp("status")),
    s.set_var("due_before", c.text("")),
    s.conditional({
      when: expr(inp("status"), "=", c.text("overdue")),
      then: [
        s.update_var("status_filter", c.text("out")),
        s.update_var("due_before", withFilters(c.now(), fl.epochms_date("Y-m-d", "UTC"))),
      ],
    }),
    s.db.query({
      table: loanTable,
      where: [
        cmp(col("status"), "=", ref("status_filter"), { ignoreEmpty: true }),
        cmp(col("due_date"), "<", ref("due_before"), { ignoreEmpty: true }),
      ],
      bind: [
        {
          table: itemTable,
          as: "item_row",
          join: "left",
          where: expr(col("item_id"), "=", col("item_row.id")),
        },
        {
          table: userTable,
          as: "user_row",
          join: "left",
          where: expr(col("user_id"), "=", col("user_row.id")),
        },
      ],
      eval: [
        { name: "item_row.name", as: "item_name" },
        { name: "user_row.name", as: "user_name" },
      ],
      sort: [{ sortBy: "due_date", dir: "asc" }],
      as: "loans",
    }),
  ],
  response: ref("loans"),
});
