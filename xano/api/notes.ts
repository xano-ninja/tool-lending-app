import { query, input, inp, s, ref, auth, guard } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { addNoteFn } from "../functions/notes.js";
import { api } from "./group.js";

export const addNoteQuery = query({
  name: "items/{id}/notes",
  verb: "POST",
  apiGroup: api,
  auth: userTable,
  input: {
    id: input.int({ required: true }),
    note: input.text({ required: true, methods: ["trim", "min:1"] }),
  },
  stack: [
    ...guard.role(userTable, "admin"),
    s.function.run({
      fn: addNoteFn,
      input: { item_id: inp("id"), user_id: auth("id"), note: inp("note") },
      as: "note",
    }),
  ],
  response: ref("note"),
});
