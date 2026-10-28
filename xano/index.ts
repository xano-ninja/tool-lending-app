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
import { joinWaitlistQuery, leaveWaitlistQuery, myWaitlistQuery, itemWaitlistQuery, removeWaitlistEntryQuery } from "./api/waitlist.js";
import { flagOverdueFn } from "./functions/flag_overdue.js";
import { listLoansFn } from "./functions/list_loans.js";
import { checkoutLoanFn, returnLoanFn, transitionLoanFn } from "./functions/loan_transitions.js";
import { listMembersFn, memberHistoryFn, memberLoansFn } from "./functions/members.js";
import { requestLoanFn } from "./functions/request_loan.js";
import { expireHoldsFn, joinWaitlistFn, leaveWaitlistFn, notifyWaitlistFn, removeWaitlistEntryFn } from "./functions/waitlist_notice.js";
import { aheadInLineAddon, itemWaitlistFn, memberWaitlistFn } from "./functions/waitlist_queue.js";
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
  listOverdueTest,
  listStatusTest,
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
import { memberEmptyHistoryTest, memberLoansTest, memberMissingTest, membersSortedTest, memberWaitlistTest } from "./tests/members.js";
import { overdueTest } from "./tests/overdue.js";
import {
  aheadInLineTest,
  expireFreshTest,
  expireManyTest,
  removeHeldTest,
  removeMissingTest,
  leaveHeldTest,
  leaveNotWaitingTest,
  expireHoldTest,
  holdFirstTest,
  holdPromisedTest,
  holdRepairTest,
  holdTakenTest,
  itemQueueTest,
  joinTest,
  joinTwiceTest,
  joinRetiredTest,
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
    joinWaitlistFn,
    leaveWaitlistFn,
    memberWaitlistFn,
    itemWaitlistFn,
    listMembersFn,
    memberLoansFn,
    memberHistoryFn,
    listLoansFn,
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
    listOverdueTest,
    listStatusTest,
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
    leaveHeldTest,
    leaveNotWaitingTest,
    itemQueueTest,
    joinTest,
    joinTwiceTest,
    joinRetiredTest,
    membersSortedTest,
    memberLoansTest,
    memberWaitlistTest,
    memberMissingTest,
    memberEmptyHistoryTest,
  ]);

export default registerAuth(app, { canonical: "authn" });
