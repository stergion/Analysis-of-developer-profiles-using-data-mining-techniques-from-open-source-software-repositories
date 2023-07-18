/* eslint-disable quote-props */

import { ObjectId } from "mongodb";
import { PartialWithUserId, PartialWithUserIdContributionDoc, PullRequestDoc, PullRequestReviewDoc, } from "../../../models/models.js";
import { match, merge, topN } from "../customStages.js";

type DateUnit = "day" | "week" | "month";

interface GroupOptions {
  groupOn?: Exclude<DateUnit | "dayOfYear", "day">;
}

const get_id = (datePart: NonNullable<GroupOptions["groupOn"]>) => {
  return {
    "year": {
      "$year": "$createdAt",
    },
    [datePart]: {
      [`$${datePart}`]: "$createdAt",
    },
  };
};

const get_dateFromParts = (datePart: NonNullable<GroupOptions["groupOn"]>): {
  "year": string,
  "month": any;
} | {
  "year": string,
  "day": string | Object;
} => {
  if (datePart === "week") {
    return {
      "year": "$_id.year",
      "day": {
        "$add": [1, { "$multiply": ["$_id.week", 7] }]
      }
    };
  }
  else if (datePart === "dayOfYear") {
    return {
      "year": "$_id.year",
      "day": "$_id.dayOfYear",
    };
  }
  else {
    return {
      "year": "$_id.year",
      "month": "$_id.month",
    };
  }

};

function group(options?: GroupOptions): Object[] {
  const {
    groupOn = "dayOfYear",
  }: GroupOptions = options ?? {};

  const prefix = "daily";

  return [
    {
      "$group": {
        "_id": get_id(groupOn),
        [`${prefix}_count`]: {
          "$count": {},
        },
        [`${prefix}_commits`]: {
          "$sum": "$commitsCount"
        },
        [`${prefix}_issues_closed`]: {
          "$sum": {
            "$cond": {
              "if": {
                "$eq": ["$state", "MERGED"]
              },
              "then": "$closingIssuesReferencesCount",
              "else": 0,
            }
          }
        },
      },
    },
    {
      "$set": {
        "date": {
          "$dateFromParts": get_dateFromParts(groupOn)
        },
      },
    },
    {
      "$unset": "_id",
    },
  ];
}

function reshapeResults() {
  const prefix = "daily";

  return [
    {
      // Create Array of State Values and Array of Dates
      "$group": {
        "_id": null,
        "date": {
          "$push": "$date"
        },
        [`_${prefix}_count`]: {
          "$push": `$${prefix}_count`
        },
        [`_${prefix}_commits`]: {
          "$push": `$${prefix}_commits`
        },
        [`_${prefix}_issues_closed`]: {
          "$push": `$${prefix}_issues_closed`
        },
      }
    },

    // Add Arrays to Wrapper Object
    {
      "$project": {
        "_id": 0,
        [`${prefix}_count`]: {
          "date": "$date",
          "v": `$_${prefix}_count`
        },
        [`${prefix}_commits`]: {
          "date": "$date",
          "v": `$_${prefix}_commits`
        },
        [`${prefix}_issues_closed`]: {
          "date": "$date",
          "v": `$_${prefix}_issues_closed`
        },
      }
    },
  ];
}


/**
 * Functrion for creating pipeline that calculates the following fields:
 * 
 * @function
 * @param {PartialWithUserIdContributionDoc} filter - Filter the result by User
 *  and optionally by Repository
 * 
 * @returns An Array representing a Mongodb aggregation pipeline 
 */
export default (
  filter: PartialWithUserIdContributionDoc,
  options?: { merge?: boolean; }
) => Array.prototype.concat(
  match<PartialWithUserId<PullRequestDoc>>(filter),
  group(),
  topN<PullRequestDoc>({ date: -1 }),
  reshapeResults(),
  merge(filter, "pullRequests", options?.merge ?? true),
);
