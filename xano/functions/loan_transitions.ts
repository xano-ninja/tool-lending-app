import { defineFunction, input, inp, expr, s, ref, c, guard, obj, withFilters, fl } from "@xano/sdk";
import { itemTable } from "../tables/item.js";
import { LOAN_STATUSES, loanTable } from "../tables/loan.js";
import { refuseClash } from "./booking.js";
import { notifyWaitlistFn } from "./waitlist_notice.js";

export const transitionLoanFn = defineFunction({
  name: "transition_loan",
  input: {
    loan_id: input.int({ required: true }),
    from: input.enum([...LOAN_STATUSES], { required: true }),
    to: input.enum([...LOAN_STATUSES], { required: true }),
  },
  stack: [
    s.db.get({ table: loanTable, fieldValue: inp("loan_id"), as: "loan" }),
    guard.found("loan", { message: "Loan not found." }),
    s.precondition({
      expr: expr(ref("loan.status"), "=", inp("from")),
      error_type: "badrequest",
      error: withFilters(c.text("Loan is not "), fl.concat(inp("from")), fl.concat(c.text("."))),
    }),
    s.db.patch({
      table: loanTable,
      fieldValue: inp("loan_id"),
      data: obj({ status: inp("to") }),
      as: "updated",
    }),
  ],
  response: ref("updated"),
});

export const approveLoanFn = defineFunction({
  name: "approve_loan",
  description: "Approve a loan request unless its dates clash with another booking of the item.",
  input: { loan_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: loanTable, fieldValue: inp("loan_id"), as: "loan" }),
    guard.found("loan", { message: "Loan not found." }),
    s.precondition({
      expr: expr(ref("loan.status"), "=", c.text("requested")),
      error_type: "badrequest",
      error: c.text("Loan is not requested."),
    }),
    ...refuseClash(ref("loan.item_id"), ref("loan.start_date"), ref("loan.due_date")),
    s.db.patch({
      table: loanTable,
      fieldValue: inp("loan_id"),
      data: obj({ status: c.text("approved") }),
      as: "updated",
    }),
  ],
  response: ref("updated"),
});

export const checkoutLoanFn = defineFunction({
  name: "checkout_loan",
  input: { loan_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: loanTable, fieldValue: inp("loan_id"), as: "loan" }),
    guard.found("loan", { message: "Loan not found." }),
    s.precondition({
      expr: expr(ref("loan.status"), "=", c.text("approved")),
      error_type: "badrequest",
      error: c.text("Loan is not approved."),
    }),
    s.db.get({ table: itemTable, fieldValue: ref("loan.item_id"), as: "item" }),
    guard.found("item", { message: "Item not found." }),
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
      fieldValue: inp("loan_id"),
      data: obj({ status: c.text("out") }),
      as: "updated",
    }),
  ],
  response: ref("updated"),
});

export const extendLoanFn = defineFunction({
  name: "extend_loan",
  description: "Push back the due date of a checked-out loan unless the new dates clash with another booking.",
  input: { loan_id: input.int({ required: true }), due_date: input.date({ required: true }) },
  stack: [
    s.db.get({ table: loanTable, fieldValue: inp("loan_id"), as: "loan" }),
    guard.found("loan", { message: "Loan not found." }),
    s.precondition({
      expr: expr(ref("loan.status"), "=", c.text("out")),
      error_type: "badrequest",
      error: c.text("Loan is not checked out."),
    }),
    s.precondition({
      expr: expr(inp("due_date"), ">", ref("loan.due_date")),
      error_type: "badrequest",
      error: c.text("New due date must be after the current one."),
    }),
    s.set_var("today", withFilters(c.now(), fl.epochms_date("Y-m-d", "UTC"))),
    s.precondition({
      expr: expr(inp("due_date"), ">=", ref("today")),
      error_type: "badrequest",
      error: c.text("New due date cannot be in the past."),
    }),
    ...refuseClash(ref("loan.item_id"), ref("loan.start_date"), inp("due_date"), inp("loan_id")),
    s.db.patch({
      table: loanTable,
      fieldValue: inp("loan_id"),
      data: obj({ due_date: inp("due_date"), overdue: c.bool(false) }),
      as: "updated",
    }),
  ],
  response: ref("updated"),
});

export const returnLoanFn = defineFunction({
  name: "return_loan",
  input: { loan_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: loanTable, fieldValue: inp("loan_id"), as: "loan" }),
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
      fieldValue: inp("loan_id"),
      data: obj({ status: c.text("returned"), returned_at: c.now() }),
      as: "updated",
    }),
    s.function.run({ fn: notifyWaitlistFn, input: { item_id: ref("loan.item_id") }, as: "notice" }),
  ],
  response: {
    loan: ref("updated"),
    notified_user_id: ref("notice.notified_user_id"),
  },
});

export const cancelLoanFn = defineFunction({
  name: "cancel_loan",
  description: "Let a member withdraw a loan request before it is approved.",
  input: { loan_id: input.int({ required: true }), user_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: loanTable, fieldValue: inp("loan_id"), as: "loan" }),
    guard.found("loan", { message: "Loan not found." }),
    s.precondition({
      expr: expr(ref("loan.user_id"), "=", inp("user_id")),
      error_type: "notfound",
      error: c.text("Loan not found."),
    }),
    s.precondition({
      expr: expr(ref("loan.status"), "=", c.text("requested")),
      error_type: "badrequest",
      error: c.text("Only a pending request can be cancelled."),
    }),
    s.db.patch({
      table: loanTable,
      fieldValue: inp("loan_id"),
      data: obj({ status: c.text("cancelled") }),
      as: "updated",
    }),
    s.function.run({ fn: notifyWaitlistFn, input: { item_id: ref("loan.item_id") } }),
  ],
  response: ref("updated"),
});
