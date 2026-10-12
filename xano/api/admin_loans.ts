import { query, input, inp, col, cmp, expr, s, ref, c, guard, obj, withFilters, fl } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
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
      s.db.get({ table: loanTable, fieldValue: inp("id"), as: "loan" }),
      guard.found("loan", { message: "Loan not found." }),
      s.precondition({
        expr: expr(ref("loan.status"), "=", c.text(from)),
        error_type: "badrequest",
        error: c.text(`Loan is not ${from}.`),
      }),
      s.db.patch({
        table: loanTable,
        fieldValue: inp("id"),
        data: obj({ status: c.text(to) }),
        as: "updated",
      }),
    ],
    response: ref("updated"),
  });
}

export const approveLoanQuery = transition("approve", "requested", "approved");
export const rejectLoanQuery = transition("reject", "requested", "rejected");

export const checkoutLoanQuery = query({
  name: "loans/{id}/checkout",
  verb: "PATCH",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    ...guard.role(userTable, "admin"),
    s.db.get({ table: loanTable, fieldValue: inp("id"), as: "loan" }),
    guard.found("loan", { message: "Loan not found." }),
    s.precondition({
      expr: expr(ref("loan.status"), "=", c.text("approved")),
      error_type: "badrequest",
      error: c.text("Loan is not approved."),
    }),
    s.db.get({ table: itemTable, fieldValue: ref("loan.item_id"), as: "item" }),
    s.precondition({
      expr: expr(ref("item.status"), "=", c.text("available")),
      error_type: "badrequest",
      error: c.text("Item is not available."),
    }),
    s.db.patch({
      table: itemTable,
      fieldValue: ref("loan.item_id"),
      data: obj({ status: c.text("on_loan") }),
    }),
    s.db.patch({
      table: loanTable,
      fieldValue: inp("id"),
      data: obj({ status: c.text("out") }),
      as: "updated",
    }),
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
    s.db.get({ table: loanTable, fieldValue: inp("id"), as: "loan" }),
    guard.found("loan", { message: "Loan not found." }),
    s.precondition({
      expr: expr(ref("loan.status"), "=", c.text("out")),
      error_type: "badrequest",
      error: c.text("Loan is not checked out."),
    }),
    s.db.patch({
      table: itemTable,
      fieldValue: ref("loan.item_id"),
      data: obj({ status: c.text("available") }),
    }),
    s.db.patch({
      table: loanTable,
      fieldValue: inp("id"),
      data: obj({ status: c.text("returned"), returned_at: c.now() }),
      as: "updated",
    }),
  ],
  response: ref("updated"),
});
