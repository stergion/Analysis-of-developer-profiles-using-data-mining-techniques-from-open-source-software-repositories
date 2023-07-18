import { IssueDoc, PartialWithUserId, PartialWithUserIdContributionDoc } from "../../../models/models.js";
import { match, merge, timeToState } from "../customStages.js";

export default (
  filter: PartialWithUserIdContributionDoc,
  options?: { merge?: boolean; }
) => Array.prototype.concat(
  match<PartialWithUserId<IssueDoc>>({ ...filter, state: "CLOSED" }),
  timeToState<IssueDoc>("CLOSED", { tts_unit: "day", recentVals: { unit: "month", amount: 12 } }),
  merge(filter, "issues", options?.merge ?? true),
);