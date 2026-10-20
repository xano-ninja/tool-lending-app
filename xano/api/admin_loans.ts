import { query, input, inp, col, cmp, expr, s, ref, c, guard, withFilters, fl } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { checkoutLoanFn, returnLoanFn, transitionLoanFn } from "../functions/loan_transitions.js";
import { notifyWaitlistFn } from "../functions/waitlist_notice.js";
import { itemTable } from "../tables/item.js";
import { LOAN_STATUSES, loanTable } from "../tables/loan.js";
import { api } from "./group.js";

export const loansQuery = query({
  name: "loans",
  verb: "GET",
  apiGroup: api,
  auth: userTable,
  input: { status: input.enum([...LOAN_STATUSES, "overdue"]) },
  stack: [
    ...guard.role(userTable, "admin"),
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

function transition(
  action: string,
  from: (typeof LOAN_STATUSES)[number],
  to: (typeof LOAN_STATUSES)[number],
) {
  return query({
    name: `loans/{id}/${action}`,
    verb: "PATCH",
    apiGroup: api,
    auth: userTable,
    input: { id: input.int({ required: true }) },
    stack: [
      ...guard.role(userTable, "admin"),
      s.function.run({
        fn: transitionLoanFn,
        input: { loan_id: inp("id"), from: c.text(from), to: c.text(to) },
        as: "updated",
      }),
    ],
    response: ref("updated"),
  });
}

export const approveLoanQuery = transition("approve", "requested", "approved");

export const rejectLoanQuery = query({
  name: "loans/{id}/reject",
  verb: "PATCH",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    ...guard.role(userTable, "admin"),
    s.function.run({
      fn: transitionLoanFn,
      input: { loan_id: inp("id"), from: c.text("requested"), to: c.text("rejected") },
      as: "updated",
    }),
    s.function.run({ fn: notifyWaitlistFn, input: { item_id: ref("updated.item_id") } }),
  ],
  response: ref("updated"),
});

export const checkoutLoanQuery = query({
  name: "loans/{id}/checkout",
  verb: "PATCH",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    ...guard.role(userTable, "admin"),
    s.function.run({ fn: checkoutLoanFn, input: { loan_id: inp("id") }, as: "updated" }),
  ],
  response: ref("updated"),
});

export const returnLoanQuery = query({
  name: "loans/{id}/return",
  verb: "PATCH",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    ...guard.role(userTable, "admin"),
    s.function.run({ fn: returnLoanFn, input: { loan_id: inp("id") }, as: "result" }),
  ],
  response: ref("result.loan"),
});
