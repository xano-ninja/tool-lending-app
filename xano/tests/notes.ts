import { workflowTest, s, ref, c } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { addNoteFn } from "../functions/notes.js";
import { itemTable } from "../tables/item.js";

export const addNoteTest = workflowTest({
  name: "add note records the note against the item",
  stack: [
    s.db.add({
      table: userTable,
      row: { name: "admin", email: "admin@example.com", password: "borrow123", role: "admin" },
      as: "admin",
    }),
    s.db.add({
      table: itemTable,
      row: { name: "Test drill", category: "power tools", status: "available" },
      as: "item",
    }),
    s.function.run({
      fn: addNoteFn,
      input: { item_id: ref("item.id"), user_id: ref("admin.id"), note: c.text("chuck slips") },
      as: "note",
    }),
    s.expect.to_equal({ expr: ref("note.item_id"), value: ref("item.id") }),
    s.expect.to_equal({ expr: ref("note.user_id"), value: ref("admin.id") }),
    s.expect.to_equal({ expr: ref("note.note"), value: c.text("chuck slips") }),
  ],
});

export const addNoteMissingItemTest = workflowTest({
  name: "add note refuses an unknown item",
  stack: [
    s.expect.to_throw({
      body: [
        s.function.run({
          fn: addNoteFn,
          input: { item_id: c.int(999999), user_id: c.int(1), note: c.text("bent") },
        }),
      ],
      exception: c.text("Item not found"),
    }),
  ],
});
