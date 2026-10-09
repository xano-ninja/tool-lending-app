import { table, f } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemTable } from "./item.js";

export const conditionNoteTable = table({
  name: "condition_note",
  schema: {
    item_id: f.tableRef(itemTable, { required: true }),
    user_id: f.tableRef(userTable, { required: true }),
    note: f.text({ required: true, methods: ["trim"] }),
  },
  index: [{ type: "btree", fields: [{ name: "item_id" }] }],
});
