import { query, input, inp, col, expr, s, ref, auth, c, guard } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { notifyWaitlistFn } from "../functions/waitlist_notice.js";
import { itemTable } from "../tables/item.js";
import { waitlistTable } from "../tables/waitlist.js";
import { api } from "./group.js";

const mine = [
  expr(col("item_id"), "=", inp("id")),
  expr(col("user_id"), "=", auth("id")),
];

const passTurn = s.conditional({
  when: expr(ref("entry.notified_at"), "!=", c.null()),
  then: [s.function.run({ fn: notifyWaitlistFn, input: { item_id: ref("entry.item_id") } })],
});

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
    passTurn,
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

export const itemWaitlistQuery = query({
  name: "items/{id}/waitlist",
  verb: "GET",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    ...guard.role(userTable, "admin"),
    s.db.query({
      table: waitlistTable,
      where: expr(col("item_id"), "=", inp("id")),
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

export const removeWaitlistEntryQuery = query({
  name: "waitlist/{id}",
  verb: "DELETE",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    ...guard.role(userTable, "admin"),
    s.db.get({ table: waitlistTable, fieldValue: inp("id"), as: "entry" }),
    guard.found("entry", { message: "Waitlist entry not found." }),
    s.db.del({ table: waitlistTable, fieldValue: inp("id") }),
    passTurn,
  ],
  response: { id: inp("id"), removed: c.bool(true) },
});
