import { AbstractCursor, AbstractCursorEvents, AggregateOptions } from "mongodb";

import { getDb } from "../db/conn.js";
import { Contibution, defaultPipelineOptions, PartialWithUserIdContributionDoc, PipelineOptions, PullRequestReviewDoc } from "./models.js";

import groupDailyMetrics from "../db/aggregations/pullRequestReviews/groupDailyMetrics.js";
import perPullRequestReviewMetrics from "../db/aggregations/pullRequestReviews/perPullRequestReviewMetrics.js";
import pullRequestReviewsStateMetrics from "../db/aggregations/pullRequestReviews/pullRequestReviewsStateMetrics.js";

const db = await getDb();

class PullRequestReviews extends Contibution<PullRequestReviewDoc> {
  metricsFnMap = new Map([
    ["groupDailyMetrics", this.groupDailyMetrics.bind(this)],
    ["perPullRequestReviewMetrics", this.perPullRequestReviewMetrics.bind(this)],
    ["pullRequestReviewsStateMetrics", this.pullRequestReviewsStateMetrics.bind(this)],
  ]);

  constructor() {
    super(db, "pullRequestReviews");
  }

  groupDailyMetrics(filter: PartialWithUserIdContributionDoc, options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(groupDailyMetrics(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

  perPullRequestReviewMetrics(filter: PartialWithUserIdContributionDoc, options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(perPullRequestReviewMetrics(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

  pullRequestReviewsStateMetrics(filter: PartialWithUserIdContributionDoc, options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(pullRequestReviewsStateMetrics(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }
}

export default new PullRequestReviews();

