import { query, input, inp, s, ref, c, guard } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { listLoansFn } from "../functions/list_loans.js";
import { checkoutLoanFn, returnLoanFn, transitionLoanFn } from "../functions/loan_transitions.js";
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
