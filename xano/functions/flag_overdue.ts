import { defineFunction, input, inp, col, expr, s, ref, c, obj, withFilters, fl, expect, resp } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemTable } from "../tables/item.js";
import { loanTable } from "../tables/loan.js";

export const overdueReminderFn = defineFunction({
  name: "overdue_reminder",
  description: "Subject and body of the email sent to a member whose loan is overdue.",
  input: {
    item_name: input.text({ required: true }),
    user_name: input.text({ required: true }),
    due_date: input.text({ required: true }),
  },
  stack: [],
  response: {
    subject: withFilters(inp("item_name"), fl.concat(c.text(" is overdue"))),
    message: withFilters(
      c.text("Hi "),
      fl.concat(inp("user_name")),
      fl.concat(c.text(", the ")),
      fl.concat(inp("item_name")),
      fl.concat(c.text(" you borrowed was due back on ")),
      fl.concat(inp("due_date")),
      fl.concat(c.text(". Please return it to the tool library as soon as you can.")),
    ),
  },
  tests: [
    {
      name: "names the item, member and due date",
      input: { item_name: c.text("Step ladder"), user_name: c.text("Ana"), due_date: c.text("2026-11-20") },
      expect: [
        expect.to_equal(resp("subject"), c.text("Step ladder is overdue")),
        expect.to_start_with(resp("message"), c.text("Hi Ana, the Step ladder you borrowed was due back on 2026-11-20.")),
        expect.to_contain(resp("message"), c.text("return it to the tool library")),
      ],
    },
  ],
});

export const emailOverdueReminderFn = defineFunction({
  name: "email_overdue_reminder",
  input: {
    to: input.text({ required: true }),
    item_name: input.text({ required: true }),
    user_name: input.text({ required: true }),
    due_date: input.text({ required: true }),
  },
  stack: [
    s.function.run({
      fn: overdueReminderFn,
      input: { item_name: inp("item_name"), user_name: inp("user_name"), due_date: inp("due_date") },
      as: "reminder",
    }),
    s.util.send_email({
      service_provider: c.text("xano"),
      to: inp("to"),
      subject: ref("reminder.subject"),
      message: ref("reminder.message"),
    }),
  ],
  response: { sent: c.bool(true) },
});

export const flagOverdueFn = defineFunction({
  name: "flag_overdue_loans",
  stack: [
    s.set_var("today", withFilters(c.now(), fl.epochms_date("Y-m-d", "UTC"))),
    s.set_var("reminded", c.int(0)),
    s.db.query({
      table: loanTable,
      where: [
        expr(col("status"), "=", c.text("out")),
        expr(col("due_date"), "<", ref("today")),
      ],
      bind: [
        {
          table: itemTable,
          as: "item_row",
          join: "left",
          where: expr(col("item_id"), "=", col("item_row.id")),
        },
        {
          table: userTable,
          as: "user_row",
          join: "left",
          where: expr(col("user_id"), "=", col("user_row.id")),
        },
      ],
      eval: [
        { name: "item_row.name", as: "item_name" },
        { name: "user_row.name", as: "user_name" },
        { name: "user_row.email", as: "user_email" },
      ],
      as: "overdue",
      mock: {
        "reminds each late loan": c.array([
          { id: 7, due_date: "2026-11-01", item_name: "Drill", user_name: "Ana", user_email: "ana@example.com" },
          { id: 8, due_date: "2026-11-02", item_name: "Hand saw", user_name: "Bo", user_email: "bo@example.com" },
        ]),
      },
    }),
    s.foreach({
      list: ref("overdue"),
      as: "loan",
      body: [
        s.db.patch({
          table: loanTable,
          fieldValue: ref("loan.id"),
          data: obj({ overdue: c.bool(true) }),
          mock: { "reminds each late loan": c.obj({ overdue: true }) },
        }),
        // One bad address must not stop the rest of the run.
        s.try_catch({
          try: [
            s.function.run({
              fn: emailOverdueReminderFn,
              input: {
                to: ref("loan.user_email"),
                item_name: ref("loan.item_name"),
                user_name: ref("loan.user_name"),
                due_date: ref("loan.due_date"),
              },
              mock: { "reminds each late loan": c.obj({ sent: true }) },
            }),
            s.math.add({ name: "reminded", value: c.int(1) }),
          ],
        }),
      ],
    }),
  ],
  response: { flagged: withFilters(ref("overdue"), fl.count()), reminded: ref("reminded") },
  tests: [
    {
      name: "reminds each late loan",
      expect: [
        expect.to_equal(resp("flagged"), c.int(2)),
        expect.to_equal(resp("reminded"), c.int(2)),
      ],
    },
  ],
});
