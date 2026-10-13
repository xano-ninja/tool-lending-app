import { task, s, every } from "@xano/sdk";
import { flagOverdueFn } from "../functions/flag_overdue.js";

export const overdueTask = task({
  name: "nightly_overdue",
  description: "Flag loans past their due date and email the borrowers.",
  schedule: [{ startsOn: "2026-10-14T03:00:00Z", freq: every("1d") }],
  stack: [s.function.run({ fn: flagOverdueFn, as: "result" })],
});
