import { table, f } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemTable } from "./item.js";

export const LOAN_STATUSES = ["requested", "approved", "out", "returned", "rejected"] as const;
export const OPEN_LOAN_STATUSES = ["requested", "approved", "out"] as const;

export const loanTable = table({
  name: "loan",
  schema: {
    item_id: f.tableRef(itemTable, { required: true }),
    user_id: f.tableRef(userTable, { required: true }),
    start_date: f.date({ required: true }),
    due_date: f.date({ required: true }),
    returned_at: f.timestamp({ nullable: true }),
    status: f.enum([...LOAN_STATUSES], { required: true, default: "requested" }),
  },
  index: [
    { type: "btree", fields: [{ name: "item_id" }] },
    { type: "btree", fields: [{ name: "user_id" }] },
    { type: "btree", fields: [{ name: "status" }] },
  ],
});
