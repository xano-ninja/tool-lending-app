import { query, input, inp, col, cmp, expr, s, ref, c, guard, withFilters, fl } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { conditionNoteTable } from "../tables/condition_note.js";
import { ITEM_STATUSES, itemTable } from "../tables/item.js";
import { loanTable } from "../tables/loan.js";
import { waitlistTable } from "../tables/waitlist.js";
import { api } from "./group.js";

export const itemsQuery = query({
  name: "items",
  verb: "GET",
  apiGroup: api,
  input: {
    category: input.text(),
    status: input.enum([...ITEM_STATUSES]),
  },
  stack: [
    s.db.query({
      table: itemTable,
      where: [
        cmp(col("category"), "=", inp("category"), { ignoreEmpty: true }),
        cmp(col("status"), "=", inp("status"), { ignoreEmpty: true }),
      ],
      sort: [{ sortBy: "name", dir: "asc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});

export const itemQuery = query({
  name: "items/{id}",
  verb: "GET",
  apiGroup: api,
  input: { id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: itemTable, fieldValue: inp("id"), as: "item" }),
    guard.found("item"),
    s.db.query({
      table: loanTable,
      where: [
        expr(col("item_id"), "=", inp("id")),
        cmp(col("status"), "in", c.array(["approved", "out"])),
      ],
      sort: [{ sortBy: "start_date", dir: "asc" }],
      output: ["id", "start_date", "due_date", "status"],
      returnType: "single",
      as: "current_loan",
    }),
    s.db.query({
      table: waitlistTable,
      where: expr(col("item_id"), "=", inp("id")),
      returnType: "count",
      as: "waitlist_count",
    }),
    s.db.query({
      table: conditionNoteTable,
      where: expr(col("item_id"), "=", inp("id")),
      sort: [{ sortBy: "created_at", dir: "desc" }],
      output: ["id", "created_at", "note"],
      as: "notes",
    }),
    s.db.query({
      table: loanTable,
      where: [
        expr(col("item_id"), "=", inp("id")),
        cmp(col("status"), "in", c.array(["out", "returned"])),
      ],
      sort: [{ sortBy: "start_date", dir: "desc" }],
      output: ["id", "start_date", "due_date", "returned_at", "status"],
      as: "history",
    }),
  ],
  response: {
    item: ref("item"),
    current_loan: ref("current_loan"),
    waitlist_count: ref("waitlist_count"),
    notes: ref("notes"),
    history: ref("history"),
  },
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
  ],
  response: ref("updated"),
});
