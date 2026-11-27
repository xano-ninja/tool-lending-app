import { query, input, inp, s, ref, c, auth, guard } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemLoansFn, listLoansFn } from "../functions/list_loans.js";
import { approveLoanFn, checkoutLoanFn, extendLoanFn, returnLoanFn, transitionLoanFn } from "../functions/loan_transitions.js";
import { notifyWaitlistFn } from "../functions/waitlist_notice.js";
import { LOAN_STATUSES } from "../tables/loan.js";
import { api } from "./group.js";

export const loansQuery = query({
  name: "loans",
  verb: "GET",
  apiGroup: api,
  auth: userTable,
  input: { status: input.enum([...LOAN_STATUSES, "overdue"]) },
  stack: [
    ...guard.role(userTable, "admin"),
    s.function.run({ fn: listLoansFn, input: { status: inp("status") }, as: "loans" }),
  ],
  response: ref("loans"),
});

export const itemLoansQuery = query({
  name: "items/{id}/loans",
  verb: "GET",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    ...guard.role(userTable, "admin"),
    s.function.run({ fn: itemLoansFn, input: { item_id: inp("id") }, as: "loans" }),
  ],
  response: ref("loans"),
});

export const approveLoanQuery = query({
  name: "loans/{id}/approve",
  verb: "PATCH",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    ...guard.role(userTable, "admin"),
    s.function.run({ fn: approveLoanFn, input: { loan_id: inp("id") }, as: "updated" }),
  ],
  response: ref("updated"),
});

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

export const extendLoanQuery = query({
  name: "loans/{id}/extend",
  verb: "PATCH",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }), due_date: input.date({ required: true }) },
  stack: [
    ...guard.role(userTable, "admin"),
    s.function.run({
      fn: extendLoanFn,
      input: { loan_id: inp("id"), due_date: inp("due_date") },
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
  input: {
    id: input.int({ required: true }),
    note: input.text({ methods: ["trim"] }),
    needs_repair: input.bool(),
  },
  stack: [
    ...guard.role(userTable, "admin"),
    s.function.run({
      fn: returnLoanFn,
      input: { loan_id: inp("id"), user_id: auth("id"), note: inp("note"), needs_repair: inp("needs_repair") },
      as: "result",
    }),
  ],
  response: ref("result.loan"),
});
