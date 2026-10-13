import { defineFunction, col, expr, s, ref, c, obj, withFilters, fl } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemTable } from "../tables/item.js";
import { loanTable } from "../tables/loan.js";

export const flagOverdueFn = defineFunction({
  name: "flag_overdue_loans",
  stack: [
    s.set_var("today", withFilters(c.now(), fl.epochms_date("Y-m-d", "UTC"))),
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
    }),
    s.foreach({
      list: ref("overdue"),
      as: "loan",
      body: [
        s.db.patch({ table: loanTable, fieldValue: ref("loan.id"), data: obj({ overdue: c.bool(true) }) }),
        // One bad address must not stop the rest of the run.
        s.try_catch({
          try: [
            s.util.send_email({
              service_provider: c.text("xano"),
              to: ref("loan.user_email"),
              subject: withFilters(ref("loan.item_name"), fl.concat(c.text(" is overdue"))),
              message: withFilters(
                c.text("Hi "),
                fl.concat(ref("loan.user_name")),
                fl.concat(c.text(", the ")),
                fl.concat(ref("loan.item_name")),
                fl.concat(c.text(" you borrowed was due back on ")),
                fl.concat(ref("loan.due_date")),
                fl.concat(c.text(". Please return it to the tool library as soon as you can.")),
              ),
            }),
          ],
        }),
      ],
    }),
  ],
  response: { flagged: withFilters(ref("overdue"), fl.count()) },
});
