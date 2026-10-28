import { query, input, inp, s, ref, auth, guard } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { joinWaitlistFn, leaveWaitlistFn, removeWaitlistEntryFn } from "../functions/waitlist_notice.js";
import { itemWaitlistFn, memberWaitlistFn } from "../functions/waitlist_queue.js";
import { api } from "./group.js";

export const joinWaitlistQuery = query({
  name: "items/{id}/waitlist",
  verb: "POST",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    s.function.run({
      fn: joinWaitlistFn,
      input: { item_id: inp("id"), user_id: auth("id") },
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
