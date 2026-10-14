import { workspace } from "@xano/sdk";
import { registerAuth } from "@xano-sdk/auth";
import { api } from "./api/group.js";
import {
  approveLoanQuery,
  checkoutLoanQuery,
  loansQuery,
  rejectLoanQuery,
  returnLoanQuery,
} from "./api/admin_loans.js";
import { createItemQuery, itemQuery, itemsQuery, updateItemQuery } from "./api/items.js";
import { myLoansQuery, requestLoanQuery } from "./api/loans.js";
import { memberLoansQuery } from "./api/members.js";
import { addNoteQuery } from "./api/notes.js";
import { joinWaitlistQuery, leaveWaitlistQuery, myWaitlistQuery, itemWaitlistQuery } from "./api/waitlist.js";
import { flagOverdueFn } from "./functions/flag_overdue.js";
import { checkoutLoanFn, returnLoanFn, transitionLoanFn } from "./functions/loan_transitions.js";
import { requestLoanFn } from "./functions/request_loan.js";
import { conditionNoteTable } from "./tables/condition_note.js";
import { itemTable } from "./tables/item.js";
import { loanTable } from "./tables/loan.js";
import { waitlistTable } from "./tables/waitlist.js";
import { overdueTask } from "./tasks/overdue.js";
import {
  approveTest,
  approveTwiceTest,
  checkoutRepairTest,
  checkoutTest,
  returnNoWaitlistTest,
  returnTest,
  returnTwiceTest,
} from "./tests/admin_loans.js";
import {
  loanDatesTest,
  loanDuplicateTest,
  loanRequestTest,
  loanRetiredTest,
  loanWaitlistTest,
} from "./tests/loans.js";
import { overdueTest } from "./tests/overdue.js";

const app = workspace("tool-lending-app")
  .registerTables([itemTable, loanTable, waitlistTable, conditionNoteTable])
  .registerApiGroups([api])
  .registerFunctions([
    requestLoanFn,
    transitionLoanFn,
    checkoutLoanFn,
    returnLoanFn,
    flagOverdueFn,
  ])
  .registerTasks([overdueTask])
  .registerQueries([
    itemsQuery,
    itemQuery,
    createItemQuery,
    updateItemQuery,
    requestLoanQuery,
    myLoansQuery,
    joinWaitlistQuery,
    leaveWaitlistQuery,
    myWaitlistQuery,
    itemWaitlistQuery,
    addNoteQuery,
    loansQuery,
    approveLoanQuery,
    rejectLoanQuery,
    checkoutLoanQuery,
    returnLoanQuery,
    memberLoansQuery,
  ])
  .registerWorkflowTests([
    loanRequestTest,
    loanDatesTest,
    loanDuplicateTest,
    loanRetiredTest,
    loanWaitlistTest,
    approveTest,
    approveTwiceTest,
    checkoutTest,
    checkoutRepairTest,
    returnTest,
    returnNoWaitlistTest,
    returnTwiceTest,
    overdueTest,
  ]);

export default registerAuth(app, { canonical: "authn" });
