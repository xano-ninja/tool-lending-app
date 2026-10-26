import { defineFunction, input, inp, col, expr, s, ref, guard } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { itemTable } from "../tables/item.js";
import { loanTable } from "../tables/loan.js";
import { memberWaitlistFn } from "./waitlist_queue.js";

export const listMembersFn = defineFunction({
  name: "list_members",
  stack: [
    s.db.query({
      table: userTable,
      output: ["id", "name", "email", "role", "created_at"],
      sort: [{ sortBy: "name", dir: "asc" }],
      as: "members",
    }),
  ],
  response: ref("members"),
});

export const memberLoansFn = defineFunction({
  name: "member_loans",
  description: "A member's loans, newest start date first, with item names.",
  input: { user_id: input.int({ required: true }) },
  stack: [
    s.db.query({
      table: loanTable,
      where: expr(col("user_id"), "=", inp("user_id")),
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
  response: ref("loans"),
});

export const memberHistoryFn = defineFunction({
  name: "member_history",
  description: "One member with their loans and waitlist entries.",
  input: { user_id: input.int({ required: true }) },
  stack: [
    s.db.get({
      table: userTable,
      fieldValue: inp("user_id"),
      output: ["id", "name", "email", "role", "created_at"],
      as: "member",
    }),
    guard.found("member", { message: "Member not found." }),
    s.function.run({ fn: memberLoansFn, input: { user_id: inp("user_id") }, as: "loans" }),
    s.function.run({ fn: memberWaitlistFn, input: { user_id: inp("user_id") }, as: "waitlist" }),
  ],
  response: { member: ref("member"), loans: ref("loans"), waitlist: ref("waitlist") },
});
