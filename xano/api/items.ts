import { query, input, inp, expr, and, s, ref, c, guard, withFilters, fl } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemDetailFn } from "../functions/item_detail.js";
import { listItemsFn } from "../functions/list_items.js";
import { notifyWaitlistFn } from "../functions/waitlist_notice.js";
import { ITEM_STATUSES, itemTable } from "../tables/item.js";
import { api } from "./group.js";

export const itemsQuery = query({
  name: "items",
  verb: "GET",
  apiGroup: api,
  input: {
    category: input.text(),
    status: input.enum([...ITEM_STATUSES]),
  },
  stack: [s.function.run({ fn: listItemsFn, input: { category: inp("category"), status: inp("status") }, as: "rows" })],
  response: ref("rows"),
});

export const itemQuery = query({
  name: "items/{id}",
  verb: "GET",
  apiGroup: api,
  input: { id: input.int({ required: true }) },
  stack: [s.function.run({ fn: itemDetailFn, input: { item_id: inp("id") }, as: "detail" })],
  response: ref("detail"),
});

export const createItemQuery = query({
  name: "items",
  verb: "POST",
  apiGroup: api,
  auth: userTable,
  input: {
    name: input.text({ required: true }),
    category: input.text({ required: true }),
    description: input.text(),
    photo: input.text(),
    status: input.enum([...ITEM_STATUSES]),
  },
  stack: [
    ...guard.role(userTable, "admin"),
    s.db.add({
      table: itemTable,
      row: {
        name: inp("name"),
        category: inp("category"),
        description: inp("description"),
        photo: inp("photo"),
        status: withFilters(inp("status"), fl.first_notnull("available")),
      },
      as: "item",
    }),
  ],
  response: ref("item"),
});

const keep = (field: "name" | "category" | "description" | "photo" | "status") =>
  withFilters(inp(field), fl.first_notnull(ref(`item.${field}`)));

export const updateItemQuery = query({
  name: "items/{id}",
  verb: "PATCH",
  apiGroup: api,
  auth: userTable,
  input: {
    id: input.int({ required: true }),
    name: input.text(),
    category: input.text(),
    description: input.text(),
    photo: input.text(),
    status: input.enum([...ITEM_STATUSES]),
  },
  stack: [
    ...guard.role(userTable, "admin"),
    s.db.get({ table: itemTable, fieldValue: inp("id"), as: "item" }),
    guard.found("item"),
    s.db.edit({
      table: itemTable,
      fieldValue: inp("id"),
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
      then: [s.function.run({ fn: notifyWaitlistFn, input: { item_id: inp("id") } })],
    }),
  ],
  response: ref("updated"),
});
