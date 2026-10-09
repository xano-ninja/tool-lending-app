import { defineFunction, input, inp, col, cmp, expr, s, ref, c, guard } from "@xano/sdk";
import { itemTable } from "../tables/item.js";
import { loanTable, OPEN_LOAN_STATUSES } from "../tables/loan.js";

export const requestLoanFn = defineFunction({
  name: "request_loan",
  input: {
    user_id: input.int({ required: true }),
    item_id: input.int({ required: true }),
    start_date: input.date({ required: true }),
    due_date: input.date({ required: true }),
  },
  stack: [
    s.db.get({ table: itemTable, fieldValue: inp("item_id"), as: "item" }),
    guard.found("item", { message: "Item not found." }),
    s.precondition({
      expr: expr(ref("item.status"), "!=", c.text("retired")),
      error_type: "badrequest",
      error: c.text("This item is retired."),
    }),
    s.precondition({
      expr: expr(inp("due_date"), ">=", inp("start_date")),
      error_type: "badrequest",
      error: c.text("Due date must be on or after the start date."),
    }),
    s.db.query({
      table: loanTable,
      where: [
        cmp(col("item_id"), "=", inp("item_id")),
        cmp(col("user_id"), "=", inp("user_id")),
        cmp(col("status"), "in", c.array([...OPEN_LOAN_STATUSES])),
      ],
      returnType: "exists",
      as: "already_open",
    }),
    s.precondition({
      expr: expr(ref("already_open"), "=", c.bool(false)),
      error_type: "badrequest",
      error: c.text("You already have an open request for this item."),
    }),
    s.db.add({
      table: loanTable,
      row: {
        item_id: inp("item_id"),
        user_id: inp("user_id"),
        start_date: inp("start_date"),
        due_date: inp("due_date"),
        status: "requested",
      },
      as: "loan",
    }),
  ],
  response: ref("loan"),
});
