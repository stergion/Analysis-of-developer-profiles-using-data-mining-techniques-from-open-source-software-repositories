import console from "console";
import { PartialWithUserIdContributionDoc } from "../../../models/models.js";
import { langsMap } from "../../../utils/fileExtensions/index.js";
import { sleep } from "../../../utils/sleep.js";
import { match, merge } from "../customStages.js";
import pullRequestLabelsRatios from "../pullRequests/pullRequestLabelsRatios.js";

const documentationExts = [
  '.md', '.MD', '.markdown', '.mdown', '.mkdn', '.mkd', '.Rmd', '.mdx', ".rst", 
]

const cicdMap = new Map<string, [string[] | null, RegExp | null]>([
  ['Jenkins', [['jenkinsfile'], null]],
  ['Gitlab_CI', [['.gitlab-ci.yml', '.gitlab-ci.yaml'], null]],
  ['Bitbucket_CI', [['bitbucket-pipelines.yml', 'bitbucket-pipelines.yaml'], null]],
  ['AWS_CodeStar', [['buildspec.yml', 'buildspec.yaml'], null]],
  ['Drone_CI', [['.drone.yml', '.drone.yaml', 'drone.yml', 'drone.yaml'], null]],
  ['Travis', [['.travis.yml', 'travis.yml', '.travis.yaml', 'travis.yaml'], null]],
  ['Concourse_CI', [null, /concourse[\w\.\-\/]*(?:\.yml|\.yaml)$/]],
  ['Circle_CI', [null, /circleci[\w\.\-\/]*(?:\.yml|\.yaml)$/]],
  ['teamcity', [null, /teamcity[\w\.\-\/]*settings(?:\.yml|\.yaml|.kts)$/]],
  ['Azure', [null, /(?:(?:azure-pipelines)|(?:azure[\w-]*vmss)|(?:csi[\w-]*azure)|(?:\.?azure)|(?:(?:deploy)|(?:release))[\w-]*azure)[\w.-]*(?:\.yml|\.yaml)/]],
  ['GitHub_Actions', [null, /^\.github\/workflows\/[\w.\/\-]+(?:\.yml|\.yaml)$/]],
  ['otherCICD', [['pipeline.yml', 'pipeline.yaml', 'pipeline_deployment.yml', 'pipeline_deployment.yaml'], null]],
]);

function cicdBranchesBuilder(cicds: Map<string, [string[] | null, RegExp | null]>) {
  const branches = [];
  for (const [cicd, [fileNames, regex]] of cicds) {
    if (fileNames) {
      branches.push({
        case: { $in: ['$$base', fileNames] },
        then: cicd,
      });
    } else if (regex) {
      branches.push({
        case: { $regexMatch: { input: '$$full', regex: regex } },
        then: cicd,
      });
    }
  }
  return branches;
}

const langBrachesBuilder = (lang: Map<string, string[]>) => {
  const branches = [];
  for (const [key, value] of lang) {
    branches.push({
      'case': {
        '$in': [
          '$_id', value
        ]
      },
      'then': key
    });
  }
  return branches;
};
const generateMapStep = (field: string, key: string) => {
  return {
    $map: {
      input: `$${field}`,
      as: 'item',
      in: {
        [key]: `$$item.${key}`,
        count: `$$item.count`,
        ratio: {
          $divide: [`$$item.count`, '$n_files'],
        },
      },
    },
  };
};

const generateFilterStep = (field: string, key: string) => {
  return {
    $filter: {
      input: `$${field}`,
      as: 'item',
      cond: {
        $ne: [`$$item.${key}`, 'other'],
      },
    },
  };
};


const commitedFilesLangs = () => {
  return [
    {
      '$group': {
        '_id': {
          '$toLower': '$files.extname'
        },
        'count': {
          '$count': {}
        }
      }
    }, {
      '$group': {
        '_id': {
          'lang': {
            '$switch': {
              'branches': langBrachesBuilder(langsMap),
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
        'language': '$_id.lang'
      }
    }
  ];
};

const commitedFilesRatios = () => {
  return [
    {
      '$unwind': {
        'path': '$files',
        'preserveNullAndEmptyArrays': false
      }
    }, {
      '$facet': {
        'languages': commitedFilesLangs(),
        'CICDs': [
          {
            '$group': {
              '_id': {
                'CICD': {
                  '$let': {
                    'vars': {
                      'base': {
                        '$toLower': '$files.basename'
                      },
                      'full': {
                        '$toLower': '$files.filename'
                      }
                    },
                    'in': {
                      '$switch': {
                        'branches': cicdBranchesBuilder(cicdMap),
                        'default': 'other'
                      }
                    }
                  }
                }
              },
              'count': {
                '$count': {}
              }
            }
          }, {
            '$set': {
              '_id': '$$REMOVE',
              'CICD': '$_id.CICD'
            }
          }
        ],
        'n_doc': [
          {
            '$project': {
              'ext': {
                '$toLower': '$files.extname'
              }
            }
          }, {
            '$match': {
              'ext': {
                '$in': documentationExts
              }
            }
          }, {
            '$count': 'count'
          }
        ],
        'n_files': [
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
    }, {
      '$set': {
        'n_files': {
          '$arrayElemAt': [
            '$n_files.count', 0
          ]
        },
        'n_doc': {
          '$arrayElemAt': [
            '$n_doc.count', 0
          ]
        }
      }
    }, {
      '$set': {
        'languages': generateMapStep('languages', 'language'),
        'CICDs': generateMapStep('CICDs', 'CICD'),
        'doc_ratio': {
          '$divide': [
            '$n_doc', '$n_files'
          ]
        }
      }
    }, {
      '$set': {
        'languages': generateFilterStep('languages', 'language'),
        'CICDs': generateFilterStep('CICDs', 'CICD'),
        'n_doc': '$$REMOVE',
        'n_files': '$$REMOVE'
      }
    }, {
      '$set': {
        'code_ratio': {
          '$sum': '$languages.ratio'
        },
        'CICD_ratio': {
          '$sum': '$CICDs.ratio'
        }
      }
    }
  ];
};

export default (
  filter: PartialWithUserIdContributionDoc,
  options?: { merge?: boolean; }
) => Array.prototype.concat(
  match(filter),
  commitedFilesRatios(),
  merge(filter, "commits", options?.merge ?? true),
);