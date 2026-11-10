import { defineFunction, input, inp, s, ref, c, expect, resp, withFilters, fl } from "@xano/sdk";
import { ITEM_STATUSES, itemTable } from "../tables/item.js";

export const createItemFn = defineFunction({
  name: "create_item",
  description: "Add an item to the catalog, available unless a status is given.",
  input: {
    name: input.text({ required: true }),
    category: input.text({ required: true }),
    description: input.text(),
    photo: input.text(),
    status: input.enum([...ITEM_STATUSES]),
  },
  stack: [
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
  tests: [
    {
      name: "defaults to available",
      input: { name: c.text("drill"), category: c.text("power tools") },
      expect: [
        expect.to_equal(resp("name"), c.text("drill")),
        expect.to_equal(resp("category"), c.text("power tools")),
        expect.to_equal(resp("status"), c.text("available")),
      ],
    },
    {
      name: "keeps a given status",
      input: { name: c.text("sander"), category: c.text("power tools"), status: c.text("in_repair") },
      expect: [expect.to_equal(resp("status"), c.text("in_repair"))],
    },
  ],
});
