import { CommitDoc, PartialWithUserIdContributionDoc } from "../../../models/models.js";
import { match, merge, topN } from "../customStages.js";

function countExts() {

  return [
    {
      '$unwind': {
        'path': '$files',
        'preserveNullAndEmptyArrays': false
      }
    },

    {
      '$group': {
        '_id': '$files.extname',
        'extCount': {
          '$count': {}
        }
      }
    },

    {
      '$set': {
        'extName': '$_id',
        '_id': '$$REMOVE'
      }
    },

  ];
}

function projetExts() {
  return [
    // Create Array with All the Values of each Field (Metric)
    {
      '$group': {
        '_id': null,
        'topExts': {
          '$push': '$$CURRENT'
        }
      }
    },


    {
      '$project': {
        '_id': 0,
        'topExts': 1
      }
    }
  ];
}

export default (
  filter: PartialWithUserIdContributionDoc,
  options?: { merge?: boolean; }
) => Array.prototype.concat(
  match(filter),
  countExts(),
  topN({ extCount: -1 }, 20),
  projetExts(),
  merge(filter, "commits", options?.merge ?? true),
);
