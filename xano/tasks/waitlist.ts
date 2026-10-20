import { task, s, every } from "@xano/sdk";
import { expireHoldsFn } from "../functions/waitlist_notice.js";

export const waitlistTask = task({
  name: "nightly_waitlist",
  description: "Drop waitlist holds past their window and notify the next member.",
  schedule: [{ startsOn: "2026-10-21T03:15:00Z", freq: every("1d") }],
  stack: [s.function.run({ fn: expireHoldsFn, as: "result" })],
});
