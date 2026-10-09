import { query, input, inp, col, expr, s, ref, auth } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { requestLoanFn } from "../functions/request_loan.js";
import { itemTable } from "../tables/item.js";
import { loanTable } from "../tables/loan.js";
import { api } from "./group.js";

export const requestLoanQuery = query({
  name: "loans",
  verb: "POST",
  apiGroup: api,
  auth: userTable,
  input: {
    item_id: input.int({ required: true }),
    start_date: input.date({ required: true }),
    due_date: input.date({ required: true }),
  },
  stack: [
    s.function.run({
      fn: requestLoanFn,
      input: {
        user_id: auth("id"),
        item_id: inp("item_id"),
        start_date: inp("start_date"),
        due_date: inp("due_date"),
      },
      as: "loan",
    }),
  ],
  response: ref("loan"),
});

export const myLoansQuery = query({
  name: "me/loans",
  verb: "GET",
  apiGroup: api,
  auth: userTable,
  stack: [
    s.db.query({
      table: loanTable,
      where: expr(col("user_id"), "=", auth("id")),
      bind: [
        {
          table: itemTable,
          as: "item_row",
          join: "left",
          where: expr(col("item_id"), "=", col("item_row.id")),
        },
      ],
      eval: [{ name: "item_row.name", as: "item_name" }],
      sort: [{ sortBy: "start_date", dir: "desc" }],
      as: "loans",
    }),
  ],
  response: ref("loans"),
});
