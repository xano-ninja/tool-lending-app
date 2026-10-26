import { query, input, inp, col, expr, s, ref, auth, c, guard } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { leaveWaitlistFn, removeWaitlistEntryFn } from "../functions/waitlist_notice.js";
import { itemWaitlistFn, memberWaitlistFn } from "../functions/waitlist_queue.js";
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
    s.function.run({
      fn: leaveWaitlistFn,
      input: { item_id: inp("id"), user_id: auth("id") },
      as: "result",
    }),
  ],
  response: ref("result"),
});

export const myWaitlistQuery = query({
  name: "me/waitlist",
  verb: "GET",
  apiGroup: api,
  auth: userTable,
  stack: [s.function.run({ fn: memberWaitlistFn, input: { user_id: auth("id") }, as: "entries" })],
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
    s.function.run({ fn: itemWaitlistFn, input: { item_id: inp("id") }, as: "entries" }),
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
    s.function.run({ fn: removeWaitlistEntryFn, input: { entry_id: inp("id") }, as: "result" }),
  ],
  response: ref("result"),
});
