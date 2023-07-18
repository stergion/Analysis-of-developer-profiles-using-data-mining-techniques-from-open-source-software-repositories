import { AbstractCursor, AbstractCursorEvents, AggregateOptions } from "mongodb";

import { getDb } from "../db/conn.js";
import { Contibution, defaultPipelineOptions, PartialWithUserIdContributionDoc, PipelineOptions, UserIssueCommentsDoc } from "./models.js";

import groupDailyMetrics from "../db/aggregations/userIssueComments/groupDailyMetrics.js";
import perUserIssueCommentMetrics from "../db/aggregations/userIssueComments/perUserIssueCommentMetrics.js";

const db = await getDb();

class UserIssueComments extends Contibution<UserIssueCommentsDoc> {
  metricsFnMap = new Map([
    ["groupDailyMetrics", this.groupDailyMetrics.bind(this)],
    ["perUserIssueCommentMetrics", this.perUserIssueCommentMetrics.bind(this)],
  ]);

  constructor() {
    super(db, "userIssueComments");
  }

  groupDailyMetrics(filter: PartialWithUserIdContributionDoc, options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(groupDailyMetrics(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

  perUserIssueCommentMetrics(filter: PartialWithUserIdContributionDoc, options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(perUserIssueCommentMetrics(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }
}

export default new UserIssueComments();