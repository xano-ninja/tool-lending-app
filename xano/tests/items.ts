import { workflowTest, s, ref, c } from "@xano/sdk";
import { listItemsFn } from "../functions/list_items.js";
import { ITEM_STATUSES, itemTable } from "../tables/item.js";

const item = (as: string, category: string, status: (typeof ITEM_STATUSES)[number]) =>
  s.db.add({ table: itemTable, row: { name: as, category, status }, as });

export const listItemsFilterTest = workflowTest({
  name: "items list filters by category and status, sorted by name",
  stack: [
    item("saw", "power tools", "available"),
    item("drill", "power tools", "available"),
    item("sander", "power tools", "in_repair"),
    item("ladder", "access", "available"),
    s.function.run({
      fn: listItemsFn,
      input: { category: c.text("power tools"), status: c.text("available") },
      as: "rows",
    }),
    s.expect.to_equal({ expr: ref("rows.0.name"), value: c.text("drill") }),
    s.expect.to_equal({ expr: ref("rows.1.name"), value: c.text("saw") }),
    s.expect.to_not_be_defined({ expr: ref("rows.2") }),
  ],
});
