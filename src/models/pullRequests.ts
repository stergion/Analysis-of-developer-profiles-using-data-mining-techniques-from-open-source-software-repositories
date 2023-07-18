import { AggregateOptions } from "mongodb";

import { getDb } from "../db/conn.js";
import { Contibution, PartialWithUserIdContributionDoc, PullRequestDoc, PipelineOptions, defaultPipelineOptions } from "./models.js";

import groupDailyMetrics from "../db/aggregations/pullRequests/groupDailyMetrics.js";
import perPullRequestMetrics from "../db/aggregations/pullRequests/perPullRequestMetrics.js";
import pullRequestStateMetrics from "../db/aggregations/pullRequests/pullRequestStateMetrics.js";
import timeToClose from "../db/aggregations/pullRequests/timeToClose.js";
import timeToMerge from "../db/aggregations/pullRequests/timeToMerge.js";
import pullRequestLabelsRatios from "../db/aggregations/pullRequests/pullRequestLabelsRatios.js";
import issuesClosed from "../db/aggregations/pullRequests/issuesClosed.js";

const db = await getDb();

class PullRequests extends Contibution<PullRequestDoc> {
  metricsFnMap = new Map([
    ["groupDailyMetrics", this.groupDailyMetrics.bind(this)],
    ["perPullRequestMetrics", this.perPullRequestMetrics.bind(this)],
    ["pullRequestStateMetrics", this.pullRequestStateMetrics.bind(this)],
    ["timeToClose", this.timeToCloseMetrics.bind(this)],
    ["timeToMerge", this.timeToMergeMetrics.bind(this)],
    ["pullRequestLabelsRatios", this.pullRequestLabelsRatiosMetrics.bind(this)],
    ["issuesClosed", this.issuesClosedMetrics.bind(this)],
  ]);

  constructor() {
    super(db, "pullRequests");
  }

  groupDailyMetrics(filter: PartialWithUserIdContributionDoc,
    options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }
  ) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(groupDailyMetrics(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

  perPullRequestMetrics(filter: PartialWithUserIdContributionDoc,
    options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }
  ) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(perPullRequestMetrics(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

  pullRequestStateMetrics(filter: PartialWithUserIdContributionDoc,
    options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }
  ) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(pullRequestStateMetrics(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

  timeToCloseMetrics(filter: PartialWithUserIdContributionDoc,
    options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }
  ) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(timeToClose(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

  timeToMergeMetrics(filter: PartialWithUserIdContributionDoc,
    options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }
  ) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(timeToMerge(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

  pullRequestLabelsRatiosMetrics(filter: PartialWithUserIdContributionDoc,
    options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }
  ) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(pullRequestLabelsRatios(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

  issuesClosedMetrics(filter: PartialWithUserIdContributionDoc,
    options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }
  ) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(issuesClosed(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }
}

export default new PullRequests();

