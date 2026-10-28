import { defineFunction, input, inp, s, ref, guard } from "@xano/sdk";
import { conditionNoteTable } from "../tables/condition_note.js";
import { itemTable } from "../tables/item.js";

export const addNoteFn = defineFunction({
  name: "add_note",
  input: {
    item_id: input.int({ required: true }),
    user_id: input.int({ required: true }),
    note: input.text({ required: true, methods: ["trim", "min:1"] }),
  },
  stack: [
    s.db.get({ table: itemTable, fieldValue: inp("item_id"), as: "item" }),
    guard.found("item", { message: "Item not found." }),
    s.db.add({
      table: conditionNoteTable,
      row: { item_id: inp("item_id"), user_id: inp("user_id"), note: inp("note") },
      as: "note",
    }),
  ],
  response: ref("note"),
});
