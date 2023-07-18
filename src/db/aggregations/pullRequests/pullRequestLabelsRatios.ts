import { PartialWithUserIdContributionDoc } from "../../../models/models.js";
import { match, merge } from "../customStages.js";

const pullRequestsLabels = () => {
  return [
    {
      '$unwind': {
        'path': '$labels',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$group': {
        '_id': {
          '$toLower': '$labels.name'
        },
        'label_descs': {
          '$addToSet': '$labels.description'
        },
        'count': {
          '$count': {}
        }
      }
    }, {
      '$group': {
        '_id': {
          'category': {
            '$switch': {
              'branches': [
                {
                  'case': {
                    '$regexMatch': {
                      'input': '$_id',
                      'regex': new RegExp('(bug|((\b|_)(fix|fixing|fixes)(\b|_)))')
                    }
                  },
                  'then': 'bugfix'
                }, {
                  'case': {
                    '$and': [
                      {
                        '$regexMatch': {
                          'input': '$_id',
                          'regex': new RegExp('(test)')
                        }
                      }, {
                        '$not': {
                          '$regexMatch': {
                            'input': '$_id',
                            'regex': new RegExp('(testimonial)')
                          }
                        }
                      }
                    ]
                  },
                  'then': 'testing'
                }, {
                  'case': {
                    '$regexMatch': {
                      'input': '$_id',
                      'regex': new RegExp('(documentation|doc|docs)')
                    }
                  },
                  'then': 'documentation'
                }, {
                  'case': {
                    '$and': [
                      {
                        '$regexMatch': {
                          'input': '$_id',
                          'regex': new RegExp('clean[\s_-]*up|maintenance|chore|debt')
                        }
                      }
                    ]
                  },
                  'then': 'maintenance'
                }, {
                  'case': {
                    '$regexMatch': {
                      'input': '$_id',
                      'regex': new RegExp('(feat|enhancement)')
                    }
                  },
                  'then': 'feature'
                }
              ],
              'default': 'other'
            }
          }
        },
        'count': {
          '$sum': '$count'
        }
      }
    }, {
      '$set': {
        '_id': '$$REMOVE',
        'label': '$_id.category'
      }
    }
  ];
};


const pullRequestLabelsRatios = () => {
  return [
    {
      '$facet': {
        'labels': pullRequestsLabels(),
        'n_prs': [
          {
            '$group': {
              '_id': null,
              'count': {
                '$count': {}
              }
            }
          }, {
            '$unset': '_id'
          }
        ]
      }
    },
    // Every facet stage returns an array. 
    // Extract the number of PRs from the array.
    {
      '$set': {
        'n_prs': {
          '$arrayElemAt': [
            '$n_prs.count', 0
          ]
        }
      }
    },
    // Compute ratio of each label
    {
      '$set': {
        'labels': {
          '$map': {
            'input': '$labels',
            'as': 'label',
            'in': {
              'label': '$$label.label',
              'count': '$$label.count',
              'ratio': {
                '$divide': [
                  '$$label.count', '$n_prs'
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
      '$set': {
        'labels': {
          '$filter': {
            'input': '$labels',
            'as': 'label',
            'cond': {
              '$ne': [
                '$$label.label', 'other'
              ]
            }
          }
        },
        'n_prs': '$$REMOVE'
      }
    }
  ];
};

export default (
  filter: PartialWithUserIdContributionDoc,
  options?: { merge?: boolean; }
) => Array.prototype.concat(
  match(filter),
  pullRequestLabelsRatios(),
  merge(filter, "pullRequests", options?.merge ?? true),
);