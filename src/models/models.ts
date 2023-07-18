import {
  ObjectId,
  Document, Db, Collection,
  CollectionOptions,
  OptionalUnlessRequiredId, WithoutId, WithId,
  InsertOneResult, InsertOneOptions,
  InsertManyResult, BulkWriteOptions,
  DeleteResult, DeleteOptions,
  FindCursor, FindOptions,
  Filter, UpdateFilter, UpdateResult,
  ModifyResult, UpdateOptions, ReplaceOptions,
  FindOneAndUpdateOptions, FindOneAndDeleteOptions, FindOneAndReplaceOptions, EnhancedOmit, AbstractCursor, AggregateOptions
} from "mongodb";
import { type } from "os";
import logger from "../utils/logger/logger.js";

interface Github {
  id: string;
  url: string;
}
interface Label {
  name: string;
  description: string | null;
}

interface Language {
  name: string;
  size: number;
  percentage: number;
}

interface Commit {
  github: Github;
  additions: number;
  deletions: number;
  changedFiles: number;
}
interface File {
  filename: string;
  basename: string;
  ext: string;
  dir: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
}

interface CommitComment {
  author: {
    login: string;
  };
  publishedAt: Date;
  position: number | null;
  reactionsCount: number;
  body: string;
}

interface PullRequestReviewComment {
  login: string;
  github: Github;
  body: string;
}

interface ClosingIssuesReferences {
  github: Github;
}

interface AssociatedPullRequest {
  github: Github;
}

interface AssociatedIssue {
  type: 'Issue' | 'PullRequest';
  github: Github;
}

export type ContibutionCollectionName =
  "commits" |
  "discussions" |
  "issues" |
  "pullRequests" |
  "pullRequestReviews" |
  "userCommitComments" |
  "userIssueComments";

type CollectionName =
  ContibutionCollectionName |
  "repositories" |
  "users" |
  "metrics" |
  "usersMeta";

type InstallationStatus = "active" | "suspended" | "deleted";


// ***************************
//          Exports
// ***************************

// types

export type Sortable<T> = {
  [P in keyof T]?: -1 | 1;
};

export type WithOwnerAndName<TSchema> = EnhancedOmit<TSchema, "owner" | "name"> & {
  owner: RepositoryDoc["owner"];
  name: RepositoryDoc["name"];
};

export interface ContributionDoc extends Document {
  user_id: ObjectId;
  repository_id: ObjectId;
  github: Github;
}

export interface PipelineOptions {
  merge?: boolean;
}

export const defaultPipelineOptions: Required<PipelineOptions> = {
  merge: true,
};

export type WithUserId<T> = T & { user_id: ObjectId; };

export type PartialWithUserId<T> = WithUserId<Partial<T>>;

export type PartialWithUserIdContributionDoc = PartialWithUserId<ContributionDoc>;

export interface MetricDoc extends Document {
  user_id: ObjectId;
  repository_id: ObjectId;
}

export interface RepositoryDoc extends Document {
  owner: string;
  name: string;
  github: Github;
  labels: Label[];
  labelsCount: number;
  primaryLanguage: string | null;
  languages: Language[];
  languagesCount: number;
  languagesSize: number;
  topics: {
    name: string;
  };
  topicsCount: number;
  forkCount: number;
  stargazerCount: number;
  watchersCount: number;
}

export interface UserDoc extends Document {
  login: string;
  avatarUrl: string;
  github: Github;
  repositories: Array<ObjectId>;
  updatedAt: Date,
  name: string;
  bio: string;
  email: string;
  twitterUsername: string;
  websiteUrl: string;
}

export interface UserMetaDoc extends Document {
  login: string;
  updatedAt: Date | null; // User info/data last update on collection Users
  metrics: {
    updatedAt: Date | null;
  };
  contributions: {
    updatedAt: Date | null;
  };
  installation: {
    id: number | null; // app id 
    status: InstallationStatus;
    createdAt: Date;
    updatedAt?: Date | null;
  };


}

export interface CommitDoc extends ContributionDoc {
  github: Github;
  committedDate: Date;
  pushedDate: Date;
  additions: number;
  deletions: number;
  commentsCount: number;
  comments: CommitComment[];
  associatedPullRequestsCount: number;
  associatedPullRequests: AssociatedPullRequest[];
  filesCount?: number;
  files?: File[];
}
export interface IssueDoc extends ContributionDoc {
  github: Github;
  createdAt: Date;
  closedAt: Date | null;
  updatedAt: Date | null;
  state: "OPEN" | "CLOSED";
  title: string;
  body: string;
  reactionsCount: number;
  labels: Label[];
  closer: { login: string; } | null;
}

export interface PullRequestDoc extends ContributionDoc {
  github: Github;
  createdAt: Date;
  mergedAt: Date | null;
  closedAt: Date | null;
  updatedAt: Date | null;
  state: "OPEN" | "CLOSED" | "MERGED";
  reactionsCount: number;
  labels: Label[];
  title: string;
  body: string;
  commits: Commit[];
  commitsCount: number;
  commentsCount: number;
  closingIssuesReferences: ClosingIssuesReferences[];
  closingIssuesReferencesCount: number;
}
export interface PullRequestReviewDoc extends ContributionDoc {
  pullRequest: {
    github: Github;
  };
  github: Github;
  createdAt: Date;
  submittedAt: Date;
  updatedAt: Date | null;
  publishedAt: Date | null;
  lastEditedAt: Date | null;
  state: "PENDING" | "COMMENTED" | "APPROVED" | "CHANGES_REQUESTED" | "DISMISSED";
  body: string;
  comments: PullRequestReviewComment[];
}

export interface UserCommitCommentsDoc extends ContributionDoc {
  github: Github;
  createdAt: Date;
  publishedAt: Date;
  updatedAt: Date | null;
  lastEditedAt: Date | null;
  position: number | null;
  reactionsCount: number;
  body: string;
  commit: {
    github: Github;
  };
}

export interface UserIssueCommentsDoc extends ContributionDoc {
  github: Github;
  createdAt: Date;
  publishedAt: Date;
  updatedAt: Date | null;
  lastEditedAt: Date | null;
  associatedIssue: AssociatedIssue;
  body: string;
}

// Classes
export abstract class BaseModel<TSchema extends Document = Document> {
  collection: Collection<TSchema>;
  logger: any;

  constructor(db: Db, name: CollectionName, options?: CollectionOptions) {
    this.collection = db.collection<TSchema>(name, options);
    this.logger = logger.default;
  }

  insertOne(doc: OptionalUnlessRequiredId<TSchema>, options?: InsertOneOptions): Promise<InsertOneResult<TSchema>> {
    return options
      ? this.collection.insertOne(doc, options)
      : this.collection.insertOne(doc);
  }

  insertMany(docs: OptionalUnlessRequiredId<TSchema>[], options?: BulkWriteOptions): Promise<InsertManyResult<TSchema>> {
    return options
      ? this.collection.insertMany(docs, { ...options, ordered: false }) // ! Documents are inserted unordered
      : this.collection.insertMany(docs, { ordered: false });
  }

  updateOne(
    filter: Filter<TSchema>,
    update: UpdateFilter<TSchema> | Partial<TSchema>,
    options?: UpdateOptions,
  ): Promise<UpdateResult> | undefined {
    if (!filter) {
      this.logger.error(`updateOne: filter can not be ${null} or ${undefined}`);
      return;
    }

    return options
      ? this.collection.updateOne(filter, update, options)
      : this.collection.updateOne(filter, update);
  }

  replaceOne(
    filter: Filter<TSchema>,
    replacement: WithoutId<TSchema>,
    options?: ReplaceOptions
  ): Promise<UpdateResult | Document> | undefined {
    if (!filter) {
      this.logger.error(`replaceOne: filter can not be ${null} or ${undefined}`);
      return;
    }

    return options
      ? this.collection.replaceOne(filter, replacement, options)
      : this.collection.replaceOne(filter, replacement);
  }

  updateMany(
    filter: Filter<TSchema>,
    update: UpdateFilter<TSchema>,
    options?: UpdateOptions
  ): Promise<UpdateResult | Document> | undefined {
    if (!filter) {
      this.logger.error(`updateMany: filter can not be ${null} or ${undefined}`);
      return;
    }

    return options
      ? this.collection.updateMany(filter, update, options)
      : this.collection.updateMany(filter, update);
  }

  deleteOne(filter: Filter<TSchema>, options?: DeleteOptions): Promise<DeleteResult> | undefined {
    if (!filter) {
      this.logger.error(`deleteOne: filter can not be ${null} or ${undefined}`);
      return;
    }

    return options
      ? this.collection.deleteOne(filter, options)
      : this.collection.deleteOne(filter);
  }

  deleteMany(filter: Filter<TSchema>, options?: DeleteOptions): Promise<DeleteResult> | undefined {
    if (!filter) {
      this.logger.error(`deleteMany: filter can not be ${null} or ${undefined}`);
      return;
    }

    return options
      ? this.collection.deleteMany(filter, options)
      : this.collection.deleteMany(filter);
  }

  findOne(filter?: Filter<TSchema>, options?: FindOptions<TSchema>): Promise<WithId<TSchema> | null> {
    return !filter
      ? this.collection.findOne()
      : !options
        ? this.collection.findOne(filter)
        : this.collection.findOne(filter, options);
  }

  find(filter?: Filter<TSchema>, options?: FindOptions<TSchema>) {
    return filter
      ? this.collection.find(filter, options)
      : this.collection.find();
  }

  findOneAndDelete(
    filter: Filter<TSchema>,
    options?: FindOneAndDeleteOptions
  ): Promise<ModifyResult<TSchema>> | undefined {
    if (!filter) {
      this.logger.error(`findOneAndDelete: filter can not be ${null} or ${undefined}`);
      return;
    }

    return options
      ? this.collection.findOneAndDelete(filter, options)
      : this.collection.findOneAndDelete(filter);
  }

  findOneAndReplace(
    filter: Filter<TSchema>,
    replacement: WithoutId<TSchema>,
    options?: FindOneAndReplaceOptions
  ): Promise<ModifyResult<TSchema>> | undefined {
    if (!filter) {
      this.logger.error(`findOneAndReplace: filter can not be ${null} or ${undefined}`);
      return;
    }

    return options
      ? this.collection.findOneAndReplace(filter, replacement, options)
      : this.collection.findOneAndReplace(filter, replacement);
  }

  findOneAndUpdate(
    filter: Filter<TSchema>,
    update: UpdateFilter<TSchema>,
    options?: FindOneAndUpdateOptions,
  ): Promise<ModifyResult<TSchema>> | undefined {
    if (!filter) {
      this.logger.error(`findOneAndUpdate: filter can not be ${null} or ${undefined}`);
      return;
    }

    return options
      ? this.collection.findOneAndUpdate(filter, update, options)
      : this.collection.findOneAndUpdate(filter, update);
  }

  // upsertOne(doc: WithId<TSchema>): Promise<UpdateResult> | undefined {
  //   if (!doc) {
  //     this.logger.error(`findOneAndUpdate: filter can not be ${null} or ${undefined}`);
  //     return;
  //   }

  //   const { _id, ...updatedFields } = doc;

  //   return this.updateOne(_id, updatedFields, { upsert: true });
  // }

  // upsertMany(docs: WithId<TSchema>[]): (Promise<UpdateResult> | undefined)[] {
  //   const result = [];

  //   for (let i = 0; i < docs.length; i++) {
  //     const { _id, ...updatedFields } = docs[i];
  //     result.push(this.updateOne(_id, updatedFields, { upsert: true }));
  //   }

  //   return result;
  // }
}


export abstract class Contibution<TSchema extends ContributionDoc = ContributionDoc> extends BaseModel<TSchema> {
  abstract metricsFnMap: Map<string, Function>;

  constructor(db: Db, name: ContibutionCollectionName, options?: CollectionOptions) {
    super(db, name, options);
  }

  async getMetrics(filter: PartialWithUserIdContributionDoc) {
    let results = [];
    let cursors = [];

    for (const fn of this.metricsFnMap.values()) {
      const cursor = fn(filter, {pipelineOptions:{ merge: false }, aggregateOptions:{ batchSize: 101 }});
      results.push(cursor.next());
      cursors.push(cursor);
    }
    results = await Promise.all(results);

    cursors.forEach((cursor) => cursor.close());

    const metrics = {
      [`${this.constructor.name}`]: results.reduce((acc, cur) => acc = { ...acc, ...cur })
    };

    return metrics;
  }

  upsertMany(docs: TSchema[], options?: Omit<UpdateOptions, 'upsert'>): Promise<(UpdateResult | undefined)[]> {
    const result = [];

    for (let i = 0; i < docs.length; i++) {
      const { github } = docs[i];
      result.push(this.updateOne(
        { "github.id": github.id } as unknown as Filter<TSchema>,
        { $set: docs[i] },
        { upsert: true }
      ));
    }

    return Promise.all(result);
  }

  deleteManyByUserId(userId: TSchema["user_id"]): Promise<DeleteResult> | undefined {
    return this.deleteMany({ user_id: userId } as TSchema);
  }

  getCount(query: { "user_id": ObjectId, "repository_id"?: ObjectId; }) {
    return this.collection.countDocuments(query as TSchema);
  }

  // abstract windowedMetrics(filter: PartialContributionDoc, options?: AggregateOptions): AbstractCursor;
}