/* eslint-disable quote-props */

import { PartialWithUserIdContributionDoc } from "../../../models/models.js";
import { limit, match, merge } from "../customStages.js";

type DateUnit = "day" | "week" | "month";

interface SetWindowFieldsOptions {
  documents?: {
    start: number,
  },
  limitN?: number;
}

function setWindowFields(options?: SetWindowFieldsOptions): Object[] {
  const {
    documents = { start: 0 },
    limitN
  }: SetWindowFieldsOptions = options ?? {};

  const prefix = documents.start === 0 ? "" : "movAvg_";
  const originalSortField = "committedDate";

  return [
    //  Create per Commit Metrics
    {
      "$setWindowFields": {
        "sortBy": {
          [originalSortField]: 1,
        },
        "output": {
          "additions_per_contrib": {
            "$avg": "$additions",
            "window": {
              "documents": [
                documents.start, "current"
              ]
            }
          },
          "deletions_per_contrib": {
            "$avg": "$deletions",
            "window": {
              "documents": [
                documents.start, "current"
              ]
            }
          },
          "comments_per_contrib": {
            "$avg": "$commentsCount",
            "window": {
              "documents": [
                documents.start, "current"
              ]
            }
          },
          "associatedPullRequests_per_contrib": {
            "$avg": "$associatedPullRequestsCount",
            "window": {
              "documents": [
                documents.start, "current"
              ]
            }
          },
        },
      },
    },

    {
      "$sort": {
        [originalSortField]: - 1
      }
    },
    ...limit(limitN),

    // Create Array with All the Values of each Field (Metric)
    {
      "$group": {
        "_id": null,
        "date": {
          "$push": `$${originalSortField}`
        },
        [`_additions_per_contrib`]: {
          "$push": "$$CURRENT.additions_per_contrib"
        },
        [`_deletions_per_contrib`]: {
          "$push": "$$CURRENT.deletions_per_contrib"
        },
        [`_comments_per_contrib`]: {
          "$push": "$$CURRENT.comments_per_contrib"
        },
        [`_associatedPullRequests_per_contrib`]: {
          "$push": "$$CURRENT.associatedPullRequests_per_contrib"
        },
      }
    },

    // Reshape to Objects of Date[] and Values[]: {date: date[], v: metric[]}
    {
      "$project": {
        "_id": 0,
        [`${prefix}additions_per_contrib`]: {
          "date": "$date",
          "v": "$_additions_per_contrib"
        },
        [`${prefix}deletions_per_contrib`]: {
          "date": "$date",
          "v": "$_deletions_per_contrib"
        },
        [`${prefix}comments_per_contrib`]: {
          "date": "$date",
          "v": "$_comments_per_contrib"
        },
        [`${prefix}associatedPullRequests_per_contrib`]: {
          "date": "$date",
          "v": "$_associatedPullRequests_per_contrib"
        },
      }
    },
  ];
}

/**
 * Functrion for creating pipeline that calculates the following fields:
 *  * (movAvg_)additions_per_contrib 
 *  * (movAvg_)deletions_per_contrib
 *  * (movAvg_)comments_per_contrib
 *  * (movAvg_)associatedPullRequests_per_contrib
 * 
 * @function
 * @param {PartialWithUserIdContributionDoc} filter - Filter the result by User
 *  and optionally by Repository
 * 
 * @returns An Array representing a Mongodb aggregation pipeline 
 */
export default (
  filter: PartialWithUserIdContributionDoc,
  options?: SetWindowFieldsOptions & { merge?: boolean; }
) => Array.prototype.concat(
  match(filter),
  setWindowFields(options),
  merge(filter, "commits", options?.merge ?? true),
);
