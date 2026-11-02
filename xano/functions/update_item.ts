import { defineFunction, input, inp, expr, and, s, ref, c, guard, withFilters, fl } from "@xano/sdk";
import { ITEM_STATUSES, itemTable } from "../tables/item.js";
import { notifyWaitlistFn } from "./waitlist_notice.js";

const keep = (field: "name" | "category" | "description" | "photo" | "status") =>
  withFilters(inp(field), fl.first_notnull(ref(`item.${field}`)));

export const updateItemFn = defineFunction({
  name: "update_item",
  description: "Edit an item, keeping fields left out, and notify the waitlist when it comes back.",
  input: {
    item_id: input.int({ required: true }),
    name: input.text(),
    category: input.text(),
    description: input.text(),
    photo: input.text(),
    status: input.enum([...ITEM_STATUSES]),
  },
  stack: [
    s.db.get({ table: itemTable, fieldValue: inp("item_id"), as: "item" }),
    guard.found("item", { message: "Item not found." }),
    s.db.edit({
      table: itemTable,
      fieldValue: inp("item_id"),
      row: {
        name: keep("name"),
        category: keep("category"),
        description: keep("description"),
        photo: keep("photo"),
        status: keep("status"),
      },
      as: "updated",
    }),
    s.conditional({
      when: and(
        expr(ref("item.status"), "!=", c.text("available")),
        expr(ref("updated.status"), "=", c.text("available")),
      ),
      then: [s.function.run({ fn: notifyWaitlistFn, input: { item_id: inp("item_id") } })],
    }),
  ],
  response: ref("updated"),
});
