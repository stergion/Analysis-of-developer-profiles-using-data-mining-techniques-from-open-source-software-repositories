import { AggregateOptions, AggregationCursor, InferIdType, ObjectId } from "mongodb";
import db from "../models/index.js";
import { PartialWithUserIdContributionDoc, PipelineOptions, RepositoryDoc, UserDoc } from "../models/models.js";


/**
 * Merges an array of objects into one single object.
 * 
 * This function takes an array of objects and merges them into a single object.
 * It iterates over each key in each object, and if the key already exists in the 
 * result object, it merges the properties of the existing object with the new one.
 * If the key does not exist, it creates a new object for that key. In case of overlapping
 * properties, the later objects in the array will overwrite the earlier ones.
 *
 * @param objects - The array of objects to be merged. 
 * Each object in the array should be of the type { [key: string]: any }, 
 * indicating an object with any number of properties, where each property name is a string 
 * and each property value can be of any type.
 *
 * @returns A single merged object of type { [key: string]: any }.
 * The merged object contains all the properties from the input objects.
 * If there were overlapping properties in the input objects, the properties from the later 
 * objects in the input array overwrite the properties from the earlier ones.
 */
function mergeMetrics(objects: Array<{ [key: string]: any; }>): { [key: string]: any; } {
  let result: { [key: string]: any; } = {};
  for (const object of objects) {
    for (const key in object) {
      result[key] = Object.assign(result[key] || {}, object[key]);
    }
  }
  return result;
}

export async function computeUserMetrics(user: InferIdType<UserDoc>, repositories?: InferIdType<RepositoryDoc>[] | InferIdType<RepositoryDoc>) {
  let metrics;

  console.log("start computeUserMetrics");

  const getMetricsCb = async (filter: PartialWithUserIdContributionDoc) => {
    const results = await Promise.all([
      db.commits.getMetrics(filter),
      db.issues.getMetrics(filter),
      db.pullRequests.getMetrics(filter),
      db.pullRequestReviews.getMetrics(filter),
      db.userCommitComments.getMetrics(filter),
      db.userIssueComments.getMetrics(Object.assign({}, filter, { "associatedIssue.type": 'PullRequest' })),
      db.userIssueComments.getMetrics(Object.assign({}, filter, { "associatedIssue.type": 'Issue' })),
    ]);

    // const metrics = results.reduce((acc, cur) => acc = { ...acc, ...cur });
    const metrics = mergeMetrics(results);

    return metrics;
  };

  if (Array.isArray(repositories)) {
    metrics = await Promise.all(repositories.map(async (repo) => ({
      "nameWithOwner": await db.repositories.getNameWithOwner(repo),
      "metrics": await getMetricsCb({ user_id: user, repository_id: repo })
    })));
  } else if (repositories) {
    metrics = {
      nameWithOwner: await db.repositories.getNameWithOwner(repositories),
      metrics: await getMetricsCb({ user_id: user, repository_id: repositories })
    };
  } else {
    metrics = await getMetricsCb({ user_id: user });
  }

  console.log("end computeUserMetrics");

  return metrics;
}
