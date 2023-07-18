/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { print } from "graphql";
import { fileFrom } from "node-fetch";
import {
  userInfoQuery,
  repositoriesCommitedToQuery,
  repositoriesContributedToQuery as repoContribs,
  prContributionsQuery,
  prReviewContributionsQuery,
  issueContributionsQuery,
} from "../graphql/queries.js";
import * as fetchgh from "../helpers/fetch.js";
import * as qtm from "../helpers/queryToModel.js";
import * as retryAfter from "../helpers/retryAfter.js";
import db from "../models/index.js";
import logger from "../utils/logger/logger.js";

export const log = logger.default;

export async function insertUser(octokit, userLogin) {
  const { user } = await octokit.graphql(print(userInfoQuery), { login: userLogin });

  user.login = userLogin;

  const userModel = qtm.userQueryToModel(user);
  const { insertedId } = await db.users.insertOne(userModel);

  return insertedId;
}

async function repositoriesContributedTo(octokit, datesArray, login) {
  const results = [];

  for (let i = 0; i < datesArray.length; i++) {
    const [fromDate, toDate] = datesArray[i];
    results.push(octokit.graphql(print(repoContribs), {
      login, fromDate, toDate,
    }));
  }

  const nameWithOwnerSet = new Set();
  for (const {
    user: {
      contributionsCollection: {
        issueContributionsByRepository, commitContributionsByRepository, pullRequestContributionsByRepository, pullRequestReviewContributionsByRepository,
      },
    },
  } of await Promise.all(results)) {
    issueContributionsByRepository.forEach(({ repository }) => {
      nameWithOwnerSet.add(repository.nameWithOwner);
    });

    commitContributionsByRepository.forEach(({ repository }) => {
      nameWithOwnerSet.add(repository.nameWithOwner);
    });

    pullRequestContributionsByRepository.forEach(({ repository }) => {
      nameWithOwnerSet.add(repository.nameWithOwner);
    });

    pullRequestReviewContributionsByRepository.forEach(({ repository }) => {
      nameWithOwnerSet.add(repository.nameWithOwner);
    });
  }

  return Array.from(nameWithOwnerSet, (nameWithOwner) => {
    const [owner, name] = nameWithOwner.split("/");
    return { owner, name };
  });
}

export async function insertRepositoriesContributedTo(octokit, datesArray, userLogin) {
  const repositories = await repositoriesContributedTo(octokit, datesArray, userLogin);

  let repositoryInfoArray = repositories.map(fetchgh.fetchRepositoryInfo(octokit));
  repositoryInfoArray = await Promise.all(repositoryInfoArray);
  const repoModelArray = repositoryInfoArray.map(qtm.repoInfoQueryToModel);
  await db.repositories.upsertMany(repoModelArray);

  return db.repositories.findManyIds(repoModelArray);
}

async function insertRepositoryInfo(octokit, repository) {
  const repositoryInfo = await fetchgh.fetchRepositoryInfo(octokit)(repository);
  const repositoryModel = qtm.repoInfoQueryToModel(repositoryInfo);
  const { insertedId } = await db.repositories.insertOne(repositoryModel);

  return insertedId;
}

export async function getPullRequests(octokit, datesArray, login, userId) {
  let queryResponseArray = [];
  const repositoryIds = new Map();
  const pullRequestModels = [];

  for (let i = 0; i < datesArray.length; i++) {
    const [fromDate, toDate] = datesArray[i];
    queryResponseArray.push(octokit.graphql.paginate(print(prContributionsQuery), {
      login, fromDate, toDate, cursor: null,
    }));
  }
  queryResponseArray = await Promise.all(queryResponseArray);

  for (const { user } of queryResponseArray) {
    const { nodes } = user.contributionsCollection.pullRequestContributions;

    for (const { pullRequest: { repository, ...pullRequest } } of nodes) {
      // if repo is not in DB insert it.
      if (!repositoryIds.has(repository.nameWithOwner)) {
        const [owner, name] = repository.nameWithOwner.split("/");

        const result = await db.repositories.getOneId(owner, name);
        let repoId = result?._id;
        if (!repoId) {
          log.debug(`@IPR: Uninserted Repo: ${owner}/${name}`);

          repoId = await insertRepositoryInfo(octokit, { owner, name });
        }
        repositoryIds.set(repository.nameWithOwner, repoId);
      }

      const repositoryId = repositoryIds.get(repository.nameWithOwner);
      pullRequestModels.push(qtm.pullRequestQueryToModel({ userId, repositoryId, pullRequest }));
    }
  }

  // Update User's Repositories Conttributed to
  await db.users.updateRepositories({ _id: userId }, Array.from(repositoryIds.values()));

  return pullRequestModels;
}

export async function getPullRequestReviews(octokit, datesArray, login, userId) {
  let queryResponseArray = [];
  const repositoryIds = new Map();
  const pullRequestReviewModels = [];

  for (let i = 0; i < datesArray.length; i++) {
    const [fromDate, toDate] = datesArray[i];
    queryResponseArray.push(octokit.graphql.paginate(print(prReviewContributionsQuery), {
      login, fromDate, toDate, cursor: null,
    }));
  }
  queryResponseArray = await Promise.all(queryResponseArray);

  for (const { user } of queryResponseArray) {
    const { nodes } = user.contributionsCollection.pullRequestReviewContributions;

    for (const { pullRequestReview: { repository, pullRequest, ...prReview } } of nodes) {
      // if repo is not in DB insert it.
      if (!repositoryIds.has(repository.nameWithOwner)) {
        const [owner, name] = repository.nameWithOwner.split("/");

        const result = await db.repositories.getOneId(owner, name);
        let repoId = result?._id;
        if (!repoId) {
          log.debug(`@IPRR: Uninserted Repo: ${owner}/${name}`);

          repoId = await insertRepositoryInfo(octokit, { owner, name });
        }
        repositoryIds.set(repository.nameWithOwner, repoId);
      }

      const repositoryId = repositoryIds.get(repository.nameWithOwner);
      pullRequestReviewModels.push(qtm.pullRequestReviewQueryToModel(
        { userId, repositoryId, pullRequest, prReview },
      ));
    }
  }

  // Update User's Repositories Conttributed to
  await db.users.updateRepositories({ _id: userId }, Array.from(repositoryIds.values()));

  return pullRequestReviewModels;
}

export async function getIssues(octokit, datesArray, login, userId) {
  let queryResponseArray = [];
  const repositoryIds = new Map();
  const issueModels = [];

  for (let i = 0; i < datesArray.length; i++) {
    const [fromDate, toDate] = datesArray[i];
    queryResponseArray.push(octokit.graphql.paginate(print(issueContributionsQuery), {
      login, fromDate, toDate, cursor: null,
    }));
  }
  queryResponseArray = await Promise.all(queryResponseArray);

  for (const { user } of queryResponseArray) {
    const { nodes } = user.contributionsCollection.issueContributions;

    for (const { issue: { repository, ...issue } } of nodes) {
      // if repo is not in DB insert it.
      if (!repositoryIds.has(repository.nameWithOwner)) {
        const [owner, name] = repository.nameWithOwner.split("/");

        const result = await db.repositories.getOneId(owner, name);
        let repoId = result?._id;
        if (!repoId) {
          log.debug(`@IIs: Uninserted Repo: ${owner}/${name}`);

          repoId = await insertRepositoryInfo(octokit, { owner, name });
        }
        repositoryIds.set(repository.nameWithOwner, repoId);
      }

      const repositoryId = repositoryIds.get(repository.nameWithOwner);
      issueModels.push(qtm.issueQueryToModel({ userId, repositoryId, issue }));
    }
  }

  // Update User's Repositories Conttributed to
  await db.users.updateRepositories({ _id: userId }, Array.from(repositoryIds.values()));

  return issueModels;

  // if (issueModels.length === 0) {
  //   log.debug("User does not have any Issues.");
  //   log.info("Issues: SUCCESS");
  //   return;
  // }

  // let result;
  // try {
  //   result = await db.issues.insertMany(issueModels);
  // } catch (error) {
  //   console.dir(error.writeErrors, { depth: null });
  // }

  // log.info(`Issues Inserted: ${issueModels.length === result?.resinsertedCount ? "SUCCESS" : "FAILURE"}`);
}

async function getCommitModels({ repositoryId, owner, name }, commits, userId, octokit, commitModels) {
  // /*
  //* Remove block comment to start saving commit files
  let filesOfCommitArray = [];

  for (const commit of commits) {
    filesOfCommitArray.push(octokit.rest.repos.getCommit({
      owner,
      repo: name,
      ref: commit.oid,
    }));
  }

  filesOfCommitArray = (await Promise.all(filesOfCommitArray)).map((elem) => elem.data.files);
  // */
  commits.forEach((commit, index) => {
    commitModels.push(qtm.commitQueryToModel({
      userId,
      repositoryId,
      commit,
      // files: [],
      // * Uncomment the line bellow to start saving commit files
      files: filesOfCommitArray[index],
    }));
  });
}

export async function getCommits(octokit, datesArray, login) {
  const repositoryIds = new Map();
  const commitModels = [];
  let commitsOfRepoArray = [];

  const user = await db.users.findOne({ login }, { projection: { "github.id": 1 } });

  const nameWithOwners = await fetchgh.fetchRepositoriesUserCommited(octokit, datesArray, login);

  const [, toDate] = datesArray[0];
  const [fromDate] = datesArray.at(-1);

  for (const nameWithOwner of nameWithOwners) {
    const [owner, name] = nameWithOwner.split("/");
    commitsOfRepoArray.push(fetchgh.fetchCommits(octokit, owner, name, user.github.id, fromDate, toDate));
  }
  commitsOfRepoArray = await Promise.all(commitsOfRepoArray);

  const promises = [];
  for (let i = 0; i < nameWithOwners.length; i++) {
    const nameWithOwner = nameWithOwners[i];
    const [owner, name] = nameWithOwner.split("/");

    // if repo is not in DB insert it.
    if (!repositoryIds.has(nameWithOwner)) {
      const result = await db.repositories.getOneId(owner, name);
      let repoId = result?._id;
      if (!repoId) {
        log.debug(`Commit: Uninserted Repo: ${owner}/${name}`);
        repoId = await insertRepositoryInfo(octokit, { owner, name });
      }
      repositoryIds.set(nameWithOwner, repoId);
    }

    const repositoryId = repositoryIds.get(nameWithOwner);
    promises.push(
      getCommitModels({ repositoryId, owner, name }, commitsOfRepoArray[i], user._id, octokit, commitModels),
    );
  }

  await Promise.all(promises);

  // Update User's Repositories Conttributed to
  await db.users.updateRepositories({ _id: user._id }, Array.from(repositoryIds.values()));

  return commitModels;
}

export async function getCommitComments(octokit, fromDate, toDate, login, userId) {
  const commitCommentModels = [];
  const repositoryIds = new Map();

  const results = await fetchgh.fetchCommitComments(octokit, login, fromDate, toDate);

  for (const { repository, ...commitComment } of results) {
    if (!repositoryIds.has(repository.nameWithOwner)) {
      const [owner, name] = repository.nameWithOwner.split("/");

      const result = await db.repositories.getOneId(owner, name);
      let repoId = result?._id;
      if (!repoId) {
        log.debug(`@ICC: Uninserted Repo: ${owner}/${name}`);
        repoId = await insertRepositoryInfo(octokit, { owner, name });
      }
      repositoryIds.set(repository.nameWithOwner, repoId);
    }

    const repositoryId = repositoryIds.get(repository.nameWithOwner);
    commitCommentModels.push(
      qtm.commitCommentQueryToModel({ userId, repositoryId, commitComment }),
    );
  }

  // Update User's Repositories Conttributed to
  await db.users.updateRepositories({ _id: userId }, Array.from(repositoryIds.values()));

  return commitCommentModels;

  // if (commitCommentModels.length === 0) {
  //   log.debug("User does not have any Commit Comments.");
  //   log.info("Commit Comments: SUCCESS");
  //   return;
  // }

  // let result;
  // try {
  //   result = await db.userCommitComments.insertMany(commitCommentModels);
  // } catch (error) {
  //   console.dir(error.writeErrors, { depth: null });
  // }

  // log.info(`Commit Comments: ${commitCommentModels.length === result?.insertedCount ? "SUCCESS" : "FAILURE"}`);
}

export async function getIssueComments(octokit, fromDate, toDate, login, userId) {
  const issueCommentModels = [];
  const repositoryIds = new Map();

  const results = await fetchgh.fetchIssueComments(octokit, login, fromDate, toDate);

  for (const { repository, ...issueComment } of results) {
    if (!repositoryIds.has(repository.nameWithOwner)) {
      const [owner, name] = repository.nameWithOwner.split("/");

      const result = await db.repositories.getOneId(owner, name);
      let repoId = result?._id;
      if (!repoId) {
        log.debug(`@IIC: Uninserted Repo: ${owner}/${name}`);
        repoId = await insertRepositoryInfo(octokit, { owner, name });
      }
      repositoryIds.set(repository.nameWithOwner, repoId);
    }

    const repositoryId = repositoryIds.get(repository.nameWithOwner);
    issueCommentModels.push(
      qtm.issueCommentQueryToModel({ userId, repositoryId, issueComment }),
    );
  }

  // Update User's Repositories Conttributed to
  await db.users.updateRepositories({ _id: userId }, Array.from(repositoryIds.values()));

  return issueCommentModels;

  // if (issueCommentModels.length === 0) {
  //   log.debug("User does not have any Issue Comments.");
  //   log.info("Issue Comments: SUCCESS");
  //   return;
  // }

  // // console.debug(issueCommentModels);
  // let result;
  // try {
  //   result = await db.userIssueComments.insertMany(issueCommentModels);
  // } catch (error) {
  //   console.dir(error.writeErrors, { depth: null });
  // }

  // log.info(`Issue Comments: ${issueCommentModels.length === result?.insertedCount ? "SUCCESS" : "FAILURE"}`);
}
