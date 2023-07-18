/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { print } from "graphql";
import { repositoriesCommitedToQuery, repositoryInfoQuery, userCommitCommentsQuery, userCommitHistoryQuery, userIssueCommentsQuery } from "../graphql/queries.js";
import logger from "../utils/logger/logger.js";

const log = logger.default;

export function fetchRepositoryInfo(octokit) {
  return async ({ owner, name }) => octokit.graphql(print(repositoryInfoQuery), {
    owner, name,
  });
}
export async function fetchRepositoriesUserCommited(octokit, datesArray, login) {
  let responses = [];

  for (const [fromDate, toDate] of datesArray) {
    responses.push(octokit.graphql(print(repositoriesCommitedToQuery), {
      login, fromDate, toDate,
    }));
  }

  responses = await Promise.all(responses);

  const nameWithOwnerSet = new Set();
  for (const { user } of responses) {
    for (const { repository } of user.contributionsCollection.commitContributionsByRepository) {
      nameWithOwnerSet.add(repository.nameWithOwner);
    }
  }

  return Array.from(nameWithOwnerSet);
}

export async function fetchCommits(octokit, owner, name, authorId, fromDate, toDate) {
  if (!(fromDate instanceof Date)) throw new Error("'fromDate' is not an instanceof Date.");
  if (!(toDate instanceof Date)) throw new Error("'toDate' is not an instanceof Date.");

  const commits = [];

  const { repository } = await octokit.graphql.paginate(print(userCommitHistoryQuery), {
    owner, name, authorId, fromDate, toDate, cursor: null,
  });

  commits.push(...repository.defaultBranchRef.target.history.nodes);

  return commits;
}

export async function fetchCommitComments(octokit, login, fromDate, toDate) {
  if (!(fromDate instanceof Date)) throw new Error("'fromDate' is not an instanceof Date.");
  if (!(toDate instanceof Date)) throw new Error("'toDate' is not an instanceof Date.");

  const commitComments = [];

  const it = octokit.graphql.paginate.iterator(print(userCommitCommentsQuery), {
    login, cursor: null,
  });

  for await (const { user } of it) {
    commitComments.push(...user.commitComments.nodes);
    // Stop fetching if commit comment go too far back in time.
    if (!!user.commitComments.nodes.length
      && fromDate > new Date(user.commitComments.nodes[0].publishedAt)) break;
  }

  return commitComments.filter(
    ({ publishedAt }) => fromDate <= new Date(publishedAt) && new Date(publishedAt) <= toDate,
  );
}

export async function fetchIssueComments(octokit, login, fromDate, toDate) {
  if (!(fromDate instanceof Date)) throw new Error("'fromDate' is not an instanceof Date.");
  if (!(toDate instanceof Date)) throw new Error("'toDate' is not an instanceof Date.");

  const issueComments = [];

  const it = octokit.graphql.paginate.iterator(print(userIssueCommentsQuery), {
    login, cursor: null,
  });

  for await (const { user } of it) {
    issueComments.push(...user.issueComments.nodes);
    // Stop fetching if issue comment go too far back in time.
    if (!!user.issueComments.nodes.length
      && fromDate > new Date(user.issueComments.nodes[0].publishedAt)) break;
  }

  return issueComments.filter(
    ({ publishedAt }) => fromDate <= new Date(publishedAt) && new Date(publishedAt) <= toDate,
  );
}
