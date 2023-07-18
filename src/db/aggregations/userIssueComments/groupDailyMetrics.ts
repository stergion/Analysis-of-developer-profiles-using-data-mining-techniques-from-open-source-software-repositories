/* eslint-disable quote-props */

import { ObjectId } from "mongodb";
import { PartialWithUserIdContributionDoc, Sortable, UserIssueCommentsDoc } from "../../../models/models.js";
import { match, merge, topN } from "../customStages.js";

type DateUnit = "day" | "week" | "month";

interface GroupOptions {
  groupOn?: Exclude<DateUnit | "dayOfYear", "day">;
}

const get_id = (datePart: NonNullable<GroupOptions["groupOn"]>): {
  "year": {
    "$year": "$publishedAt",
  },
  [key: string]: {
    [key: string]: "$publishedAt",
  },
} => {
  return {
    "year": {
      "$year": "$publishedAt",
    },
    [datePart]: {
      [`$${datePart}`]: "$publishedAt",
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

function reshapeResults(contribution_type?: string) {
  const prefix = "daily";
  const type_ = contribution_type?.trim() ? `${contribution_type}s_` : ""

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
      }
    },

    // Add Arrays to Wrapper Object
    {
      "$project": {
        "_id": 0,
        [`${type_}${prefix}_count`]: {
          "date": "$date",
          "v": `$_${prefix}_count`
        },
      }
    },
  ];
}

/**
 * Function for creating pipeline that calculates the following fields:
 * 
 * @function
 * @param {PartialWithUserIdContributionDoc} filter - Filter the result by User
 *  and optionally by Repository
 * 
 * @returns An Array representing a Mongodb aggregation pipeline 
 */
export default (
  filter: PartialWithUserIdContributionDoc & { "associatedIssue.type"?: "Issue" | "PullRequest"; },
  options?: { merge?: boolean; }
) => Array.prototype.concat(
  match(filter),
  group(),
  topN<UserIssueCommentsDoc>({ date: -1 }),
  reshapeResults(filter["associatedIssue.type"]),
  merge(filter, "userIssueComments", options?.merge ?? true),
);
