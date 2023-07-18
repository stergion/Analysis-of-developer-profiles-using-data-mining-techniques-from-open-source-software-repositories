import { AbstractCursor, AbstractCursorEvents, AggregateOptions } from "mongodb";

import { getDb } from "../db/conn.js";
import { Contibution, defaultPipelineOptions, PartialWithUserIdContributionDoc, PipelineOptions, UserCommitCommentsDoc } from "./models.js";

import groupDailyMetrics from "../db/aggregations/userCommitComments/groupDailyMetrics.js";
import perUserCommitCommentMetrics from "../db/aggregations/userCommitComments/perUserCommitCommentMetrics.js";

const db = await getDb();

class UserCommitComments extends Contibution<UserCommitCommentsDoc> {
  metricsFnMap = new Map([
    ["groupDailyMetrics", this.groupDailyMetrics.bind(this)],
    ["perUserCommitCommentMetrics", this.perUserCommitCommentMetrics.bind(this)],
  ]);

  constructor() {
    super(db, "userCommitComments");
  }

  groupDailyMetrics(filter: PartialWithUserIdContributionDoc, options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(groupDailyMetrics(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

  perUserCommitCommentMetrics(filter: PartialWithUserIdContributionDoc, options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(perUserCommitCommentMetrics(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

}

export default new UserCommitComments();


