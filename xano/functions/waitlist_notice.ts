import { defineFunction, input, inp, col, expr, and, s, ref, c, guard, obj, withFilters, fl } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemTable } from "../tables/item.js";
import { loanTable } from "../tables/loan.js";
import { waitlistTable } from "../tables/waitlist.js";
import { HOLD_DAYS, HOLD_MS } from "../waitlist_hold.js";

export const notifyWaitlistFn = defineFunction({
  name: "notify_waitlist",
  description: "Hold an available item for the first member waiting on it and email them.",
  input: { item_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: itemTable, fieldValue: inp("item_id"), as: "item" }),
    guard.found("item", { message: "Item not found." }),
    s.set_var("notified_user_id", c.null()),
    s.db.query({
      table: waitlistTable,
      where: [
        expr(col("item_id"), "=", inp("item_id")),
        expr(col("notified_at"), "!=", c.null()),
      ],
      returnType: "exists",
      as: "held",
    }),
    s.db.query({
      table: loanTable,
      where: [
        expr(col("item_id"), "=", inp("item_id")),
        expr(col("status"), "=", c.text("approved")),
      ],
      returnType: "exists",
      as: "promised",
    }),
    s.conditional({
      when: and(
        expr(ref("item.status"), "=", c.text("available")),
        expr(ref("held"), "=", c.bool(false)),
        expr(ref("promised"), "=", c.bool(false)),
      ),
      then: [
        s.db.query({
          table: waitlistTable,
          where: expr(col("item_id"), "=", inp("item_id")),
          bind: [
            {
              table: userTable,
              as: "user_row",
              join: "left",
              where: expr(col("user_id"), "=", col("user_row.id")),
            },
          ],
          eval: [
            { name: "user_row.email", as: "email" },
            { name: "user_row.name", as: "name" },
          ],
          sort: [{ sortBy: "created_at", dir: "asc" }],
          returnType: "single",
          as: "next",
        }),
        s.conditional({
          when: expr(ref("next"), "!=", c.null()),
          then: [
            s.db.patch({
              table: waitlistTable,
              fieldValue: ref("next.id"),
              data: obj({ notified_at: c.now() }),
            }),
            s.update_var("notified_user_id", ref("next.user_id")),
            // A mail failure must not undo the hold.
            s.try_catch({
              try: [
                s.util.send_email({
                  service_provider: c.text("xano"),
                  to: ref("next.email"),
                  subject: withFilters(ref("item.name"), fl.concat(c.text(" is ready for you"))),
                  message: withFilters(
                    c.text("Hi "),
                    fl.concat(ref("next.name")),
                    fl.concat(c.text(", the ")),
                    fl.concat(ref("item.name")),
                    fl.concat(
                      c.text(
                        ` you are waiting for is available and held for you for ${HOLD_DAYS} days. ` +
                          "Request it from the tool library before then, or it passes to the next person on the waitlist.",
                      ),
                    ),
                  ),
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ],
  response: { notified_user_id: ref("notified_user_id") },
});

export const expireHoldsFn = defineFunction({
  name: "expire_waitlist_holds",
  description: "Drop waitlist holds nobody acted on and pass each item to the next member.",
  stack: [
    s.set_var("cutoff", withFilters(c.now(), fl.sub(HOLD_MS))),
    s.db.query({
      table: waitlistTable,
      where: [
        expr(col("notified_at"), "!=", c.null()),
        expr(col("notified_at"), "<", ref("cutoff")),
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
      as: "lapsed",
    }),
    s.foreach({
      list: ref("lapsed"),
      as: "entry",
      body: [
        s.db.del({ table: waitlistTable, fieldValue: ref("entry.id") }),
        s.try_catch({
          try: [
            s.util.send_email({
              service_provider: c.text("xano"),
              to: ref("entry.user_email"),
              subject: withFilters(c.text("Your hold on "), fl.concat(ref("entry.item_name")), fl.concat(c.text(" has expired"))),
              message: withFilters(
                c.text("Hi "),
                fl.concat(ref("entry.user_name")),
                fl.concat(c.text(", the ")),
                fl.concat(ref("entry.item_name")),
                fl.concat(
                  c.text(
                    ` was held for you for ${HOLD_DAYS} days and nobody requested it, so it has passed to the next person ` +
                      "and you are off its waitlist. Join the waitlist again from the tool library if you still need it.",
                  ),
                ),
              ),
            }),
          ],
        }),
        s.function.run({ fn: notifyWaitlistFn, input: { item_id: ref("entry.item_id") }, as: "notice" }),
      ],
    }),
  ],
  response: { expired: withFilters(ref("lapsed"), fl.count()) },
});

export const removeWaitlistEntryFn = defineFunction({
  name: "remove_waitlist_entry",
  description: "Remove a waitlist entry and pass a held item to the next member.",
  input: { entry_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: waitlistTable, fieldValue: inp("entry_id"), as: "entry" }),
    guard.found("entry", { message: "Waitlist entry not found." }),
    s.db.del({ table: waitlistTable, fieldValue: inp("entry_id") }),
    s.conditional({
      when: expr(ref("entry.notified_at"), "!=", c.null()),
      then: [s.function.run({ fn: notifyWaitlistFn, input: { item_id: ref("entry.item_id") } })],
    }),
  ],
  response: { id: inp("entry_id"), removed: c.bool(true) },
});
