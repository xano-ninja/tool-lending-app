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
import { memberLoansQuery, membersQuery } from "./api/members.js";
import { addNoteQuery } from "./api/notes.js";
import { aheadInLineAddon, joinWaitlistQuery, leaveWaitlistQuery, myWaitlistQuery, itemWaitlistQuery, removeWaitlistEntryQuery } from "./api/waitlist.js";
import { flagOverdueFn } from "./functions/flag_overdue.js";
import { checkoutLoanFn, returnLoanFn, transitionLoanFn } from "./functions/loan_transitions.js";
import { requestLoanFn } from "./functions/request_loan.js";
import { expireHoldsFn, notifyWaitlistFn, removeWaitlistEntryFn } from "./functions/waitlist_notice.js";
import { conditionNoteTable } from "./tables/condition_note.js";
import { itemTable } from "./tables/item.js";
import { loanTable } from "./tables/loan.js";
import { waitlistTable } from "./tables/waitlist.js";
import { overdueTask } from "./tasks/overdue.js";
import { waitlistTask } from "./tasks/waitlist.js";
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
  loanPastStartTest,
  loanDuplicateTest,
  loanRequestTest,
  loanRetiredTest,
  loanWaitlistTest,
} from "./tests/loans.js";
import { overdueTest } from "./tests/overdue.js";
import {
  aheadInLineTest,
  expireFreshTest,
  expireManyTest,
  removeHeldTest,
  removeMissingTest,
  expireHoldTest,
  holdFirstTest,
  holdPromisedTest,
  holdRepairTest,
  holdTakenTest,
} from "./tests/waitlist.js";

const app = workspace("tool-lending-app")
  .registerTables([itemTable, loanTable, waitlistTable, conditionNoteTable])
  .registerApiGroups([api])
  .registerAddons([aheadInLineAddon])
  .registerFunctions([
    requestLoanFn,
    transitionLoanFn,
    checkoutLoanFn,
    returnLoanFn,
    flagOverdueFn,
    notifyWaitlistFn,
    expireHoldsFn,
    removeWaitlistEntryFn,
  ])
  .registerTasks([overdueTask, waitlistTask])
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
    removeWaitlistEntryQuery,
    addNoteQuery,
    loansQuery,
    approveLoanQuery,
    rejectLoanQuery,
    checkoutLoanQuery,
    returnLoanQuery,
    memberLoansQuery,
    membersQuery,
  ])
  .registerWorkflowTests([
    loanRequestTest,
    loanDatesTest,
    loanPastStartTest,
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
    holdFirstTest,
    holdTakenTest,
    holdRepairTest,
    holdPromisedTest,
    expireHoldTest,
    expireFreshTest,
    expireManyTest,
    aheadInLineTest,
    removeHeldTest,
    removeMissingTest,
  ]);

export default registerAuth(app, { canonical: "authn" });
