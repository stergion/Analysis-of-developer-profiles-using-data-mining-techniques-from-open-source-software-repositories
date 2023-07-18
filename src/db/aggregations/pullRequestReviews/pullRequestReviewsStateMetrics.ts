import { PartialWithUserIdContributionDoc, PullRequestReviewDoc } from "../../../models/models.js";
import { match, merge, topN } from "../customStages.js";


type DateUnit = "day" | "week" | "month" | "year";

interface SetWindowFieldsOptions {
  range?: {
    start?: number,
  },
  unit?: DateUnit;
}

function dailyStateCount(options?: SetWindowFieldsOptions): Object[] {
  const {
    range = { start: -1 },
    unit = "year"
  }: SetWindowFieldsOptions = options ?? {};

  const date = "$submittedAt";

  const get_state = (state: PullRequestReviewDoc["state"]) => (
    {
      "$sum": {
        "$cond": {
          "if": {
            "$eq": [
              "$state", state
            ]
          },
          "then": 1,
          "else": 0
        }
      },
    }
  );

  return [
    // Group State Count by Day
    {
      "$group": {
        "_id": {
          "year": {
            "$year": date
          },
          "dayOfYear": {
            "$dayOfYear": date
          }
        },
        "total": {
          "$count": {}
        },
        "approved": get_state("APPROVED"),
        "changes_requested": get_state("CHANGES_REQUESTED"),
        "commented": get_state("COMMENTED"),
        "dismissed": get_state("DISMISSED"),
        "pending": get_state("PENDING"),
      }
    },

    //  date: dateFromParts 
    {
      "$set": {
        "_id": "$$REMOVE",
        "date": {
          "$dateFromParts": {
            "year": "$_id.year",
            "day": "$_id.dayOfYear"
          }
        }
      }
    },

    // Cumulative Count of State 
    /* {
      "$setWindowFields": {
        "sortBy": {
          "date": 1
        },
        "output": {
          "total": {
            "$sum": "$total",
            "window": {
              "range": [
                "unbounded", "current"
              ],
              "unit": "year"
            }
          },
          "approved": {
            "$sum": "$approved",
            "window": {
              "range": [
                "unbounded", "current"
              ],
              "unit": "year"
            }
          },
          "changes_requested": {
            "$sum": "$changes_requested",
            "window": {
              "range": [
                "unbounded", "current"
              ],
              "unit": "year"
            }
          },
          "commented": {
            "$sum": "$commented",
            "window": {
              "range": [
                "unbounded", "current"
              ],
              "unit": "year"
            }
          },
          "dismissed": {
            "$sum": "$dismissed",
            "window": {
              "range": [
                "unbounded", "current"
              ],
              "unit": "year"
            }
          },
          "pending": {
            "$sum": "$pending",
            "window": {
              "range": [
                "unbounded", "current"
              ],
              "unit": "year"
            }
          }
        }
      }
    }, */
    {
      "$sort": {
        "date": - 1
      }
    }
  ];
}

function reshapeResults() {
  return [
    {
      // Create Array of State Values and Array of Dates
      "$group": {
        "_id": null,
        "date": {
          "$push": "$date"
        },
        "total": {
          "$push": "$total"
        },
        "approved": {
          "$push": "$approved"
        },
        "changes_requested": {
          "$push": "$changes_requested"
        },
        "commented": {
          "$push": "$commented"
        },
        "dismissed": {
          "$push": "$dismissed"
        },
        "pending": {
          "$push": "$pending"
        }
      }
    },
    {
      "$unset": "_id"
    },

    // Add Arrays to Wrapper Object
    {
      "$project": {
        "cumulative_prr_state": "$$CURRENT"
      }
    },
  ];
}

export default (
  filter: PartialWithUserIdContributionDoc,
  options?: { merge?: boolean; },
) => Array.prototype.concat(
  match(filter),
  dailyStateCount(),
  reshapeResults(),
  merge(filter, "pullRequestReviews", options?.merge ?? true)
);