import { query, input, inp, s, ref, auth } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { cancelLoanFn } from "../functions/loan_transitions.js";
import { memberLoansFn } from "../functions/members.js";
import { requestLoanFn } from "../functions/request_loan.js";
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
  stack: [s.function.run({ fn: memberLoansFn, input: { user_id: auth("id") }, as: "loans" })],
  response: ref("loans"),
});

export const cancelLoanQuery = query({
  name: "loans/{id}/cancel",
  verb: "PATCH",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    s.function.run({ fn: cancelLoanFn, input: { loan_id: inp("id"), user_id: auth("id") }, as: "updated" }),
  ],
  response: ref("updated"),
});
