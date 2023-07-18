import { Document } from "mongodb";
import { ContibutionCollectionName, IssueDoc, PartialWithUserIdContributionDoc, PullRequestDoc, Sortable, } from "../../models/models.js";

export function limit(N?: number) {
  if (!N) return [];

  return [{
    "$limit": N
  }];
}

export function topN<TSchema>(sort: Sortable<TSchema>, N?: number): Object[] {
  return [
    {
      "$sort": sort
    },
    ...limit(N)
  ];
};

interface MatchOptions {
  dateSubtract?: {
    dateKey: string;
    unit?: "year" | "quarter" | "month" | "week";
    amount?: number;
  };
}

export function match<T extends PartialWithUserIdContributionDoc = PartialWithUserIdContributionDoc>(filter: T, options: MatchOptions = {}) /*: typeof matchUserRepo | typeof matchUser*/ {
  let matchUserOrRepo;
  let matchdate;

  const { user_id, ...rest } = filter;

  const { dateSubtract } = options;

  if (dateSubtract) {
    const { dateKey, unit = "year", amount = 1 } = dateSubtract;

    matchdate = {
      "$expr": {
        "$gte": [
          [`$${dateKey}`], {
            "$dateSubtract": {
              "startDate": "$$NOW",
              "unit": unit,
              "amount": amount,
            }
          }
        ]
      }
    };
  }



  // if (filter.repository_id) {
  //   matchUserOrRepo = {
  //     "$match": {
  //       "user_id": filter.user_id,
  //       "repository_id": filter.repository_id,
  //     },
  //   };
  // } else {
  //   matchUserOrRepo = {
  //     "$match": {
  //       "user_id": filter.user_id,
  //     },
  //   };
  // }

  return {
    "$match": {
      user_id,
      ...rest
      // ...matchdate
    },
  };
}

export function merge(filter: PartialWithUserIdContributionDoc, collection: ContibutionCollectionName, isActive: boolean) {
  if (!isActive) return [];

  return [
    {
      '$project': {
        'user_id': filter.user_id,
        'repository_id': filter.repository_id ?? 'all',
        [collection]: '$$CURRENT'
      }
    },
    {
      "$merge": {
        "into": "metrics",
        "on": [
          "user_id", "repository_id"
        ],
        "whenMatched": [
          {
            "$set": {
              [collection]: {
                "$mergeObjects": [
                  `$${collection}`, `$$new.${collection}`
                ]
              }
            }
          }
        ]
      }
    }
  ];
}

type IssueDocOrPRDoc<T> =
  T extends PullRequestDoc ? PullRequestDoc :
  T extends IssueDoc ? IssueDoc :
  never;

interface TimeToStateOptions {
  tts_unit: "hour" | "day";
  recentVals: {
    unit: "day" | "week" | "month" | "quarter" | "year",
    amount: number,
  };
}

export function timeToState<T>(state: IssueDocOrPRDoc<T>["state"], options: TimeToStateOptions) {
  const stateChangeDate = `${state.toLowerCase()}At`;
  const dateOrigin = "createdAt";

  const { tts_unit, recentVals } = options;

  if (recentVals.amount < 1) {
    throw new Error(`recentVals.amount value should be greater than zero. (recentVals.amount=${recentVals.amount})`);

  }

  const last_x = `${recentVals.amount}${recentVals.unit}s`;

  return [
    {
      "$project": {
        "_id": 0,
        "date": `$${dateOrigin}`,
        "v": {
          "$dateDiff": {
            "startDate": `$${dateOrigin}`,
            "endDate": `$${stateChangeDate}`,
            "unit": tts_unit
          }
        }
      }
    },

    {
      "$group": {
        "_id": null,
        "last_tot": {
          "$push": "$$CURRENT"
        },
        "std_tot": {
          "$stdDevPop": "$v"
        },
        "mean_tot": {
          "$avg": "$v"
        }
      }
    },

    {
      "$set": {
        "max_date": {
          "$first": "$last_tot.date"
        }
      }
    },
    {
      "$set": {
        [`last_${last_x}`]: {
          "$filter": {
            "input": "$last_tot",
            "cond": {
              "$gte": [
                "$$this.date", {
                  "$dateSubtract": {
                    "startDate": "$max_date",
                    "unit": recentVals.unit,
                    "amount": recentVals.amount
                  }
                }
              ]
            }
          }
        }
      }
    },

    {
      "$set": {
        [`mean_${last_x}`]: {
          "$avg": `$last_${last_x}.v`
        },
        [`std_${last_x}`]: {
          "$stdDevPop": `$last_${last_x}.v`
        },
        "max_date": "$$REMOVE",
        "last_tot": "$$REMOVE",
        "_id": "$$REMOVE"
      }
    },

    {
      "$project": {
        [`time_to_${state.toLowerCase()}`]: "$$CURRENT"
      }
    },
  ];
}