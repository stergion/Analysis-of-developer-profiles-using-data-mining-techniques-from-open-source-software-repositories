import { AbstractCursor, AbstractCursorEvents, AggregateOptions, ObjectId } from "mongodb";

import { getDb } from "../db/conn.js";
import { Contibution, defaultPipelineOptions, IssueDoc, PartialWithUserIdContributionDoc, PipelineOptions } from "./models.js";

import issuesStateMetrics from "../db/aggregations/issues/issuesStateMetrics.js";
import perIssueMetrics from "../db/aggregations/issues/perIssueMetrics.js";
import groupDailyMetrics from "../db/aggregations/issues/groupDailyMetrics.js";
import timeToClose from "../db/aggregations/issues/timeToClose.js";
import issueLabelsRatios from "../db/aggregations/issues/issueLabelsRatios.js";

const db = await getDb();

class Issues extends Contibution<IssueDoc> {
  metricsFnMap = new Map([
    ["issuesStateMetrics", this.issuesStateMetrics.bind(this)],
    ["perIssueMetrics", this.perIssueMetrics.bind(this)],
    ["groupDailyMetrics", this.groupDailyMetrics.bind(this)],
    ["timeToClose", this.timeToCloseMetrics.bind(this)],
    ["issueLabelsRatios", this.issueLabelsRatiosMetrics.bind(this)],
  ]);

  constructor() {
    super(db, "issues");
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

  issuesStateMetrics(filter: PartialWithUserIdContributionDoc,
    options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }
  ) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(issuesStateMetrics(filter, pipelineOptions), aggregateOptions);
    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

  perIssueMetrics(filter: PartialWithUserIdContributionDoc,
    options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }
  ) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(perIssueMetrics(filter, pipelineOptions), aggregateOptions);

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

  issueLabelsRatiosMetrics(filter: PartialWithUserIdContributionDoc,
    options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }
  ) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(issueLabelsRatios(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;

  }
}

export default new Issues();