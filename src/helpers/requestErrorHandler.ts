import { sleep } from "../utils/sleep.js";
import logger from "../utils/logger/logger.js";
import { RequestError } from "@octokit/request-error";
import { GraphqlResponseError } from "@octokit/graphql";

const log = logger.default;

export default async function requestErrorHandler(error: any) {
  let retry = true;

  if (error.status === 403 && error.response.headers["retry-after"] > 0) {
    const seconds = error.response.headers["retry-after"];

    log.warn(`Secondary rate limit exceeded. Application will resume in ${seconds} seconds.`);

    await sleep(seconds * 1000);
  } else if (error.status === 403 && error.response.headers["x-ratelimit-remaining"] === "0") {
    const seconds = error.response.headers["x-ratelimit-reset"] - Math.floor(Date.now() / 1000);

    log.warn(`API rate limit exceeded. Application will resume in ${seconds / 60} minutes.`);

    await sleep(seconds * 1000);
  } else if (error.errors?.[0]?.type === "FORBIDDEN") {
    log.error("FORBIDDEN: \n")
    log.error(error.errors[0].message);
    retry = false;
  } else if (error instanceof RequestError && error.status === 502 && error.message.includes("Unknown error")) {
    // log.warn("Query too big. Trying fetching less items.", {body: error.request?.body});
    console.dir(error, { depth: null });

    retry = false;
  } else if (error instanceof GraphqlResponseError && error.message.includes("Something went wrong while executing your query")) {
    console.dir(error, { depth: null });
    log.warn("GraphqlResponseError: Retrying request in 1 second.");

    retry = true;
    console.time('GraphqlResponseError');
    await sleep(1000);
    console.timeEnd('GraphqlResponseError');
  }
  else {
    throw error;
  }

  return { retry };
}
