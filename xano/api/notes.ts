import { query, input, inp, s, ref, auth, guard } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { conditionNoteTable } from "../tables/condition_note.js";
import { itemTable } from "../tables/item.js";
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
    s.db.get({ table: itemTable, fieldValue: inp("id"), as: "item" }),
    guard.found("item", { message: "Item not found." }),
    s.db.add({
      table: conditionNoteTable,
      row: { item_id: inp("id"), user_id: auth("id"), note: inp("note") },
      as: "note",
    }),
  ],
  response: ref("note"),
});
