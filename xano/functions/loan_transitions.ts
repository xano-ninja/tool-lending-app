import { defineFunction, input, inp, expr, s, ref, c, guard, obj, withFilters, fl } from "@xano/sdk";
import { itemTable } from "../tables/item.js";
import { LOAN_STATUSES, loanTable } from "../tables/loan.js";
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
