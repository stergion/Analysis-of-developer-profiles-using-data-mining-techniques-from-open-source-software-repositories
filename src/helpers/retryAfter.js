/* eslint-disable no-await-in-loop */
/* eslint-disable import/prefer-default-export */
import requestErrorHandler from "./requestErrorHandler.js";

export async function graphql({ fn, query, queryParams }) {
  let data = null;
  let retry = true;

  do {
    try {
      data = await fn(query, queryParams);
    } catch (error) {
      ({ retry } = await requestErrorHandler(error));
    }
  } while (!data && retry);
  return data;
}

export async function rest({ fn, params }) {
  let data = null;
  let retry = true;

  do {
    try {
      data = await fn(params);
    } catch (error) {
      ({ retry } = await requestErrorHandler(error));
    }
  } while (!data && retry);

  return data?.data;
}
