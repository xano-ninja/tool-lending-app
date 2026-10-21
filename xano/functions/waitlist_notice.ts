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
      as: "lapsed",
    }),
    s.foreach({
      list: ref("lapsed"),
      as: "entry",
      body: [
        s.db.del({ table: waitlistTable, fieldValue: ref("entry.id") }),
        s.function.run({ fn: notifyWaitlistFn, input: { item_id: ref("entry.item_id") }, as: "notice" }),
      ],
    }),
  ],
  response: { expired: withFilters(ref("lapsed"), fl.count()) },
});
