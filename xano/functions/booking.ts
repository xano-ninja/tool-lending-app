import { defineFunction, input, inp, col, cmp, expr, and, or, s, ref, c, withFilters, fl, statements, type Value } from "@xano/sdk";
import { loanTable } from "../tables/loan.js";

export const BOOKED_LOAN_STATUSES = ["approved", "out"] as const;

export const findClashFn = defineFunction({
  name: "find_booking_clash",
  description: "The first approved or checked-out loan of an item whose dates overlap the range given.",
  input: {
    item_id: input.int({ required: true }),
    start_date: input.date({ required: true }),
    due_date: input.date({ required: true }),
    except_id: input.int(),
  },
  stack: [
    s.set_var("today", withFilters(c.now(), fl.epochms_date("Y-m-d", "UTC"))),
    s.db.query({
      table: loanTable,
      where: [
        expr(col("item_id"), "=", inp("item_id")),
        cmp(col("id"), "!=", inp("except_id"), { ignoreEmpty: true }),
        cmp(col("status"), "in", c.array([...BOOKED_LOAN_STATUSES])),
        expr(col("start_date"), "<=", inp("due_date")),
        // An overdue loan holds the item until it comes back, whatever its due date says.
        or(
          expr(col("due_date"), ">=", inp("start_date")),
          and(expr(col("status"), "=", c.text("out")), expr(col("due_date"), "<", ref("today"))),
        ),
      ],
      sort: [{ sortBy: "start_date", dir: "asc" }],
      output: ["id", "start_date", "due_date", "status"],
      returnType: "single",
      as: "clash",
    }),
  ],
  response: { clash: ref("clash") },
});

export const refuseClash = (itemId: Value, startDate: Value, dueDate: Value, exceptId?: Value) =>
  statements(
    s.function.run({
      fn: findClashFn,
      input: { item_id: itemId, start_date: startDate, due_date: dueDate, except_id: exceptId ?? c.null() },
      as: "booking",
    }),
    s.precondition({
      expr: expr(ref("booking.clash"), "=", c.null()),
      error_type: "badrequest",
      error: withFilters(
        c.text("The item is booked from "),
        fl.concat(ref("booking.clash.start_date", { safe: true })),
        fl.concat(c.text(" to ")),
        fl.concat(ref("booking.clash.due_date", { safe: true })),
        fl.concat(c.text(".")),
      ),
    }),
  );
