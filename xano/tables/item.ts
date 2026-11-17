import { table, f, hostedFile } from "@xano/sdk";

export const ITEM_STATUSES = ["available", "on_loan", "in_repair", "retired"] as const;

export const itemTable = table({
  name: "item",
  schema: {
    name: f.text({ required: true }),
    category: f.text({ required: true }),
    description: f.text(),
    photo: f.image(),
    status: f.enum([...ITEM_STATUSES], { required: true, default: "available" }),
  },
  index: [
    { type: "btree", fields: [{ name: "category" }] },
    { type: "btree", fields: [{ name: "status" }] },
  ],
  seed: [
    { name: "Cordless drill", photo: hostedFile("./photos/drill.png", import.meta.url), category: "power tools", description: "18V drill with two batteries.", status: "available" },
    { name: "Circular saw", photo: hostedFile("./photos/circular_saw.png", import.meta.url), category: "power tools", description: "7 1/4 inch blade.", status: "on_loan" },
    { name: "Step ladder", photo: hostedFile("./photos/step_ladder.png", import.meta.url), category: "ladders", description: "Six foot, fiberglass.", status: "available" },
    { name: "Hand saw", photo: hostedFile("./photos/hand_saw.png", import.meta.url), category: "hand tools", description: "Crosscut, 20 inch.", status: "in_repair" },
  ],
});
