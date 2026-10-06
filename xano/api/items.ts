import { query, input, inp, col, cmp, s, ref } from "@xano/sdk";
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
