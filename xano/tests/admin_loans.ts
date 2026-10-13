import { workflowTest, s, ref, c } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { checkoutLoanFn, returnLoanFn, transitionLoanFn } from "../functions/loan_transitions.js";
import { itemTable } from "../tables/item.js";
import { loanTable } from "../tables/loan.js";
import { waitlistTable } from "../tables/waitlist.js";

type ItemStatus = "available" | "on_loan" | "in_repair" | "retired";
type LoanStatus = "requested" | "approved" | "out" | "returned" | "rejected";

const member = (as: string, email: string) =>
  s.db.add({
    table: userTable,
    row: { name: as, email, password: "borrow123", role: "member" },
    as,
  });

const fixtures = (loanStatus: LoanStatus, itemStatus: ItemStatus = "available") => [
  member("member", "member@example.com"),
  s.db.add({
    table: itemTable,
    row: { name: "Test ladder", category: "ladders", status: itemStatus },
    as: "item",
  }),
  s.db.add({
    table: loanTable,
    row: {
      item_id: ref("item.id"),
      user_id: ref("member.id"),
      start_date: "2026-11-01",
      due_date: "2026-11-08",
      status: loanStatus,
    },
    as: "loan",
  }),
];

export const approveTest = workflowTest({
  name: "approve moves a requested loan to approved",
  stack: [
    ...fixtures("requested"),
    s.function.run({
      fn: transitionLoanFn,
      input: { loan_id: ref("loan.id"), from: c.text("requested"), to: c.text("approved") },
      as: "updated",
    }),
    s.expect.to_equal({ expr: ref("updated.status"), value: c.text("approved") }),
  ],
});

export const approveTwiceTest = workflowTest({
  name: "approve refuses a loan that is not requested",
  stack: [
    s.expect.to_throw({
      body: [
        ...fixtures("approved"),
        s.function.run({
          fn: transitionLoanFn,
          input: { loan_id: ref("loan.id"), from: c.text("requested"), to: c.text("approved") },
          as: "updated",
        }),
      ],
      exception: c.text("Loan is not requested"),
    }),
  ],
});

export const checkoutTest = workflowTest({
  name: "checkout puts the item on loan",
  stack: [
    ...fixtures("approved"),
    s.function.run({ fn: checkoutLoanFn, input: { loan_id: ref("loan.id") }, as: "updated" }),
    s.expect.to_equal({ expr: ref("updated.status"), value: c.text("out") }),
    s.db.get({ table: itemTable, fieldValue: ref("item.id"), as: "after" }),
    s.expect.to_equal({ expr: ref("after.status"), value: c.text("on_loan") }),
  ],
});

export const checkoutRepairTest = workflowTest({
  name: "checkout refuses an item in repair",
  stack: [
    s.expect.to_throw({
      body: [
        ...fixtures("approved", "in_repair"),
        s.function.run({ fn: checkoutLoanFn, input: { loan_id: ref("loan.id") }, as: "updated" }),
      ],
      exception: c.text("Item is not available"),
    }),
  ],
});

export const returnTest = workflowTest({
  name: "return frees the item and notifies the waitlist",
  stack: [
    ...fixtures("out", "on_loan"),
    member("waiter", "waiter@example.com"),
    s.db.add({
      table: waitlistTable,
      row: { item_id: ref("item.id"), user_id: ref("waiter.id") },
    }),
    s.function.run({ fn: returnLoanFn, input: { loan_id: ref("loan.id") }, as: "result" }),
    s.expect.to_equal({ expr: ref("result.loan.status"), value: c.text("returned") }),
    s.expect.to_not_be_null({ expr: ref("result.loan.returned_at") }),
    s.expect.to_equal({ expr: ref("result.notified_user_id"), value: ref("waiter.id") }),
    s.db.get({ table: itemTable, fieldValue: ref("item.id"), as: "after" }),
    s.expect.to_equal({ expr: ref("after.status"), value: c.text("available") }),
  ],
});

export const returnNoWaitlistTest = workflowTest({
  name: "return with an empty waitlist notifies no one",
  stack: [
    ...fixtures("out", "on_loan"),
    s.function.run({ fn: returnLoanFn, input: { loan_id: ref("loan.id") }, as: "result" }),
    s.expect.to_be_null({ expr: ref("result.notified_user_id") }),
  ],
});

export const returnTwiceTest = workflowTest({
  name: "return refuses a loan that is not out",
  stack: [
    s.expect.to_throw({
      body: [
        ...fixtures("returned"),
        s.function.run({ fn: returnLoanFn, input: { loan_id: ref("loan.id") }, as: "result" }),
      ],
      exception: c.text("not checked out"),
    }),
  ],
});
