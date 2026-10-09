import { workspace } from "@xano/sdk";
import { registerAuth } from "@xano-sdk/auth";
import { api } from "./api/group.js";
import { createItemQuery, itemQuery, itemsQuery, updateItemQuery } from "./api/items.js";
import { myLoansQuery, requestLoanQuery } from "./api/loans.js";
import { addNoteQuery } from "./api/notes.js";
import { joinWaitlistQuery, leaveWaitlistQuery, myWaitlistQuery } from "./api/waitlist.js";
import { requestLoanFn } from "./functions/request_loan.js";
import { conditionNoteTable } from "./tables/condition_note.js";
import { itemTable } from "./tables/item.js";
import { loanTable } from "./tables/loan.js";
import { waitlistTable } from "./tables/waitlist.js";
import {
  loanDatesTest,
  loanDuplicateTest,
  loanRequestTest,
  loanRetiredTest,
} from "./tests/loans.js";

const app = workspace("tool-lending-app")
  .registerTables([itemTable, loanTable, waitlistTable, conditionNoteTable])
  .registerApiGroups([api])
  .registerFunctions([requestLoanFn])
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
    addNoteQuery,
  ])
  .registerWorkflowTests([loanRequestTest, loanDatesTest, loanDuplicateTest, loanRetiredTest]);

export default registerAuth(app, { canonical: "authn" });
