import { query, input, inp, col, expr, s, ref, auth, c, guard } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemTable } from "../tables/item.js";
import { waitlistTable } from "../tables/waitlist.js";
import { api } from "./group.js";

const mine = [
  expr(col("item_id"), "=", inp("id")),
  expr(col("user_id"), "=", auth("id")),
];

export const joinWaitlistQuery = query({
  name: "items/{id}/waitlist",
  verb: "POST",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: itemTable, fieldValue: inp("id"), as: "item" }),
    guard.found("item", { message: "Item not found." }),
    s.precondition({
      expr: expr(ref("item.status"), "!=", c.text("retired")),
      error_type: "badrequest",
      error: c.text("This item is retired."),
    }),
    s.db.query({ table: waitlistTable, where: mine, returnType: "exists", as: "already" }),
    s.precondition({
      expr: expr(ref("already"), "=", c.bool(false)),
      error_type: "badrequest",
      error: c.text("You are already on the waitlist."),
    }),
    s.db.add({
      table: waitlistTable,
      row: { item_id: inp("id"), user_id: auth("id") },
      as: "entry",
    }),
  ],
  response: ref("entry"),
});

export const leaveWaitlistQuery = query({
  name: "items/{id}/waitlist",
  verb: "DELETE",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    s.db.query({ table: waitlistTable, where: mine, returnType: "single", as: "entry" }),
    guard.found("entry", { message: "You are not on the waitlist." }),
    s.db.del({ table: waitlistTable, fieldValue: ref("entry.id") }),
  ],
  response: { item_id: inp("id"), removed: c.bool(true) },
});

export const myWaitlistQuery = query({
  name: "me/waitlist",
  verb: "GET",
  apiGroup: api,
  auth: userTable,
  stack: [
    s.db.query({
      table: waitlistTable,
      where: expr(col("user_id"), "=", auth("id")),
      bind: [
        {
          table: itemTable,
          as: "item_row",
          join: "left",
          where: expr(col("item_id"), "=", col("item_row.id")),
        },
      ],
      eval: [{ name: "item_row.name", as: "item_name" }],
      sort: [{ sortBy: "created_at", dir: "asc" }],
      as: "entries",
    }),
  ],
  response: ref("entries"),
});
