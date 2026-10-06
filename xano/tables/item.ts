import { table, f } from "@xano/sdk";

export const ITEM_STATUSES = ["available", "on_loan", "in_repair", "retired"] as const;

export const itemTable = table({
  name: "item",
  schema: {
    name: f.text({ required: true }),
    category: f.text({ required: true }),
    description: f.text(),
    photo: f.text(),
    status: f.enum([...ITEM_STATUSES], { required: true, default: "available" }),
  },
  index: [
    { type: "btree", fields: [{ name: "category" }] },
    { type: "btree", fields: [{ name: "status" }] },
  ],
  seed: [
    { name: "Cordless drill", category: "power tools", description: "18V drill with two batteries.", status: "available" },
    { name: "Circular saw", category: "power tools", description: "7 1/4 inch blade.", status: "on_loan" },
    { name: "Step ladder", category: "ladders", description: "Six foot, fiberglass.", status: "available" },
    { name: "Hand saw", category: "hand tools", description: "Crosscut, 20 inch.", status: "in_repair" },
  ],
});
