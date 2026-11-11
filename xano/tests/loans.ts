import { workflowTest, s, ref, c } from "@xano/sdk";
import { userTable } from "@xano-sdk/auth";
import { requestLoanFn } from "../functions/request_loan.js";
import { itemTable } from "../tables/item.js";
import { LOAN_STATUSES, loanTable } from "../tables/loan.js";
import { waitlistTable } from "../tables/waitlist.js";

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
    request("2099-11-01", "2099-11-08"),
    s.expect.to_equal({ expr: ref("loan.status"), value: c.text("requested") }),
    s.expect.to_equal({ expr: ref("loan.item_id"), value: ref("item.id") }),
  ],
});

export const loanDatesTest = workflowTest({
  name: "loan request refuses a due date before the start",
  stack: [
    s.expect.to_throw({
      body: [...fixtures(), request("2099-11-08", "2099-11-01")],
      exception: c.text("Due date must be on or after"),
    }),
  ],
});

export const loanPastStartTest = workflowTest({
  name: "loan request refuses a start date in the past",
  stack: [
    s.expect.to_throw({
      body: [...fixtures(), request("2020-01-01", "2020-01-08")],
      exception: c.text("Start date cannot be in the past"),
    }),
  ],
});

export const loanDuplicateTest = workflowTest({
  name: "loan request refuses a second open request",
  stack: [
    s.expect.to_throw({
      body: [
        ...fixtures(),
        request("2099-11-01", "2099-11-08", "first"),
        request("2099-12-01", "2099-12-08", "second"),
      ],
      exception: c.text("already have an open request"),
    }),
  ],
});

export const loanRetiredTest = workflowTest({
  name: "loan request refuses a retired item",
  stack: [
    s.expect.to_throw({
      body: [...fixtures("retired"), request("2099-11-01", "2099-11-08")],
      exception: c.text("retired"),
    }),
  ],
});

export const loanWaitlistTest = workflowTest({
  name: "loan request takes the member off the waitlist",
  stack: [
    ...fixtures(),
    s.db.add({
      table: waitlistTable,
      row: { item_id: ref("item.id"), user_id: ref("member.id") },
      as: "entry",
    }),
    request("2099-11-01", "2099-11-08"),
    s.db.get({ table: waitlistTable, fieldValue: ref("entry.id"), as: "after" }),
    s.expect.to_be_null({ expr: ref("after") }),
  ],
});

const other = s.db.add({
  table: userTable,
  row: { name: "Other member", email: "other@example.com", password: "borrow123", role: "member" },
  as: "other",
});

const booking = (start: string, due: string, status: (typeof LOAN_STATUSES)[number]) =>
  s.db.add({
    table: loanTable,
    row: { item_id: ref("item.id"), user_id: ref("other.id"), start_date: start, due_date: due, status },
  });

export const loanClashApprovedTest = workflowTest({
  name: "loan request refuses dates inside an approved loan",
  stack: [
    s.expect.to_throw({
      body: [
        ...fixtures(),
        other,
        booking("2099-11-01", "2099-11-08", "approved"),
        request("2099-11-05", "2099-11-12"),
      ],
      exception: c.text("booked from 2099-11-01 to 2099-11-08"),
    }),
  ],
});

export const loanClashEdgeTest = workflowTest({
  name: "loan request refuses a start on the day a loan is due back",
  stack: [
    s.expect.to_throw({
      body: [
        ...fixtures(),
        other,
        booking("2099-11-01", "2099-11-08", "out"),
        request("2099-11-08", "2099-11-10"),
      ],
      exception: c.text("booked from"),
    }),
  ],
});

export const loanClashOverdueTest = workflowTest({
  name: "loan request refuses any dates while the item is overdue",
  stack: [
    s.expect.to_throw({
      body: [
        ...fixtures(),
        other,
        booking("2026-01-01", "2026-01-08", "out"),
        request("2099-11-01", "2099-11-08"),
      ],
      exception: c.text("booked from 2026-01-01"),
    }),
  ],
});

export const loanAfterBookingTest = workflowTest({
  name: "loan request takes dates after a booking",
  stack: [
    ...fixtures(),
    other,
    booking("2099-11-01", "2099-11-08", "approved"),
    request("2099-11-09", "2099-11-16"),
    s.expect.to_equal({ expr: ref("loan.status"), value: c.text("requested") }),
  ],
});

export const loanBesidePendingTest = workflowTest({
  name: "loan request is not blocked by other pending or finished loans",
  stack: [
    ...fixtures(),
    other,
    booking("2099-11-01", "2099-11-08", "requested"),
    booking("2026-01-01", "2026-01-08", "returned"),
    request("2099-11-01", "2099-11-08"),
    s.expect.to_equal({ expr: ref("loan.status"), value: c.text("requested") }),
  ],
});
