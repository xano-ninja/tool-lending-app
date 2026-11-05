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
import { cancelLoanQuery, myLoansQuery, requestLoanQuery } from "./api/loans.js";
import { memberLoansQuery, membersQuery } from "./api/members.js";
import { addNoteQuery } from "./api/notes.js";
import { joinWaitlistQuery, leaveWaitlistQuery, myWaitlistQuery, itemWaitlistQuery, removeWaitlistEntryQuery } from "./api/waitlist.js";
import { flagOverdueFn } from "./functions/flag_overdue.js";
import { itemDetailFn } from "./functions/item_detail.js";
import { listItemsFn } from "./functions/list_items.js";
import { listLoansFn } from "./functions/list_loans.js";
import { cancelLoanFn, checkoutLoanFn, returnLoanFn, transitionLoanFn } from "./functions/loan_transitions.js";
import { listMembersFn, memberHistoryFn, memberLoansFn } from "./functions/members.js";
import { addNoteFn } from "./functions/notes.js";
import { requestLoanFn } from "./functions/request_loan.js";
import { updateItemFn } from "./functions/update_item.js";
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
  cancelApprovedTest,
  cancelMissingTest,
  cancelOtherMemberTest,
  cancelTest,
  cancelTwiceTest,
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
import {
  itemDetailIdleTest,
  itemDetailMissingTest,
  itemDetailTest,
  listItemsFilterTest,
  updateItemKeepsTest,
  updateItemMissingTest,
  updateItemRepairedTest,
  updateItemStillAvailableTest,
} from "./tests/items.js";
import { addNoteMissingItemTest, addNoteTest } from "./tests/notes.js";
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
  joinMissingTest,
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
    cancelLoanFn,
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
    listItemsFn,
    itemDetailFn,
    updateItemFn,
    listLoansFn,
    addNoteFn,
  ])
  .registerTasks([overdueTask, waitlistTask])
  .registerQueries([
    itemsQuery,
    itemQuery,
    createItemQuery,
    updateItemQuery,
    requestLoanQuery,
    myLoansQuery,
    cancelLoanQuery,
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
    listItemsFilterTest,
    itemDetailTest,
    itemDetailIdleTest,
    itemDetailMissingTest,
    updateItemKeepsTest,
    updateItemRepairedTest,
    updateItemStillAvailableTest,
    updateItemMissingTest,
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
    cancelTest,
    cancelApprovedTest,
    cancelTwiceTest,
    cancelMissingTest,
    cancelOtherMemberTest,
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
    joinMissingTest,
    membersSortedTest,
    addNoteTest,
    addNoteMissingItemTest,
    memberLoansTest,
    memberWaitlistTest,
    memberMissingTest,
    memberEmptyHistoryTest,
  ]);

export default registerAuth(app, { canonical: "authn" });
