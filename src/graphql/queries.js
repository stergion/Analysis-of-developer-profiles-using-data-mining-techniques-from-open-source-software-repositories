/* eslint-disable no-unused-vars */
import gql from "graphql-tag";

/*
 * =====================
 *      Fragments
 * =====================
 */
export const repositoryInfo = gql`
fragment repositoryInfo on Repository {
  owner {
    login
  }
  name
  id
  url
  labels(first: 100) {
    totalCount
    nodes {
      name
      description
    }
  }
  languages(first: 50) {
    edges {
      size
      node {
        name
      }
    }
    totalCount
    totalSize
  }
  repositoryTopics(first: 50) {
    totalCount
    nodes {
      topic {
        name
      }
    }
  }
  primaryLanguage {
    name
  }
  stargazerCount
  forkCount
  watchers {
    totalCount
  }
}
`;

export const commitInfo = gql`
fragment commitInfo on Commit {
  id
  oid
  commitUrl
  committedDate
  pushedDate
  changedFiles
  additions
  deletions
  message
  comments(first: 10) {
    nodes {
      author {
        login
      }
      publishedAt
      position
      reactions {
        totalCount
      }
      body
    }
  }
  associatedPullRequests(first: 10) {
    nodes {
      id
      url
    }
  }
}
`;

export const commitInfoLean = gql`
fragment commitInfoLean on Commit {
  id
  commitUrl
  changedFiles
  additions
  deletions
}
`;

export const commentInfo = gql`
fragment commentInfo on IssueCommentConnection {
  totalCount
  nodes {
    publishedAt
    author {
      login
    }
    body
    reactions {
      totalCount
    }
  }
}
`;

export const langSize = gql`
fragment langSize on Repository {
  languages(first: 10) {
    edges {
      size
      node {
        name
      }
    }
  }
}
`;

export const rateLimit = gql`
fragment rateLimit on Query {
  rateLimit {
    cost
    remaining
    nodeCount
  }
}
`;

/*
 * =====================
 *        Queries
 * =====================
 */
export const rateLimitQuery = gql`
query rateLimit {
  rateLimit {
    used
    remaining
    resetAt
  }
}
`;

export const weeklyContributionsQuery = gql`
query weeklyContributions(
  $login: String!
  $fromDate: DateTime
  $toDate: DateTime
) {
  user(login: $login) {
    name
    login
    contributionsCollection(from: $fromDate, to: $toDate) {
      startedAt
      endedAt
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
    }
  }
}
`;

export const repositoriesContributedToQuery = gql`
query repositoriesContributedTo(
  $login: String!
  $fromDate: DateTime
  $toDate: DateTime
) {
  user(login: $login) {
    contributionsCollection(from: $fromDate, to: $toDate) {
      issueContributionsByRepository(maxRepositories: 100) {
        repository {
          nameWithOwner
        }
      }
      commitContributionsByRepository(maxRepositories: 100) {
        repository {
          nameWithOwner
        }
      }
      pullRequestContributionsByRepository(maxRepositories: 100) {
        repository {
          nameWithOwner
        }
      }
      pullRequestReviewContributionsByRepository(maxRepositories: 100) {
        repository {
          nameWithOwner
        }
      }
    }
  }
}
`;

export const repositoriesCommitedToQuery = gql`
query repositoriesCommitedToQuery(
  $login: String!
  $fromDate: DateTime
  $toDate: DateTime
) {
  user(login: $login) {
    contributionsCollection(from: $fromDate, to: $toDate) {
      commitContributionsByRepository(maxRepositories: 100) {
        repository {
          nameWithOwner
        }
      }
    }
  }
}
`;

export const userCommitHistoryQuery = gql`
query userCommitHistory (
  $owner: String!
  $name: String!
  $authorId: ID!
  $fromDate: GitTimestamp
  $toDate: GitTimestamp
  $cursor: String
) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(author: { id: $authorId }, since: $fromDate, until: $toDate, after: $cursor) {
            totalCount
            pageInfo {
              endCursor
              hasNextPage
            }
            nodes {
              ...commitInfo
            }
          }
        }
      }
    }
  }
}
${commitInfo}
`;

export const prContributionsQuery = gql`
query prContributions(
  $login: String!
  $fromDate: DateTime
  $toDate: DateTime
  $cursor: String
) {
  user(login: $login) {
    name
    login
    contributionsCollection(from: $fromDate, to: $toDate) {
      startedAt
      endedAt
      pullRequestContributions(first: 40, after: $cursor) {
        totalCount
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          pullRequest {
            repository{
              nameWithOwner
            }
            id
            url
            createdAt
            mergedAt
            closedAt
            updatedAt
            state
            reactions {
              totalCount
            }
            labels(first: 10) {
              totalCount
              nodes {
                name
                description
              }
            }
            title
            body
            commits(first: 10) {
              totalCount
              nodes {
                commit {
                  ...commitInfoLean
                }
              }
            }
            comments {
              totalCount
            }
            closingIssuesReferences(first: 10) {
              nodes {
                id
                url
              }
              totalCount
            }
          }
        }
      }
    }
  }
}
${commitInfoLean}
`;

export const issueContributionsQuery = gql`
query issueContributions($login: String!, $fromDate: DateTime, $toDate: DateTime, $cursor: String) {
  user(login: $login) {
    name
    login
    contributionsCollection(from: $fromDate, to: $toDate) {
      startedAt
      endedAt
      issueContributions(first: 100, after: $cursor) {
        totalCount
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          issue {
            repository {
              nameWithOwner
            }
            id
            url
            createdAt
            updatedAt
            closedAt
            state
            title
            body
            timelineItems(first: 100, itemTypes: [CLOSED_EVENT]) {
              nodes {
                ... on ClosedEvent {
                  actor {
                    login
                  }
                }
              }
            }
            reactions {
              totalCount
            }
            labels(first: 10) {
              totalCount
              nodes {
                name
                description
              }
            }
            comments {
              totalCount
            }
          }
        }
      }
    }
  }
}
`;

export const prReviewContributionsQuery = gql`
query prReviewContributions($login: String!, $fromDate: DateTime, $toDate: DateTime, $cursor: String) {
  user(login: $login) {
    login
    contributionsCollection(from: $fromDate, to: $toDate) {
      startedAt
      endedAt
      pullRequestReviewContributions(first: 100, after: $cursor) {
        totalCount
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          pullRequestReview {
            repository{
              nameWithOwner
            }
            pullRequest {
              id
              url
            }
            createdAt
            updatedAt
            publishedAt
            submittedAt
            lastEditedAt
            id
            url
            state
            body
            comments(first: 50) {
              totalCount
              nodes {
                author {
                  login
                }
                id
                url
                body
              }
            }
          }
        }
      }
    }
  }
}
`;

export const userDiscussionsQuery = gql`
query userDiscussions($login: String!) {
  user(login: $login) {
    name
    login
    repositoryDiscussions(first: 10) {
      totalCount
      edges {
        node {
          id
          url
          createdAt
          repository {
            nameWithOwner
          }
          upvoteCount
          comments {
            totalCount
          }
          title
          bodyText
        }
      }
    }
  }
}
`;

// Paginating backwords to fetch more recent comments first.
// Index 0 of the nodes array has the comment more back in time and
// index -1 has the comment closer to now.
export const userIssueCommentsQuery = gql`
query userIssueComments($login: String!, $cursor: String) {
  user(login: $login) {
    issueComments(last: 100, before: $cursor) {
      totalCount
      pageInfo {
        startCursor
        hasPreviousPage
      }
      nodes {
        id
        url
        createdAt
        updatedAt
        publishedAt
        lastEditedAt
        repository {
          nameWithOwner
        }
        issue {
          id
          url
        }
        pullRequest {
          id
          url
        }
        body
        reactions{
          totalCount
        }
      }
    }
  }
}
`;

// Paginating backwords to fetch more recent comments first.
// Index 0 of the nodes array has the comment more back in time and
// index -1 has the comment closer to now.
export const userCommitCommentsQuery = gql`
query userCommitComments($login: String!, $cursor: String) {
  user(login: $login) {
    commitComments(last: 100, before: $cursor) {
      totalCount
      pageInfo{
        startCursor
        hasPreviousPage
      }
      nodes {
          id
          url
          createdAt
          updatedAt
          publishedAt
          lastEditedAt
          commit {
            id
            url
          }
          repository {
            nameWithOwner
          }
          position
          body
          reactions {
            totalCount
          }
        }
    }
  }
}
`;

export const userInfoQuery = gql`
query userInfo($login: String!) {
  user(login: $login) {
    name
    bio
    id
    url
    email
    avatarUrl
    twitterUsername
    websiteUrl
  }
}
`;

export const repositoryInfoQuery = gql`
query repository($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    ...repositoryInfo
  }
}
${repositoryInfo}
`;
