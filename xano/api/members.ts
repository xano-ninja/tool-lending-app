import { query, input, inp, col, expr, s, ref, guard } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemTable } from "../tables/item.js";
import { loanTable } from "../tables/loan.js";
import { api } from "./group.js";

export const memberLoansQuery = query({
  name: "members/{id}/loans",
  verb: "GET",
  apiGroup: api,
  auth: userTable,
  input: { id: input.int({ required: true }) },
  stack: [
    ...guard.role(userTable, "admin"),
    s.db.get({
      table: userTable,
      fieldValue: inp("id"),
      output: ["id", "name", "email", "role", "created_at"],
      as: "member",
    }),
    guard.found("member", { message: "Member not found." }),
    s.db.query({
      table: loanTable,
      where: expr(col("user_id"), "=", inp("id")),
      bind: [
        {
          table: itemTable,
          as: "item_row",
          join: "left",
          where: expr(col("item_id"), "=", col("item_row.id")),
        },
      ],
      eval: [{ name: "item_row.name", as: "item_name" }],
      sort: [{ sortBy: "start_date", dir: "desc" }],
      as: "loans",
    }),
  ],
  response: { member: ref("member"), loans: ref("loans") },
});
