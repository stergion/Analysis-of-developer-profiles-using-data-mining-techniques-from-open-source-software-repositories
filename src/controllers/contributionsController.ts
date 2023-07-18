import { BulkWriteOptions, ObjectId } from "mongodb";
import { Octokit } from "octokit";
import db from "../models/index.js";
import { CommitDoc, IssueDoc, PullRequestDoc, PullRequestReviewDoc, UserCommitCommentsDoc, UserIssueCommentsDoc } from "../models/models.js";
import { DateWindows } from "../utils/dateWindows.js";
import {
  getCommitComments,
  getCommits,
  getIssueComments,
  getIssues,
  getPullRequestReviews,
  getPullRequests
} from "./helpers.js";

import logger from "../utils/logger/logger.js";
import { GraphqlResponseError } from "@octokit/graphql";

export const log = logger.default;


export async function fetch(octokit: Octokit, dateWindows: DateWindows, login: string, userId: ObjectId) {
  const pullRequests = await fetchPullRequests(octokit, dateWindows, login, userId);
  const pullRequestReviews = await fetchPullRequestReviews(octokit, dateWindows, login, userId);
  const issues = await fetchIssues(octokit, dateWindows, login, userId);
  const commits = await fetchCommits(octokit, dateWindows, login);

  // Insert User's Comments
  const commitComments = await fetchCommitComments(octokit, dateWindows, login, userId);
  const issueComments = await fetchIssueComments(octokit, dateWindows, login, userId);

  return { pullRequests, pullRequestReviews, issues, commits, commitComments, issueComments };
}

export async function fetchPullRequests(octokit: Octokit, dateWindows: DateWindows, login: string, userId: ObjectId) {
  let pullRequests: PullRequestDoc[] = [];

  try {
    pullRequests = await getPullRequests(octokit, dateWindows.monthly(), login, userId);
  } catch (error) {
    log.error(error);
  }
  return pullRequests;
}

export async function fetchPullRequestReviews(octokit: Octokit, dateWindows: DateWindows, login: string, userId: ObjectId) {
  let pullRequestReviews: PullRequestReviewDoc[] = [];

  try {
    pullRequestReviews = await getPullRequestReviews(octokit, dateWindows.monthly(), login, userId);
  } catch (error) {
    if (error instanceof GraphqlResponseError && error.message.includes("Something went wrong while executing your query")) {
      log.error(error);
    } else {
      throw error;
    }
  }
  return pullRequestReviews;
}

export async function fetchIssues(octokit: Octokit, dateWindows: DateWindows, login: string, userId: ObjectId) {
  let issues: IssueDoc[] = [];

  try {
    issues = await getIssues(octokit, dateWindows.monthly(), login, userId);
  } catch (error) {
    if (error instanceof GraphqlResponseError && error.message.includes("Something went wrong while executing your query")) {
      log.error(error);
    } else {
      throw error;
    }
  }
  return issues;
}

export async function fetchCommits(octokit: Octokit, dateWindows: DateWindows, login: string) {
  let commits: any[] = [];

  try {
    commits = await getCommits(octokit, dateWindows.monthly(), login);
  } catch (error) {
    if (error instanceof GraphqlResponseError && error.message.includes("Something went wrong while executing your query")) {
      log.error(error);
    } else {
      throw error;
    }
  }
  return commits;
}

export async function fetchCommitComments(octokit: Octokit, dateWindows: DateWindows, login: string, userId: ObjectId) {
  let commitComments: UserCommitCommentsDoc[] = [];

  try {
    commitComments = await getCommitComments(octokit, dateWindows.fromDate, dateWindows.toDate, login, userId);
  } catch (error) {
    if (error instanceof GraphqlResponseError && error.message.includes("Something went wrong while executing your query")) {
      log.error(error);
    } else {
      throw error;
    }
  }
  return commitComments;
}

export async function fetchIssueComments(octokit: Octokit, dateWindows: DateWindows, login: string, userId: ObjectId) {
  let issueComments: UserIssueCommentsDoc[] = [];

  try {
    issueComments = await getIssueComments(octokit, dateWindows.fromDate, dateWindows.toDate, login, userId);
  } catch (error) {
    if (error instanceof GraphqlResponseError && error.message.includes("Something went wrong while executing your query")) {
      log.error(error);
    } else {
      throw error;
    }
  }
  return issueComments;
}

interface ContributionsDocs {
  pullRequests: PullRequestDoc[];
  pullRequestReviews: PullRequestReviewDoc[];
  issues: IssueDoc[];
  commits: CommitDoc[];
  commitComments: UserCommitCommentsDoc[];
  issueComments: UserIssueCommentsDoc[];
}

export async function insert(contributions: ContributionsDocs, options?: BulkWriteOptions) {
  if (contributions.pullRequests.length > 0) await db.pullRequests.insertMany(contributions.pullRequests, options);
  if (contributions.pullRequestReviews.length > 0) await db.pullRequestReviews.insertMany(contributions.pullRequestReviews, options);
  if (contributions.issues.length > 0) await db.issues.insertMany(contributions.issues, options);
  if (contributions.commits.length > 0) await db.commits.insertMany(contributions.commits, options);
  if (contributions.commitComments.length > 0) await db.userCommitComments.insertMany(contributions.commitComments, options);
  if (contributions.issueComments.length > 0) await db.userIssueComments.insertMany(contributions.issueComments, options);
}

export async function upsert(contributions: ContributionsDocs, options?: BulkWriteOptions) {
  if (contributions.pullRequests.length > 0) await db.pullRequests.upsertMany(contributions.pullRequests, options);
  if (contributions.pullRequestReviews.length > 0) await db.pullRequestReviews.upsertMany(contributions.pullRequestReviews, options);
  if (contributions.issues.length > 0) await db.issues.upsertMany(contributions.issues, options);
  if (contributions.commits.length > 0) await db.commits.upsertMany(contributions.commits, options);
  if (contributions.commitComments.length > 0) await db.userCommitComments.upsertMany(contributions.commitComments, options);
  if (contributions.issueComments.length > 0) await db.userIssueComments.upsertMany(contributions.issueComments, options);
}
