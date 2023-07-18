import path from "path";
import {
  CommitDoc,
  IssueDoc,
  PullRequestDoc,
  PullRequestReviewDoc,
  RepositoryDoc,
  UserCommitCommentsDoc,
  UserDoc,
  UserIssueCommentsDoc
} from "../models/models.js";

export const userQueryToModel = (user: any): UserDoc => ({
  login: user.login,
  name: user.name,
  updatedAt: new Date(),
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  github: {
    id: user.id,
    url: user.url,
  },
  repositories: [],
  email: user.email,
  twitterUsername: user.twitterUsername,
  websiteUrl: user.websiteUrl,
});

export const repoInfoQueryToModel = ({ repository }: any): RepositoryDoc => {
  const langs = [];
  for (const { size, node } of repository.languages.edges) {
    langs.push({
      size,
      name: node.name,
      percentage: size / repository.languages.totalSize,
    });
  }

  return {
    owner: repository.owner.login,
    name: repository.name,
    github: {
      id: repository.id,
      url: repository.url,
    },
    labels: repository.labels.nodes,
    labelsCount: repository.labels.totalCount,
    primaryLanguage: repository.primaryLanguage?.name,
    languages: langs,
    languagesCount: repository.languages.totalCount,
    languagesSize: repository.languages.totalSize,
    topics: repository.repositoryTopics.nodes,
    topicsCount: repository.repositoryTopics.totalCount,
    forkCount: repository.forkCount,
    stargazerCount: repository.stargazerCount,
    watchersCount: repository.watchers.totalCount,
  };
};

export const pullRequestQueryToModel = ({ userId, repositoryId, pullRequest: pr }: any): PullRequestDoc => {
  const commits = pr.commits.nodes.map(({ commit: { id, commitUrl: url, ...props } }: any) => ({
    github: { id, url },
    ...props,
  }));

  const closingIssuesReferences = pr.closingIssuesReferences.nodes.map(
    ({ id, url }: any) => ({ github: { id, url } }),
  );

  return {
    user_id: userId,
    repository_id: repositoryId,
    github: {
      id: pr.id,
      url: pr.url,
    },
    createdAt: new Date(pr.createdAt),
    mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
    closedAt: pr.closedAt ? new Date(pr.closedAt) : null,
    updatedAt: pr.updatedAt ? new Date(pr.updatedAt) : null,
    state: pr.state,
    reactionsCount: pr.reactions.totalCount,
    labels: pr.labels.nodes,
    title: pr.title,
    body: pr.body,
    commits,
    commitsCount: pr.commits.totalCount,
    commentsCount: pr.comments.totalCount,
    closingIssuesReferences,
    closingIssuesReferencesCount: pr.closingIssuesReferences.totalCount,
  };
};

export const pullRequestReviewQueryToModel = ({ userId, repositoryId, pullRequest, prReview }: any): PullRequestReviewDoc => {
  const comments = prReview.comments.nodes.map(({
    author: { login }, id, url, body,
  }: any) => ({
    login,
    github: { id, url },
    body,
  }));

  return {
    user_id: userId,
    repository_id: repositoryId,
    pullRequest: {
      github: {
        id: pullRequest.id,
        url: pullRequest.url,
      },
    },
    github: {
      id: prReview.id,
      url: prReview.url,
    },
    createdAt: new Date(prReview.createdAt),
    submittedAt: new Date(prReview.submittedAt),
    updatedAt: prReview.updatedAt ? new Date(prReview.updatedAt) : null,
    publishedAt: prReview.publishedAt ? new Date(prReview.publishedAt) : null,
    lastEditedAt: prReview.lastEditedAt ? new Date(prReview.lastEditedAt) : null,
    state: prReview.state,
    body: prReview.body,
    comments,
    commentsCount: prReview.comments.totalCount,
  };
};

export const issueQueryToModel = ({ userId, repositoryId, issue }: any): IssueDoc => {
  const closer = issue.timelineItems.nodes[0]?.actor
    ? { login: issue.timelineItems.nodes[0]?.actor.login }
    : null;

  return {
    user_id: userId,
    repository_id: repositoryId,
    github: {
      id: issue.id,
      url: issue.url,
    },
    createdAt: new Date(issue.createdAt),
    closedAt: issue.closedAt ? new Date(issue.closedAt) : null,
    updatedAt: issue.updatedAt ? new Date(issue.updatedAt) : null,
    state: issue.state,
    title: issue.title,
    body: issue.body,
    closer,
    reactionsCount: issue.reactions.totalCount,
    labels: issue.labels.nodes,
    commentsCount: issue.comments.totalCount,
  };
};

export const commitQueryToModel = ({ userId, repositoryId, commit, files }: any): CommitDoc => {
  const comments = commit.comments.nodes.map(({ reactions, publishedAt, ...comment }: any) => ({
    ...comment,
    publishedAt: new Date(publishedAt),
    reactionsCount: reactions.totalCount,
  }));

  const associatedPullRequests = commit.associatedPullRequests.nodes.map(({ id, url }: any) => ({
    github: { id, url },
  }));

  const files2 = files.map(({ filename, status, additions, deletions, changes, patch }: any) => {
    const parsedFilename = path.parse(filename);
    return {
      filename,
      basename: parsedFilename.base,
      extname: parsedFilename.ext,
      dirname: parsedFilename.dir,
      status,
      additions,
      deletions,
      changes,
      /* patch, */
    };
  });

  return {
    user_id: userId,
    repository_id: repositoryId,
    github: {
      id: commit.id,
      url: commit.commitUrl,
    },
    committedDate: new Date(commit.committedDate),
    pushedDate: new Date(commit.pushedDate),
    additions: commit.additions,
    deletions: commit.deletions,
    commentsCount: comments.length,
    comments,
    associatedPullRequestsCount: associatedPullRequests.length,
    associatedPullRequests,
    filesCount: files2.length,
    files: files2,
  };
};

export const commitCommentQueryToModel = ({ userId, repositoryId, commitComment }: any): UserCommitCommentsDoc => ({
  user_id: userId,
  repository_id: repositoryId,
  github: {
    id: commitComment.id,
    url: commitComment.url,
  },
  createdAt: new Date(commitComment.createdAt),
  publishedAt: new Date(commitComment.publishedAt),
  updatedAt: commitComment.updatedAt ? new Date(commitComment.updatedAt) : null,
  lastEditedAt: commitComment.lastEditedAt ? new Date(commitComment.lastEditedAt) : null,
  position: commitComment.position,
  body: commitComment.body,
  reactionsCount: commitComment.reactions.totalCount,
  commit: {
    github: {
      id: commitComment.commit.id,
      url: commitComment.commit.url,
    },
  },
});

export const issueCommentQueryToModel = ({ userId, repositoryId, issueComment }: any): UserIssueCommentsDoc => ({
  user_id: userId,
  repository_id: repositoryId,
  github: {
    id: issueComment.id,
    url: issueComment.url,
  },
  createdAt: new Date(issueComment.createdAt),
  publishedAt: new Date(issueComment.publishedAt),
  updatedAt: issueComment.updatedAt ? new Date(issueComment.updatedAt) : null,
  lastEditedAt: issueComment.lastEditedAt ? new Date(issueComment.lastEditedAt) : null,
  body: issueComment.body,
  reactionsCount: issueComment.reactions.totalCount,
  associatedIssue: {
    type: issueComment.pullRequest ? "PullRequest" : "Issue",
    github: {
      id: issueComment.issue.id,
      url: issueComment.issue.url,
    },
  },
});
