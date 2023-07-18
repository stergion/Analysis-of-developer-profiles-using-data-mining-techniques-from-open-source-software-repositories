/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */

// On new installations is responsible for inserting all the necessary data to the DB,
// On uninstallation is responsible for deleting all the necessary data from the DB.
import { Octokit } from "octokit";

import { startSession } from "../db/conn.js";
import { runTransactionWithRetry } from "../db/transactions.js";
import db from "../models/index.js";
import { DateWindows } from "../utils/dateWindows.js";
import logger from "../utils/logger/logger.js";
import * as contributionsController from "./contributionsController.js";
import {
  insertRepositoriesContributedTo,
  insertUser
} from "./helpers.js";

const log = logger.default;

export async function createUser(octokit: Octokit, login: string) {
  /*
  Todo: Add new user
  [✅] 1. Insert new User + save his _id
  [✅] 2. Insert user Repos + save their _id 's
  [✅] 3. Insert PRs, Issues, Commits, PRReviews,
  [✅] 4. Insert User Comments,
  [❌] 5. Insert Discussions
  */
  const dateWindows = new DateWindows(new Date(), { months: 6 });

  let userId;

  // Check if user already in DB 
  const result = await db.users.getOneId(login);
  userId = result?._id;

  if (userId) {
    log.warn(`Creating new user: User ${login} already exists.`);
    return;
  };

  // Insert New User
  try {
    userId = await insertUser(octokit, login);
  }
  catch (error: any) {
    if (error.code === 11000) {
      log.warn(`Creating new user: User ${login} already exists.`);
    } else {
      log.error("Error creating user.", { login });

      await deleteUser(login);
      log.error(error);
      throw error;
    }

    return;
  }
  log.info("@createUser()", userId);

  // Insert Repositories Contributed To
  try {
    const repoIds = await insertRepositoriesContributedTo(octokit, dateWindows.monthly(), login);
    await db.users.updateRepositories({ _id: userId }, repoIds);
  } catch (error) {
    log.error("Error updating user's repositories.", { login });

    await deleteUser(login);
    log.error(error);

    throw error;
  }

  // Insert Contributions
  let contributions;
  try {
    contributions = await contributionsController.fetch(octokit, dateWindows, login, userId);
  } catch (error) {
    log.error("Error fetching user's contributions.", { login });

    await deleteUser(login);
    log.error(error);

    throw error;
  }

  const session = startSession();

  try {
    await runTransactionWithRetry(
      contributionsController.insert.bind(null,
        contributions,
        { session }
      ),
      session
    );

    log.info(`User ${login} was successfully installed.`);
  } catch (error) {
    log.error("Error writing contributions to db.", { login });
    // if transaction failed, delete user from db
    // await db.users.deleteOne({ _id: userId });
    await deleteUser(login);

    // log.error(error);
    console.log(error);
    throw error;
  } finally {
    await session.endSession();
  }
}


export async function updateUser(octokit: Octokit, login: string) {
  // Get User
  const user = await db.users.findOne({ login }, { projection: { _id: 1, login: 1, updatedAt: 1 } });

  if (!user) {
    log.error(`Can not upadte user ${login}. User not found in datebase.`);
    return;
  }

  const dateWindows = new DateWindows(user.updatedAt, user.updatedAt);

  const contributionsUpd = await contributionsController.fetch(octokit, dateWindows, login, user._id);

  const sessionUpd = startSession();

  try {
    await runTransactionWithRetry(
      contributionsController.upsert.bind(null,
        contributionsUpd,
        { session: sessionUpd }
      ),
      sessionUpd
    );
  } catch (error) {
    // log.error(error);
    console.log(error);
  } finally {
    await sessionUpd.endSession();
  }

  // const pullRequestsUpd = await getPullRequests(octokit, dateWindows.monthly(), user.login, user._id);
  // const pullRequestReviewsUpd = await getPullRequestReviews(octokit, dateWindows.monthly(), user.login, user._id);
  // const issuesUpd = await getIssues(octokit, dateWindows.monthly(), user.login, user._id);
  // const commitsUpd = await getCommits(octokit, dateWindows.monthly(), user.login);

  // // Insert User's Comments
  // const commitCommentsUpd = await getCommitComments(octokit, dateWindows.fromDate, dateWindows.toDate, user.login, user._id);
  // const issueCommentsUpd = await getIssueComments(octokit, dateWindows.fromDate, dateWindows.toDate, user.login, user._id);

  // try {
  //   if (pullRequestsUpd.length > 0) await db.pullRequests.upsertMany(pullRequestsUpd);
  //   if (pullRequestReviewsUpd.length > 0) await db.pullRequestReviews.upsertMany(pullRequestReviewsUpd);
  //   if (issuesUpd.length > 0) await db.issues.upsertMany(issuesUpd);
  //   if (commitsUpd.length > 0) await db.commits.upsertMany(commitsUpd);
  //   if (commitCommentsUpd.length > 0) await db.userCommitComments.upsertMany(commitCommentsUpd);
  //   if (issueCommentsUpd.length > 0) await db.userIssueComments.upsertMany(issueCommentsUpd);
  // }
  // catch (error: any) {
  //   console.dir(error, { depth: null });
  // }

  dateWindows.incrementFromDate({ days: 1 });
  dateWindows.toDate = new Date();

  if (dateWindows.monthly().length === 0) return;

  const contributions = await contributionsController.fetch(octokit, dateWindows, login, user._id);

  const session = startSession();

  try {
    await runTransactionWithRetry(
      contributionsController.upsert.bind(null,
        contributions,
        { session }
      ),
      session
    );
  } catch (error) {
    // log.error(error);
    console.log(error);
  } finally {
    await session.endSession();
  }


  // const pullRequests = await getPullRequests(octokit, dateWindows.monthly(), user.login, user._id);
  // const pullRequestReviews = await getPullRequestReviews(octokit, dateWindows.monthly(), user.login, user._id);
  // const issues = await getIssues(octokit, dateWindows.monthly(), user.login, user._id);
  // const commits = await getCommits(octokit, dateWindows.monthly(), user.login);

  // // Insert User's Comments
  // const commitComments = await getCommitComments(octokit, dateWindows.fromDate, dateWindows.toDate, user.login, user._id);
  // const issueComments = await getIssueComments(octokit, dateWindows.fromDate, dateWindows.toDate, user.login, user._id);

  // try {
  //   if (pullRequests.length > 0) await db.pullRequests.insertMany(pullRequests);
  //   if (pullRequestReviews.length > 0) await db.pullRequestReviews.insertMany(pullRequestReviews);
  //   if (issues.length > 0) await db.issues.insertMany(issues);
  //   if (commits.length > 0) await db.commits.insertMany(commits);
  //   if (commitComments.length > 0) await db.userCommitComments.insertMany(commitComments);
  //   if (issueComments.length > 0) await db.userIssueComments.insertMany(issueComments);
  // }
  // catch (error: any) {
  //   console.dir(error.writeErrors, { depth: null });
  // }
}

export async function deleteUser(login: string) {
  // await deleteUserOne(reqParams.login);
  // TODO: Rewrite all the deleteMany() functions

  const result = await db.users.getOneId(login);
  const userId = result?._id;

  log.warn(`Starting procedure to delete user ${login}`);

  if (!userId) {
    log.warn(`User '${login}' does not exist. Ending...`);
    return;
  };

  const session = startSession();

  try {
    await runTransactionWithRetry(
      async () => {
        log.info("PullRequests: ", await db.pullRequests.deleteManyByUserId(userId), { session });
        log.info("PullRequestsReview: ", await db.pullRequestReviews.deleteManyByUserId(userId), { session });
        log.info("Issues: ", await db.issues.deleteManyByUserId(userId), { session });
        log.info("Commits: ", await db.commits.deleteManyByUserId(userId), { session });
        log.info("Commit Comments: ", await db.userCommitComments.deleteManyByUserId(userId), { session });
        log.info("Issue Comments: ", await db.userIssueComments.deleteManyByUserId(userId), { session });
        log.info("Users: ", await db.users.deleteOne({ _id: userId }), { session });
      },
      session
    );

    log.warn(`User '${login}' was successfully deleted.`);
  } catch (error) {
    console.log(error);
  } finally {
    log.debug("End transaction");
    await session.endSession();
  }
}

export async function deleteAll() {
  // log.info("Repositories: ", await db.repositories.deleteMany({}));
  log.info("PullRequests: ", await db.pullRequests.deleteMany({}));
  log.info("PullRequestsReview: ", await db.pullRequestReviews.deleteMany({}));
  log.info("Issues: ", await db.issues.deleteMany({}));
  log.info("Commits: ", await db.commits.deleteMany({}));
  log.info("Commit Comments: ", await db.userCommitComments.deleteMany({}));
  log.info("Issue Comments: ", await db.userIssueComments.deleteMany({}));
  log.info("Users: ", await db.users.deleteMany({}));
}
