/* eslint-disable quote-props */

import { ObjectId } from "mongodb";
import { PartialWithUserIdContributionDoc, PullRequestReviewDoc, } from "../../../models/models.js";
import { limit, match, merge, topN } from "../customStages.js";

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
  const originalSortField = "submittedAt";

  return [
    //  Create per Pull Request Review Metrics
    {
      "$setWindowFields": {
        "sortBy": {
          [originalSortField]: 1,
        },
        "output": {
          "comments_per_contrib": {
            "$avg": "$commentsCount",
            "window": {
              "documents": [
                documents.start, "current"
              ]
            },
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
        [`_comments_per_contrib`]: {
          "$push": "$$CURRENT.comments_per_contrib"
        },
        [`_body_len_per_contrib`]: {
          "$push": "$$CURRENT.body_len_per_contrib"
        }
      }
    },

    // Reshape to Objects of Dates and Values: {date: date[], v: metric[]}
    {
      "$project": {
        "_id": 0,
        [`${prefix}comments_per_contrib`]: {
          "date": "$date",
          "v": "$_comments_per_contrib"
        },
        [`${prefix}body_len_per_contrib`]: {
          "date": "$date",
          "v": "$_body_len_per_contrib"
        }
      }
    }
  ];
}


/**
 * Functrion for creating pipeline that calculates the following fields:
 *  * (movAvg_)comments_per_contrib
 *  * (movAvg_)body_len_per_contrib
 * 
 * @function
 * @param {PartialWithUserIdContributionDoc} filter - Filter the result by User and optionally by Repository
 * @param options - Agregation pipeline options.
 * 
 * @returns An Array representing a Mongodb aggregation pipeline 
 */
export default (
  filter: PartialWithUserIdContributionDoc,
  options?: SetWindowFieldsOptions & { merge?: boolean; }
) => Array.prototype.concat(
  match(filter),
  setWindowFields(options),
  merge(filter, "pullRequestReviews", options?.merge ?? true),
);
