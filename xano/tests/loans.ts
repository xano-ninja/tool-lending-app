import { workflowTest, s, ref, c } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { requestLoanFn } from "../functions/request_loan.js";
import { itemTable } from "../tables/item.js";

const fixtures = (status: "available" | "retired" = "available") => [
  s.db.add({
    table: userTable,
    row: { name: "Test member", email: "member@example.com", password: "borrow123", role: "member" },
    as: "member",
  }),
  s.db.add({
    table: itemTable,
    row: { name: "Test drill", category: "power tools", status },
    as: "item",
  }),
];

const request = (start: string, due: string, as = "loan") =>
  s.function.run({
    fn: requestLoanFn,
    input: {
      user_id: ref("member.id"),
      item_id: ref("item.id"),
      start_date: c.text(start),
      due_date: c.text(due),
    },
    as,
  });

export const loanRequestTest = workflowTest({
  name: "loan request starts as requested",
  stack: [
    ...fixtures(),
    request("2026-11-01", "2026-11-08"),
    s.expect.to_equal({ expr: ref("loan.status"), value: c.text("requested") }),
    s.expect.to_equal({ expr: ref("loan.item_id"), value: ref("item.id") }),
  ],
});

export const loanDatesTest = workflowTest({
  name: "loan request refuses a due date before the start",
  stack: [
    s.expect.to_throw({
      body: [...fixtures(), request("2026-11-08", "2026-11-01")],
      exception: c.text("Due date must be on or after"),
    }),
  ],
});

export const loanDuplicateTest = workflowTest({
  name: "loan request refuses a second open request",
  stack: [
    s.expect.to_throw({
      body: [
        ...fixtures(),
        request("2026-11-01", "2026-11-08", "first"),
        request("2026-12-01", "2026-12-08", "second"),
      ],
      exception: c.text("already have an open request"),
    }),
  ],
});

export const loanRetiredTest = workflowTest({
  name: "loan request refuses a retired item",
  stack: [
    s.expect.to_throw({
      body: [...fixtures("retired"), request("2026-11-01", "2026-11-08")],
      exception: c.text("retired"),
    }),
  ],
});
