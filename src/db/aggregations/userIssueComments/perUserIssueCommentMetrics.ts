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

function setWindowFields(options?: SetWindowFieldsOptions, contribution_type?: string): Object[] {
  const {
    documents = { start: 0 },
    limitN
  }: SetWindowFieldsOptions = options ?? {};

  const type_ = contribution_type?.trim() ? `${contribution_type}s_` : ""

  const prefix = documents.start === 0 ? "" : "movAvg_";
  const originalSortField = "publishedAt";

  return [
    //  Create per User Issue Comment Metrics
    {
      "$setWindowFields": {
        "sortBy": {
          [originalSortField]: 1,
        },
        "output": {
          "reactions_per_contrib": {
            "$avg": "$reactionsCount",
            "window": {
              "documents": [
                documents.start, "current"
              ]
            }
          },
          "body_len_per_contrib": {
            "$avg": {
              "$strLenCP": "$body"
            },
            "window": {
              "documents": [
                documents.start, "current"
              ]
            }
          }
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
        [`_reactions_per_contrib`]: {
          "$push": "$$CURRENT.reactions_per_contrib"
        },
        [`_body_len_per_contrib`]: {
          "$push": "$$CURRENT.body_len_per_contrib"
        }
      }
    },

    // Reshape to Objects of Date[] and Values[]: {date: date[], v: metric[]}
    {
      "$project": {
        "_id": 0,
        [`${type_}${prefix}reactions_per_contrib`]: {
          "date": "$date",
          "v": "$_reactions_per_contrib"
        },
        [`${type_}${prefix}body_len_per_contrib`]: {
          "date": "$date",
          "v": "$_body_len_per_contrib"
        }
      }
    },
  ];
}


/**
 * Function for creating pipeline that calculates the following fields:
 *  * (movAvg_)reactions_per_contrib
 *  * (movAvg_)body_len_per_contrib
 * 
 * @function
 * @param filter - Filter the result by User and optionally by Repository
 * @param options - Agregation pipeline options.
 * 
 * @returns An Array representing a Mongodb aggregation pipeline 
 */
export default (
  filter: PartialWithUserIdContributionDoc & { "associatedIssue.type"?: "Issue" | "PullRequest"; },
  options?: SetWindowFieldsOptions & { merge?: boolean; }
) => Array.prototype.concat(
  match(filter),
  setWindowFields(options, filter["associatedIssue.type"]),
  merge(filter, "userIssueComments", options?.merge ?? true),
);
