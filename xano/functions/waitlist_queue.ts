import { addon, defineFunction, input, inp, col, out, expr, s, ref } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemTable } from "../tables/item.js";
import { waitlistTable } from "../tables/waitlist.js";

export const aheadInLineAddon = addon({
  name: "waitlist_ahead",
  table: waitlistTable,
  input: { item_id: input.int(), created_at: input.timestamp() },
  where: [
    expr(col("item_id"), "=", inp("item_id")),
    expr(col("created_at"), "<", inp("created_at")),
  ],
  cardinality: "count",
});

export const memberWaitlistFn = defineFunction({
  name: "member_waitlist",
  description: "A member's waitlist entries with item names and how many are ahead of them.",
  input: { user_id: input.int({ required: true }) },
  stack: [
    s.db.query({
      table: waitlistTable,
      where: expr(col("user_id"), "=", inp("user_id")),
      bind: [
        {
          table: itemTable,
          as: "item_row",
          join: "left",
          where: expr(col("item_id"), "=", col("item_row.id")),
        },
      ],
      eval: [{ name: "item_row.name", as: "item_name" }],
      addon: [
        {
          addon: aheadInLineAddon,
          as: "ahead",
          input: { item_id: out("item_id"), created_at: out("created_at") },
        },
      ],
      sort: [{ sortBy: "created_at", dir: "asc" }],
      as: "entries",
    }),
  ],
  response: ref("entries"),
});

export const itemWaitlistFn = defineFunction({
  name: "item_waitlist",
  description: "The waitlist for one item in the order members joined it.",
  input: { item_id: input.int({ required: true }) },
  stack: [
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
      eval: [{ name: "user_row.name", as: "user_name" }],
      sort: [{ sortBy: "created_at", dir: "asc" }],
      as: "entries",
    }),
  ],
  response: ref("entries"),
});
