import { query, input, inp, s, ref, guard } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { listMembersFn, memberHistoryFn } from "../functions/members.js";
import { api } from "./group.js";

export const memberLoansQuery = query({
  name: "members/{id}/loans",
  verb: "GET",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    ...guard.role(userTable, "admin"),
    s.function.run({ fn: memberHistoryFn, input: { user_id: inp("id") }, as: "history" }),
  ],
  response: ref("history"),
});

export const membersQuery = query({
  name: "members",
  verb: "GET",
  apiGroup: api,
  auth: userTable,
  stack: [
    ...guard.role(userTable, "admin"),
    s.function.run({ fn: listMembersFn, as: "members" }),
  ],
  response: ref("members"),
});
