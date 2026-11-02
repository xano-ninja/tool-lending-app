import { query, input, inp, s, ref, guard, withFilters, fl } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemDetailFn } from "../functions/item_detail.js";
import { listItemsFn } from "../functions/list_items.js";
import { updateItemFn } from "../functions/update_item.js";
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
    s.function.run({
      fn: updateItemFn,
      input: {
        item_id: inp("id"),
        name: inp("name"),
        category: inp("category"),
        description: inp("description"),
        photo: inp("photo"),
        status: inp("status"),
      },
      as: "updated",
    }),
  ],
  response: ref("updated"),
});
