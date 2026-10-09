import { table, f } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemTable } from "./item.js";

export const waitlistTable = table({
  name: "waitlist",
  schema: {
    item_id: f.tableRef(itemTable, { required: true }),
    user_id: f.tableRef(userTable, { required: true }),
  },
  index: [
    { type: "unique", fields: [{ name: "item_id" }, { name: "user_id" }] },
    { type: "btree", fields: [{ name: "user_id" }] },
  ],
});
