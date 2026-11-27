import { workflowTest, s, ref, c, obj, col, expr } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { findClashFn } from "../functions/booking.js";
import { itemLoansFn, listLoansFn } from "../functions/list_loans.js";
import { approveLoanFn, cancelLoanFn, checkoutLoanFn, extendLoanFn, returnLoanFn } from "../functions/loan_transitions.js";
import { itemTable } from "../tables/item.js";
import { LOAN_STATUSES, loanTable } from "../tables/loan.js";
import { conditionNoteTable } from "../tables/condition_note.js";
import { waitlistTable } from "../tables/waitlist.js";

type ItemStatus = "available" | "on_loan" | "in_repair" | "retired";
type LoanStatus = (typeof LOAN_STATUSES)[number];

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

const approve = s.function.run({ fn: approveLoanFn, input: { loan_id: ref("loan.id") }, as: "updated" });

const rival = (status: LoanStatus) => [
  member("rival", "rival@example.com"),
  s.db.add({
    table: loanTable,
    row: {
      item_id: ref("item.id"),
      user_id: ref("rival.id"),
      start_date: "2026-11-06",
      due_date: "2026-11-12",
      status,
    },
    as: "rival_loan",
  }),
];

export const approveTest = workflowTest({
  name: "approve moves a requested loan to approved",
  stack: [
    ...fixtures("requested"),
    approve,
    s.expect.to_equal({ expr: ref("updated.status"), value: c.text("approved") }),
  ],
});

export const approveTwiceTest = workflowTest({
  name: "approve refuses a loan that is not requested",
  stack: [
    s.expect.to_throw({
      body: [...fixtures("approved"), approve],
      exception: c.text("Loan is not requested"),
    }),
  ],
});

export const approveClashTest = workflowTest({
  name: "approve refuses dates another approved loan holds",
  stack: [
    s.expect.to_throw({
      body: [...fixtures("requested"), ...rival("approved"), approve],
      exception: c.text("booked from 2026-11-06 to 2026-11-12"),
    }),
  ],
});

export const approveBesideRequestTest = workflowTest({
  name: "approve is not blocked by an overlapping request",
  stack: [
    ...fixtures("requested"),
    ...rival("requested"),
    approve,
    s.expect.to_equal({ expr: ref("updated.status"), value: c.text("approved") }),
  ],
});

export const approveAfterRivalTest = workflowTest({
  name: "approving one of two clashing requests blocks the other",
  stack: [
    s.expect.to_throw({
      body: [
        ...fixtures("requested"),
        ...rival("requested"),
        s.function.run({ fn: approveLoanFn, input: { loan_id: ref("rival_loan.id") } }),
        approve,
      ],
      exception: c.text("booked from 2026-11-06 to 2026-11-12"),
    }),
  ],
});

const findClash = (exceptId: ReturnType<typeof ref> | ReturnType<typeof c.null>) =>
  s.function.run({
    fn: findClashFn,
    input: {
      item_id: ref("item.id"),
      start_date: c.text("2026-11-01"),
      due_date: c.text("2026-11-08"),
      except_id: exceptId,
    },
    as: "booking",
  });

export const clashNullExceptTest = workflowTest({
  name: "clash check with a null except_id skips no loan",
  stack: [
    ...fixtures("requested"),
    ...rival("approved"),
    findClash(c.null()),
    s.expect.to_equal({ expr: ref("booking.clash.id"), value: ref("rival_loan.id") }),
    findClash(ref("rival_loan.id")),
    s.expect.to_be_null({ expr: ref("booking.clash") }),
  ],
});

export const listClashingRequestsTest = workflowTest({
  name: "requested list carries what the clash flag compares",
  stack: [
    ...fixtures("requested"),
    ...rival("requested"),
    s.function.run({ fn: listLoansFn, input: { status: c.text("requested") }, as: "requested" }),
    s.expect.to_equal({ expr: ref("requested.0.id"), value: ref("loan.id") }),
    s.expect.to_equal({ expr: ref("requested.0.item_id"), value: ref("item.id") }),
    s.expect.to_equal({ expr: ref("requested.0.start_date"), value: c.text("2026-11-01") }),
    s.expect.to_equal({ expr: ref("requested.1.id"), value: ref("rival_loan.id") }),
    s.expect.to_equal({ expr: ref("requested.1.item_id"), value: ref("item.id") }),
    s.expect.to_equal({ expr: ref("requested.1.due_date"), value: c.text("2026-11-12") }),
  ],
});

export const approveMissingTest = workflowTest({
  name: "approve refuses an unknown loan",
  stack: [
    s.expect.to_throw({
      body: [s.function.run({ fn: approveLoanFn, input: { loan_id: c.int(999999) } })],
      exception: c.text("Loan not found"),
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

const extend = (due: string) =>
  s.function.run({ fn: extendLoanFn, input: { loan_id: ref("loan.id"), due_date: c.text(due) }, as: "updated" });

export const extendTest = workflowTest({
  name: "extend moves the due date and clears overdue",
  stack: [
    ...fixtures("out", "on_loan"),
    s.db.patch({ table: loanTable, fieldValue: ref("loan.id"), data: obj({ overdue: c.bool(true) }) }),
    extend("2099-01-08"),
    s.expect.to_equal({ expr: ref("updated.due_date"), value: c.text("2099-01-08") }),
    s.expect.to_be_false({ expr: ref("updated.overdue") }),
  ],
});

export const extendNoMemberTest = workflowTest({
  name: "extend stands when the member cannot be mailed",
  stack: [
    ...fixtures("out", "on_loan"),
    s.db.del({ table: userTable, fieldValue: ref("member.id") }),
    extend("2099-01-08"),
    s.db.get({ table: loanTable, fieldValue: ref("loan.id"), as: "stored" }),
    s.expect.to_equal({ expr: ref("stored.due_date"), value: c.text("2099-01-08") }),
  ],
});

export const extendNotOutTest = workflowTest({
  name: "extend refuses a loan that is not out",
  stack: [
    s.expect.to_throw({
      body: [...fixtures("approved"), extend("2099-01-08")],
      exception: c.text("not checked out"),
    }),
  ],
});

export const extendEarlierTest = workflowTest({
  name: "extend refuses a date before the current one",
  stack: [
    s.expect.to_throw({
      body: [...fixtures("out", "on_loan"), extend("2026-11-05")],
      exception: c.text("must be after the current one"),
    }),
  ],
});

export const extendPastTest = workflowTest({
  name: "extend refuses a date in the past",
  stack: [
    s.expect.to_throw({
      body: [...fixtures("out", "on_loan"), extend("2026-11-10")],
      exception: c.text("cannot be in the past"),
    }),
  ],
});

export const extendClashTest = workflowTest({
  name: "extend refuses dates another booking holds",
  stack: [
    s.expect.to_throw({
      body: [
        ...fixtures("out", "on_loan"),
        member("rival", "rival@example.com"),
        s.db.add({
          table: loanTable,
          row: {
            item_id: ref("item.id"),
            user_id: ref("rival.id"),
            start_date: "2099-01-05",
            due_date: "2099-01-12",
            status: "approved",
          },
        }),
        extend("2099-01-08"),
      ],
      exception: c.text("booked from 2099-01-05 to 2099-01-12"),
    }),
  ],
});

const checkIn = (extra: { note?: string; needs_repair?: boolean }) =>
  s.function.run({
    fn: returnLoanFn,
    input: {
      loan_id: ref("loan.id"),
      user_id: ref("member.id"),
      ...(extra.note === undefined ? {} : { note: c.text(extra.note) }),
      ...(extra.needs_repair === undefined ? {} : { needs_repair: c.bool(extra.needs_repair) }),
    },
    as: "result",
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
    checkIn({}),
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
    checkIn({}),
    s.expect.to_be_null({ expr: ref("result.notified_user_id") }),
  ],
});

export const returnTwiceTest = workflowTest({
  name: "return refuses a loan that is not out",
  stack: [
    s.expect.to_throw({
      body: [
        ...fixtures("returned"),
        checkIn({}),
      ],
      exception: c.text("not checked out"),
    }),
  ],
});

export const returnNoteTest = workflowTest({
  name: "return logs a condition note against the item",
  stack: [
    ...fixtures("out", "on_loan"),
    checkIn({ note: "  ladder feet worn " }),
    s.expect.to_equal({ expr: ref("result.note.note"), value: c.text("ladder feet worn") }),
    s.expect.to_equal({ expr: ref("result.note.item_id"), value: ref("item.id") }),
    s.expect.to_equal({ expr: ref("result.note.user_id"), value: ref("member.id") }),
    s.db.query({
      table: conditionNoteTable,
      where: expr(col("item_id"), "=", ref("item.id")),
      returnType: "count",
      as: "notes",
    }),
    s.expect.to_equal({ expr: ref("notes"), value: c.int(1) }),
  ],
});

export const returnBlankNoteTest = workflowTest({
  name: "return with a blank note logs nothing",
  stack: [
    ...fixtures("out", "on_loan"),
    checkIn({ note: "   " }),
    s.expect.to_be_null({ expr: ref("result.note") }),
    s.db.query({
      table: conditionNoteTable,
      where: expr(col("item_id"), "=", ref("item.id")),
      returnType: "count",
      as: "notes",
    }),
    s.expect.to_equal({ expr: ref("notes"), value: c.int(0) }),
  ],
});

export const returnToRepairTest = workflowTest({
  name: "return to repair holds the item back from the waitlist",
  stack: [
    ...fixtures("out", "on_loan"),
    member("waiter", "waiter@example.com"),
    s.db.add({
      table: waitlistTable,
      row: { item_id: ref("item.id"), user_id: ref("waiter.id") },
      as: "entry",
    }),
    checkIn({ note: "cracked rung", needs_repair: true }),
    s.expect.to_equal({ expr: ref("result.loan.status"), value: c.text("returned") }),
    s.expect.to_be_null({ expr: ref("result.notified_user_id") }),
    s.db.get({ table: itemTable, fieldValue: ref("item.id"), as: "after" }),
    s.expect.to_equal({ expr: ref("after.status"), value: c.text("in_repair") }),
    s.db.get({ table: waitlistTable, fieldValue: ref("entry.id"), as: "waiting" }),
    s.expect.to_be_null({ expr: ref("waiting.notified_at") }),
  ],
});

const listed = (as: string, status: LoanStatus, due: string) =>
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

const loanList = [
  member("member", "member@example.com"),
  s.db.add({
    table: itemTable,
    row: { name: "Test ladder", category: "ladders", status: "on_loan" },
    as: "item",
  }),
  listed("late", "out", "2020-01-08"),
  listed("on_time", "out", "2099-01-08"),
  listed("back", "returned", "2020-01-08"),
  listed("asked", "requested", "2020-01-08"),
];

export const listOverdueTest = workflowTest({
  name: "overdue list holds only loans out past due",
  stack: [
    ...loanList,
    s.function.run({ fn: listLoansFn, input: { status: c.text("overdue") }, as: "loans" }),
    s.expect.to_equal({ expr: ref("loans.0.id"), value: ref("late.id") }),
    s.expect.to_equal({ expr: ref("loans.0.item_name"), value: c.text("Test ladder") }),
    s.expect.to_equal({ expr: ref("loans.0.user_name"), value: c.text("member") }),
    s.expect.to_not_be_defined({ expr: ref("loans.1") }),
  ],
});

export const listStatusTest = workflowTest({
  name: "loan list filters by status, soonest due first",
  stack: [
    ...loanList,
    s.function.run({ fn: listLoansFn, input: { status: c.text("out") }, as: "out" }),
    s.expect.to_equal({ expr: ref("out.0.id"), value: ref("late.id") }),
    s.expect.to_equal({ expr: ref("out.1.id"), value: ref("on_time.id") }),
    s.expect.to_not_be_defined({ expr: ref("out.2") }),
    s.function.run({ fn: listLoansFn, as: "all" }),
    s.expect.to_be_defined({ expr: ref("all.3") }),
  ],
});

const cancel = (who = "member") =>
  s.function.run({
    fn: cancelLoanFn,
    input: { loan_id: ref("loan.id"), user_id: ref(`${who}.id`) },
    as: "updated",
  });

export const cancelTest = workflowTest({
  name: "member cancels a pending request",
  stack: [
    ...fixtures("requested"),
    cancel(),
    s.expect.to_equal({ expr: ref("updated.status"), value: c.text("cancelled") }),
  ],
});

export const cancelApprovedTest = workflowTest({
  name: "cancel refuses a loan that is not requested",
  stack: [
    s.expect.to_throw({
      body: [...fixtures("approved"), cancel()],
      exception: c.text("Only a pending request"),
    }),
  ],
});

export const cancelOtherMemberTest = workflowTest({
  name: "cancel refuses another member's request",
  stack: [
    s.expect.to_throw({
      body: [...fixtures("requested"), member("other", "other@example.com"), cancel("other")],
      exception: c.text("Loan not found"),
    }),
  ],
});

export const cancelTwiceTest = workflowTest({
  name: "cancel refuses a request already cancelled",
  stack: [
    s.expect.to_throw({
      body: [...fixtures("cancelled"), cancel()],
      exception: c.text("Only a pending request"),
    }),
  ],
});

export const cancelMissingTest = workflowTest({
  name: "cancel refuses an unknown loan",
  stack: [
    s.expect.to_throw({
      body: [
        member("member", "member@example.com"),
        s.function.run({
          fn: cancelLoanFn,
          input: { loan_id: c.int(999999), user_id: ref("member.id") },
          as: "updated",
        }),
      ],
      exception: c.text("Loan not found"),
    }),
  ],
});

export const cancelNotifiesTest = workflowTest({
  name: "cancel passes an available item to the waitlist",
  stack: [
    ...fixtures("requested"),
    member("waiter", "waiter@example.com"),
    s.db.add({
      table: waitlistTable,
      row: { item_id: ref("item.id"), user_id: ref("waiter.id") },
      as: "waiting",
    }),
    cancel(),
    s.db.get({ table: waitlistTable, fieldValue: ref("waiting.id"), as: "after" }),
    s.expect.to_not_be_null({ expr: ref("after.notified_at") }),
  ],
});

export const cancelOnLoanTest = workflowTest({
  name: "cancel leaves the waitlist alone while the item is out",
  stack: [
    ...fixtures("requested", "on_loan"),
    member("waiter", "waiter@example.com"),
    s.db.add({
      table: waitlistTable,
      row: { item_id: ref("item.id"), user_id: ref("waiter.id") },
      as: "waiting",
    }),
    cancel(),
    s.db.get({ table: waitlistTable, fieldValue: ref("waiting.id"), as: "after" }),
    s.expect.to_be_null({ expr: ref("after.notified_at") }),
  ],
});

export const itemLoansTest = workflowTest({
  name: "item loans list every loan with the borrower, newest first",
  stack: [
    ...fixtures("returned"),
    member("other", "other@example.com"),
    s.db.add({
      table: loanTable,
      row: {
        item_id: ref("item.id"),
        user_id: ref("other.id"),
        start_date: "2026-11-10",
        due_date: "2026-11-17",
        status: "requested",
      },
      as: "later",
    }),
    s.db.add({
      table: itemTable,
      row: { name: "Other ladder", category: "ladders", status: "available" },
      as: "elsewhere",
    }),
    s.db.add({
      table: loanTable,
      row: {
        item_id: ref("elsewhere.id"),
        user_id: ref("member.id"),
        start_date: "2026-11-12",
        due_date: "2026-11-19",
        status: "out",
      },
    }),
    s.function.run({ fn: itemLoansFn, input: { item_id: ref("item.id") }, as: "loans" }),
    s.expect.to_equal({ expr: ref("loans.0.id"), value: ref("later.id") }),
    s.expect.to_equal({ expr: ref("loans.0.user_name"), value: c.text("other") }),
    s.expect.to_equal({ expr: ref("loans.1.id"), value: ref("loan.id") }),
    s.expect.to_equal({ expr: ref("loans.1.user_name"), value: c.text("member") }),
    s.expect.to_not_be_defined({ expr: ref("loans.2") }),
  ],
});
