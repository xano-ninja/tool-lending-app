import { defineFunction, input, inp, expr, s, ref, c, guard, obj, withFilters, fl, expect, resp } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemTable } from "../tables/item.js";
import { LOAN_STATUSES, loanTable } from "../tables/loan.js";
import { refuseClash } from "./booking.js";
import { addNoteFn } from "./notes.js";
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

export const emailLoanExtendedFn = defineFunction({
  name: "email_loan_extended",
  input: {
    to: input.text({ required: true }),
    item_name: input.text({ required: true }),
    user_name: input.text({ required: true }),
    due_date: input.text({ required: true }),
  },
  stack: [
    s.util.send_email({
      service_provider: c.text("xano"),
      to: inp("to"),
      subject: withFilters(inp("item_name"), fl.concat(c.text(" loan extended"))),
      message: withFilters(
        c.text("Hi "),
        fl.concat(inp("user_name")),
        fl.concat(c.text(", your loan of the ")),
        fl.concat(inp("item_name")),
        fl.concat(c.text(" has been extended. It is now due back on ")),
        fl.concat(inp("due_date")),
        fl.concat(c.text(".")),
      ),
    }),
  ],
  response: { sent: c.bool(true) },
});

export const extendLoanFn = defineFunction({
  name: "extend_loan",
  description: "Push back the due date of a checked-out loan unless the new dates clash with another booking.",
  input: { loan_id: input.int({ required: true }), due_date: input.date({ required: true }) },
  stack: [
    s.db.get({
      table: loanTable,
      fieldValue: inp("loan_id"),
      as: "loan",
      mock: { "extends with a mocked loan": obj({ id: c.int(7), item_id: c.int(3), user_id: c.int(5), status: c.text("out"), start_date: c.text("2099-01-01"), due_date: c.text("2099-01-05") }) },
    }),
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
      mock: { "extends with a mocked loan": obj({ id: c.int(7), due_date: c.text("2099-01-10"), overdue: c.bool(false) }) },
    }),
    // The extension stands even if the mail does not go out.
    s.try_catch({
      try: [
        s.db.get({ table: itemTable, fieldValue: ref("loan.item_id"), as: "item", mock: { "extends with a mocked loan": obj({ name: c.text("drill") }) } }),
        s.db.get({ table: userTable, fieldValue: ref("loan.user_id"), as: "member", mock: { "extends with a mocked loan": obj({ name: c.text("Ana"), email: c.text("ana@example.com") }) } }),
        s.function.run({
          fn: emailLoanExtendedFn,
          input: {
            to: ref("member.email"),
            item_name: ref("item.name"),
            user_name: ref("member.name"),
            due_date: inp("due_date"),
          },
          mock: { "extends with a mocked loan": c.obj({ sent: true }) },
        }),
      ],
    }),
  ],
  response: ref("updated"),
  tests: [
    {
      name: "extends with a mocked loan",
      input: { loan_id: c.int(7), due_date: c.text("2099-01-10") },
      expect: [
        expect.to_equal(resp("due_date"), c.text("2099-01-10")),
        expect.to_be_false(resp("overdue")),
      ],
    },
  ],
});

export const returnLoanFn = defineFunction({
  name: "return_loan",
  description: "Check a loan back in, log the item's condition, and send it to repair or back on the shelf.",
  input: {
    loan_id: input.int({ required: true }),
    user_id: input.int({ required: true }),
    note: input.text({ methods: ["trim"] }),
    needs_repair: input.bool(),
  },
  stack: [
    s.db.get({ table: loanTable, fieldValue: inp("loan_id"), as: "loan" }),
    guard.found("loan", { message: "Loan not found." }),
    s.precondition({
      expr: expr(ref("loan.status"), "=", c.text("out")),
      error_type: "badrequest",
      error: c.text("Loan is not checked out."),
    }),
    s.conditional({
      when: expr(inp("needs_repair"), "=", c.bool(true)),
      then: [
        s.db.patch({
          table: itemTable,
          fieldValue: ref("loan.item_id"),
          data: obj({ status: c.text("in_repair") }),
        }),
      ],
      else: [
        s.db.patch({
          table: itemTable,
          fieldValue: ref("loan.item_id"),
          data: obj({ status: c.text("available") }),
        }),
      ],
    }),
    s.db.patch({
      table: loanTable,
      fieldValue: inp("loan_id"),
      data: obj({ status: c.text("returned"), returned_at: c.now() }),
      as: "updated",
    }),
    s.set_var("note", c.null()),
    s.conditional({
      when: expr(withFilters(inp("note"), fl.first_notnull(""), fl.trim()), "!=", c.text("")),
      then: [
        s.function.run({
          fn: addNoteFn,
          input: { item_id: ref("loan.item_id"), user_id: inp("user_id"), note: inp("note") },
          as: "added",
        }),
        s.update_var("note", ref("added")),
      ],
    }),
    s.function.run({ fn: notifyWaitlistFn, input: { item_id: ref("loan.item_id") }, as: "notice" }),
  ],
  response: {
    loan: ref("updated"),
    note: ref("note"),
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
