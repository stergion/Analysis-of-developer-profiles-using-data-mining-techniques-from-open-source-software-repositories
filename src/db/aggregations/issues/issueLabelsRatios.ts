import { group } from "console";
import { PartialWithUserIdContributionDoc, IssueDoc } from "../../../models/models.js";
import { match, topN, merge } from "../customStages.js";


const issueLabelsCount = () => {
  return [
    {
      "$unwind": {
        "path": "$labels",
        "preserveNullAndEmptyArrays": true
      }
    }, {
      "$project": {
        "label": {
          "$cond": [
            "$labels.name", {
              "$toLower": "$labels.name"
            }, ""
          ]
        }
      }
    }, {
      "$group": {
        "_id": "$label",
        "count": {
          "$count": {}
        }
      }
    }, {
      "$group": {
        "_id": {
          "category": {
            "$switch": {
              "branches": [
                {
                  "case": {
                    "$regexMatch": {
                      "input": "$_id",
                      "regex": new RegExp("bug")
                    }
                  },
                  "then": "bug"
                }, {
                  "case": {
                    "$and": [
                      {
                        "$regexMatch": {
                          "input": "$_id",
                          "regex": new RegExp("(test)")
                        }
                      }, {
                        "$not": {
                          "$regexMatch": {
                            "input": "$_id",
                            "regex": new RegExp("(testimonial)")
                          }
                        }
                      }
                    ]
                  },
                  "then": "testing"
                }, {
                  "case": {
                    "$regexMatch": {
                      "input": "$_id",
                      "regex": new RegExp("(documentation|doc|docs)")
                    }
                  },
                  "then": "documentation"
                }, {
                  "case": {
                    "$and": [
                      {
                        "$regexMatch": {
                          "input": "$_id",
                          "regex": new RegExp("clean[\s_-]*up|maintenance|chore|debt")
                        }
                      }
                    ]
                  },
                  "then": "maintenance"
                }, {
                  "case": {
                    "$regexMatch": {
                      "input": "$_id",
                      "regex": new RegExp("(feat|enhancement)")
                    }
                  },
                  "then": "feature"
                }
              ],
              "default": "other"
            }
          }
        },
        "count": {
          "$sum": "$count"
        }
      }
    }, {
      "$set": {
        "_id": "$$REMOVE",
        "label": "$_id.category"
      }
    }
  ]
};

const issueLabelsRatios = () => {
  return [
    {
      "$facet": {
        "labels": issueLabelsCount(),
        "n_issues": [
          {
            "$group": {
              "_id": null,
              "count": {
                "$count": {}
              }
            }
          }, {
            "$unset": "_id"
          }
        ]
      }
    }, 
    // Every facet stage returns an array. 
    // Extract the number of issues from the array.
    {
      "$set": {
        "n_issues": {
          "$arrayElemAt": [
            "$n_issues.count", 0
          ]
        }
      }
    }, 
    // Compute ratio of each label
    {
      "$set": {
        "labels": {
          "$map": {
            "input": "$labels",
            "as": "label",
            "in": {
              "label": "$$label.label",
              "count": "$$label.count",
              "ratio": {
                "$divide": [
                  "$$label.count", "$n_issues"
                ]
              }
            }
          }
        }
      }
    }, 
    // Clean up output.
    // Remove n_issues and
    // label 'other' from 'labels' array.
    {
      "$set": {
        "labels": {
          "$filter": {
            "input": "$labels",
            "as": "label",
            "cond": {
              "$ne": [
                "$$label.label", "other"
              ]
            }
          }
        },
        "n_issues": "$$REMOVE"
      }
    }
  ];
};

export default (
  filter: PartialWithUserIdContributionDoc,
  options?: { merge?: boolean; }
) => Array.prototype.concat(
  match(filter),
  issueLabelsRatios(),
  merge(filter, "issues", options?.merge ?? true),
);
