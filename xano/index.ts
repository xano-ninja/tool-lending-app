import { workspace } from "@xano/sdk";
import { registerAuth } from "@xano-sdk/auth";
import { api } from "./api/group.js";
import {
  approveLoanQuery,
  checkoutLoanQuery,
  extendLoanQuery,
  loansQuery,
  rejectLoanQuery,
  returnLoanQuery,
} from "./api/admin_loans.js";
import { createItemQuery, itemQuery, itemsQuery, updateItemQuery } from "./api/items.js";
import { cancelLoanQuery, myLoansQuery, requestLoanQuery } from "./api/loans.js";
import { memberLoansQuery, membersQuery } from "./api/members.js";
import { addNoteQuery } from "./api/notes.js";
import { joinWaitlistQuery, leaveWaitlistQuery, myWaitlistQuery, itemWaitlistQuery, removeWaitlistEntryQuery } from "./api/waitlist.js";
import { findClashFn } from "./functions/booking.js";
import { flagOverdueFn } from "./functions/flag_overdue.js";
import { itemDetailFn } from "./functions/item_detail.js";
import { listItemsFn } from "./functions/list_items.js";
import { listLoansFn } from "./functions/list_loans.js";
import { approveLoanFn, cancelLoanFn, checkoutLoanFn, extendLoanFn, returnLoanFn, transitionLoanFn } from "./functions/loan_transitions.js";
import { listMembersFn, memberHistoryFn, memberLoansFn } from "./functions/members.js";
import { addNoteFn } from "./functions/notes.js";
import { requestLoanFn } from "./functions/request_loan.js";
import { createItemFn } from "./functions/create_item.js";
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
  approveBesideRequestTest,
  approveClashTest,
  approveMissingTest,
  approveTest,
  approveTwiceTest,
  cancelApprovedTest,
  cancelMissingTest,
  cancelNotifiesTest,
  cancelOnLoanTest,
  cancelOtherMemberTest,
  cancelTest,
  cancelTwiceTest,
  checkoutRepairTest,
  checkoutTest,
  extendClashTest,
  extendEarlierTest,
  extendNotOutTest,
  extendTest,
  listOverdueTest,
  listStatusTest,
  returnNoWaitlistTest,
  returnTest,
  returnTwiceTest,
} from "./tests/admin_loans.js";
import {
  loanAfterBookingTest,
  loanBesidePendingTest,
  loanClashApprovedTest,
  loanClashEdgeTest,
  loanClashOverdueTest,
  loanClashWrapTest,
  loanClashEndEdgeTest,
  loanDatesTest,
  loanPastStartTest,
  loanDuplicateTest,
  loanRequestTest,
  loanRetiredTest,
  loanWaitlistTest,
} from "./tests/loans.js";
import { memberEmptyHistoryTest, memberLoansTest, memberMissingTest, membersSortedTest, memberWaitlistTest } from "./tests/members.js";
import {
  itemDetailBookedTest,
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
    findClashFn,
    approveLoanFn,
    checkoutLoanFn,
    extendLoanFn,
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
    createItemFn,
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
    extendLoanQuery,
    returnLoanQuery,
    memberLoansQuery,
    membersQuery,
  ])
  .registerWorkflowTests([
    listItemsFilterTest,
    itemDetailTest,
    itemDetailBookedTest,
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
    loanClashApprovedTest,
    loanClashEdgeTest,
    loanClashOverdueTest,
    loanClashWrapTest,
    loanClashEndEdgeTest,
    loanAfterBookingTest,
    loanBesidePendingTest,
    approveTest,
    approveTwiceTest,
    approveClashTest,
    approveBesideRequestTest,
    approveMissingTest,
    checkoutTest,
    checkoutRepairTest,
    extendTest,
    extendNotOutTest,
    extendEarlierTest,
    extendClashTest,
    returnTest,
    returnNoWaitlistTest,
    returnTwiceTest,
    cancelTest,
    cancelApprovedTest,
    cancelTwiceTest,
    cancelMissingTest,
    cancelOtherMemberTest,
    cancelNotifiesTest,
    cancelOnLoanTest,
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
