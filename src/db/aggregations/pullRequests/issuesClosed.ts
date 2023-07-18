import { PartialWithUserIdContributionDoc } from "../../../models/models.js";
import { match, merge } from "../customStages.js";

const issuesClosed = () => {
  return [
    {
      $group: {
        _id: null,
        issuesClosed: {
          $sum: "$closingIssuesReferencesCount",
        },
      },
    },
    {
      $unset: "_id",
    },
  ];
};


/**
 * @description 
 * Computes the number of issues closed by the user.
 * It accumulates the 'closing issues references' on the MERGED pull requests.
 * 
 * To do this it crates a copy of the filter and adds to it 
 * the property 'state' with the value 'MERGED'.
 */
export default (
  filter: PartialWithUserIdContributionDoc,
  options?: { merge?: boolean; }
) => {
  return Array.prototype.concat(
    // Create new filter object to avoid mutating the original filter object
    match( Object.assign({}, filter, { "state": "MERGED" })),
    issuesClosed(),
    merge(filter, "pullRequests", options?.merge ?? true),
  );
};