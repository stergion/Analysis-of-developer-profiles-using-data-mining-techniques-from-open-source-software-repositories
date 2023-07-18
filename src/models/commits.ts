import { AbstractCursor, AbstractCursorEvents, AggregateOptions } from "mongodb";

import { getDb } from "../db/conn.js";
import { Contibution, CommitDoc, PartialWithUserIdContributionDoc, defaultPipelineOptions, PipelineOptions } from "./models.js";

import groupDailyMetrics from "../db/aggregations/commits/groupDailyMetrics.js";
import perCommitMetrics from "../db/aggregations/commits/perCommitMetrics.js";
import topFileExts from "../db/aggregations/commits/topFileExts.js";
import commitedFilesRatios from "../db/aggregations/commits/commitedFilesRatios.js";

const db = await getDb();

class Commits extends Contibution<CommitDoc> {
  metricsFnMap = new Map([
    ["groupDailyMetrics", this.groupDailyMetrics.bind(this)],
    ["perCommitMetrics", this.perCommitMetrics.bind(this)],
    ["topFileExts", this.topFileExts.bind(this)],
    ["commitedFilesRatios", this.commitedFilesRatiosMetrics.bind(this)],
  ]);

  constructor() {
    super(db, "commits");
  }

  groupDailyMetrics(filter: PartialWithUserIdContributionDoc, options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(groupDailyMetrics(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

  perCommitMetrics(filter: PartialWithUserIdContributionDoc, options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(perCommitMetrics(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

  topFileExts(filter: PartialWithUserIdContributionDoc, options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions, }) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(topFileExts(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }

  commitedFilesRatiosMetrics(filter: PartialWithUserIdContributionDoc,
    options?: { pipelineOptions?: PipelineOptions, aggregateOptions?: AggregateOptions; }
  ) {
    const aggregateOptions = options?.aggregateOptions;
    const pipelineOptions = { ...defaultPipelineOptions, ...options?.pipelineOptions };

    const cursor = this.collection.aggregate(commitedFilesRatios(filter, pipelineOptions), aggregateOptions);

    if (pipelineOptions.merge) cursor.forEach(() => { });

    return cursor;
  }
}

export default new Commits();
