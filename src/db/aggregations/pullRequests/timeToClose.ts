import { PartialWithUserId, PartialWithUserIdContributionDoc, PullRequestDoc } from "../../../models/models.js";
import { match, merge, timeToState } from "../customStages.js";

export default (
  filter: PartialWithUserIdContributionDoc,
  options?: { merge?: boolean; }
) => Array.prototype.concat(
  match<PartialWithUserId<PullRequestDoc>>({ ...filter, state: "CLOSED" }),
  timeToState<PullRequestDoc>("CLOSED", { tts_unit: "hour", recentVals: { unit: "month", amount: 12 } }),
  merge(filter, "pullRequests", options?.merge ?? true),
);