/* eslint-disable quote-props */

import { PartialWithUserIdContributionDoc } from "../../../models/models.js";
import { limit, match, merge } from "../customStages.js";

type DateUnit = "day" | "week" | "month";

// interface GroupOptions {
//   groupOn?: Exclude<DateUnit | "dayOfYear", "day">;
// }

// function group(options?: GroupOptions): Object[] {
//   const {
//     groupOn = "dayOfYear",
//   }: GroupOptions = options ?? {};

//   const get_id = (datePart: NonNullable<GroupOptions["groupOn"]>): {
//     "year": {
//       "$year": "$createdAt",
//     },
//     [key: string]: {
//       [key: string]: "$createdAt",
//     },
//   } => {
//     return {
//       "year": {
//         "$year": "$createdAt",
//       },
//       [datePart]: {
//         [`$${datePart}`]: "$createdAt",
//       },
//     };
//   };

//   const get_dateFromParts = (datePart: NonNullable<GroupOptions["groupOn"]>): {
//     "year": string,
//     "month": any;
//   } | {
//     "year": string,
//     "day": string | Object;
//   } => {
//     if (datePart === "week") {
//       return {
//         "year": "$_id.year",
//         "day": {
//           "$add": [1, { "$multiply": ["$_id.week", 7] }]
//         }
//       };
//     }
//     else if (datePart === "dayOfYear") {
//       return {
//         "year": "$_id.year",
//         "day": "$_id.dayOfYear",
//       };
//     }
//     else {
//       return {
//         "year": "$_id.year",
//         "month": "$_id.month",
//       };
//     }

//   };

//   return [
//     {
//       "$group": {
//         "_id": get_id(groupOn),
//         "total_daily": {
//           "$count": {},
//         },
//         "avg_commits": {
//           "$avg": "$commitsCount",
//         },
//         "avg_reactions": {
//           "$avg": "$reactionsCount",
//         },
//         "avg_closingIssuesReferences": {
//           "$avg": "$closingIssuesReferencesCount",
//         },
//       },
//     },
//     {
//       "$set": {
//         "createdAt": {
//           "$dateFromParts": get_dateFromParts(groupOn)
//         },
//       },
//     },
//     {
//       "$unset": "_id",
//     },
//   ];
// }

interface SetWindowFieldsOptions {
  documents?: {
    start: number,
  },
  limitN?: number;
  // range?: {
  //   start?: number,
  // },
  // unit?: DateUnit;
}

function setWindowFields(options?: SetWindowFieldsOptions): Object[] {
  const {
    documents = { start: 0 },
    limitN
  }: SetWindowFieldsOptions = options ?? {};

  const prefix = documents.start === 0 ? "" : "movAvg_";
  const originalSortField = "createdAt";

  return [
    //  Create per Pull Request Metrics
    {
      "$setWindowFields": {
        "sortBy": {
          [originalSortField]: 1,
        },
        "output": {
          "commits_per_contrib": {
            "$avg": "$commitsCount",
            "window": {
              "documents": [
                documents.start, "current"
              ]
            }
          },
          "reactions_per_contrib": {
            "$avg": "$reactionsCount",
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
          "closingIssuesReferences_per_contrib": {
            "$avg": "$closingIssuesReferencesCount",
            "window": {
              "documents": [
                documents.start, "current"
              ]
            }
          },
          "title_len_per_contrib": {
            "$avg": {
              "$strLenCP": "$title"
            },
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
        [`_commits_per_contrib`]: {
          "$push": "$$CURRENT.commits_per_contrib"
        },
        [`_reactions_per_contrib`]: {
          "$push": "$$CURRENT.reactions_per_contrib"
        },
        [`_comments_per_contrib`]: {
          "$push": "$$CURRENT.comments_per_contrib"
        },
        [`_closingIssuesReferences_per_contrib`]: {
          "$push": "$$CURRENT.closingIssuesReferences_per_contrib"
        },
        [`_title_len_per_contrib`]: {
          "$push": "$$CURRENT.title_len_per_contrib"
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
        [`${prefix}commits_per_contrib`]: {
          "date": "$date",
          "v": "$_commits_per_contrib"
        },
        [`${prefix}reactions_per_contrib`]: {
          "date": "$date",
          "v": "$_reactions_per_contrib"
        },
        [`${prefix}comments_per_contrib`]: {
          "date": "$date",
          "v": "$_comments_per_contrib"
        },
        [`${prefix}closingIssuesReferences_per_contrib`]: {
          "date": "$date",
          "v": "$_closingIssuesReferences_per_contrib"
        },
        [`${prefix}title_len_per_contrib`]: {
          "date": "$date",
          "v": "$_title_len_per_contrib"
        },
        [`${prefix}body_len_per_contrib`]: {
          "date": "$date",
          "v": "$_body_len_per_contrib"
        }
      }
    },
  ];
}

/**
 * Functrion for creating pipeline that calculates the following fields:
 *  * (movAvg_)commits_per_contrib
 *  * (movAvg_)reactions_per_contrib
 *  * (movAvg_)comments_per_contrib
 *  * (movAvg_)closingIssuesReferences_per_contrib
 *  * (movAvg_)title_len_per_contrib
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
  options?: { merge?: boolean; }
) => Array.prototype.concat(
  match(filter),
  setWindowFields(),
  merge(filter, "pullRequests", options?.merge ?? true),
);
