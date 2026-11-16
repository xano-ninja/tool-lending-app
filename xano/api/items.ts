import { query, input, inp, s, ref, guard } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { createItemFn } from "../functions/create_item.js";
import { itemDetailFn } from "../functions/item_detail.js";
import { clearItemPhotoFn, setItemPhotoFn } from "../functions/item_photo.js";
import { listItemsFn } from "../functions/list_items.js";
import { updateItemFn } from "../functions/update_item.js";
import { ITEM_STATUSES } from "../tables/item.js";
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
    status: input.enum([...ITEM_STATUSES]),
  },
  stack: [
    ...guard.role(userTable, "admin"),
    s.function.run({
      fn: createItemFn,
      input: {
        name: inp("name"),
        category: inp("category"),
        description: inp("description"),
        status: inp("status"),
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
        status: inp("status"),
      },
      as: "updated",
    }),
  ],
  response: ref("updated"),
});

export const setItemPhotoQuery = query({
  name: "items/{id}/photo",
  verb: "POST",
  apiGroup: api,
  auth: userTable,
  input: {
    id: input.int({ required: true }),
    photo: input.file({ required: true }),
  },
  stack: [
    ...guard.role(userTable, "admin"),
    s.function.run({ fn: setItemPhotoFn, input: { item_id: inp("id"), photo: inp("photo") }, as: "updated" }),
  ],
  response: ref("updated"),
});

export const clearItemPhotoQuery = query({
  name: "items/{id}/photo",
  verb: "DELETE",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    ...guard.role(userTable, "admin"),
    s.function.run({ fn: clearItemPhotoFn, input: { item_id: inp("id") }, as: "updated" }),
  ],
  response: ref("updated"),
});
