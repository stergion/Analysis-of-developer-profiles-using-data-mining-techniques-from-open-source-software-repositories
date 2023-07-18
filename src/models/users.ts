import { InferIdType, ObjectId } from "mongodb";
import { getDb } from "../db/conn.js";
import { UserDoc } from "./models.js";
import { BaseModel } from "./models.js";

const db = await getDb();

interface ContibutionCountDoc {
  _id: ObjectId;
  login: string;
  commits: number;
  issues: number;
  pullRequests: number;
  pullRequestReviews: number;
  userIssueComments: number;
  userCommitComments: number;
  totalContribs: number;
  avgContibs: number;
}
type  getOneIdReturnType<T extends boolean> = T extends true
? { _id: InferIdType<UserDoc>; repositories: ObjectId[] }
: { _id: InferIdType<UserDoc>; };

class Users extends BaseModel<UserDoc> {
  constructor() {
    super(db, "users");
  }

  getContibutionCount() {
    const agg = [
      // 6 $lookup operations, one for each contribution collection, to get contribution counts.
      {
        '$lookup': {
          'from': 'commits',
          'localField': '_id',
          'foreignField': 'user_id',
          'pipeline': [
            {
              '$count': 'commits'
            }
          ],
          'as': 'commits'
        }
      },
      {
        '$lookup': {
          'from': 'issues',
          'localField': '_id',
          'foreignField': 'user_id',
          'pipeline': [
            {
              '$count': 'issues'
            }
          ],
          'as': 'issues'
        }
      },
      {
        '$lookup': {
          'from': 'pullRequests',
          'localField': '_id',
          'foreignField': 'user_id',
          'pipeline': [
            {
              '$count': 'pullRequests'
            }
          ],
          'as': 'pullRequests'
        }
      },
      {
        '$lookup': {
          'from': 'pullRequestReviews',
          'localField': '_id',
          'foreignField': 'user_id',
          'pipeline': [
            {
              '$count': 'pullRequestReviews'
            }
          ],
          'as': 'pullRequestReviews'
        }
      },
      {
        '$lookup': {
          'from': 'userIssueComments',
          'localField': '_id',
          'foreignField': 'user_id',
          'pipeline': [
            {
              '$count': 'userIssueComments'
            }
          ],
          'as': 'userIssueComments'
        }
      },
      {
        '$lookup': {
          'from': 'userCommitComments',
          'localField': '_id',
          'foreignField': 'user_id',
          'pipeline': [
            {
              '$count': 'userCommitComments'
            }
          ],
          'as': 'userCommitComments'
        }
      },
      // 2 $project + 1 $set, to get the final counts
      {
        '$project': {
          'login': 1,
          'commits': {
            '$arrayElemAt': [
              '$commits', 0
            ]
          },
          'issues': {
            '$arrayElemAt': [
              '$issues', 0
            ]
          },
          'pullRequests': {
            '$arrayElemAt': [
              '$pullRequests', 0
            ]
          },
          'pullRequestReviews': {
            '$arrayElemAt': [
              '$pullRequestReviews', 0
            ]
          },
          'userIssueComments': {
            '$arrayElemAt': [
              '$userIssueComments', 0
            ]
          },
          'userCommitComments': {
            '$arrayElemAt': [
              '$userCommitComments', 0
            ]
          }
        }
      },
      {
        '$project': {
          'login': 1,
          'commits': '$commits.commits',
          'issues': '$issues.issues',
          'pullRequests': '$pullRequests.pullRequests',
          'pullRequestReviews': '$pullRequestReviews.pullRequestReviews',
          'userIssueComments': '$userIssueComments.userIssueComments',
          'userCommitComments': '$userCommitComments.userCommitComments',
          'totalContribs': {
            '$sum': [
              '$commits.commits',
              '$issues.issues',
              '$pullRequests.pullRequests',
              '$pullRequestReviews.pullRequestReviews',
              '$userIssueComments.userIssueComments',
              '$userCommitComments.userCommitComments'
            ]
          }
        }
      },
      {
        '$set': {
          'avgContibs': {
            '$divide': [
              '$totalContribs', 6
            ]
          }
        }
      },
    ];

    return this.collection.aggregate<ContibutionCountDoc>(agg);
  }

  // returns users with zero contributions
  getZeroContribs() {
    return this.getContibutionCount().match({ totalContribs: 0 });
  }

  // returns users with avg contributions less than value
  getFewContribs({ avgContibs, workContrib, comments }: { avgContibs: number, workContrib: number, comments: number; } = { avgContibs: 30, workContrib: 15, comments: 15 }) {
    return this.getContibutionCount().match({
      '$expr': {
        '$and': [
          {
            '$lt': [
              '$avgContibs', avgContibs
            ]
          }, {
            '$lt': [
              {
                '$sum': [
                  '$issues', '$pullRequests', '$pullRequestReviews'
                ]
              }, workContrib
            ]
          }, {
            '$lt': [
              {
                '$sum': [
                  '$userIssueComments', '$userCommitComments'
                ]
              }, comments
            ]
          }
        ]
      }
    });
  }

  getOneId<T extends boolean = false>(login: UserDoc["login"], withRepos: T = false as T) {
    return this.findOne(
      { login: `${login}` },
      { projection: { _id: 1, repositories: withRepos} }
    ) as Promise<getOneIdReturnType<T> | null>;
  }

  updateRepositories(user: { _id: ObjectId; } | { login: string; }, repositoryIds: ObjectId[]) {
    return this.updateOne(
      user,
      { $addToSet: { repositories: { $each: repositoryIds } } }
    );
  }
}

export default new Users();
