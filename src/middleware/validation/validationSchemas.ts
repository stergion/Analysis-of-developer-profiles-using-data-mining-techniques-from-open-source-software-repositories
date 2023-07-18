import { Schema, } from "express-validator";
import validator from 'validator';

export const updateContributionsSchema: Schema = {
  updatedAtTimestamp: {
    in: ["body"],
    isInt: { options: { gt: 1_514_764_800_000 } },
    errorMessage: "updatedAtTimestamp should be an integer value representing the number of milliseconds since January 1, 2018, 00:00:00 UTC."
  },
};

export const updateMetricsSchema: Schema = {
  updatedAtTimestamp: {
    in: ["body"],
    isInt: { options: { gt: 1_514_764_800_000 } },
    errorMessage: "updatedAtTimestamp should be an integer value representing the number of milliseconds since January 1, 2018, 00:00:00 UTC."
  },
  forEachRepo: {
    in: ["body"],
    isBoolean: true,
    errorMessage: "forEachRepo: Value should be one of ['true', 'false', '0', '1'].\n\
  ['true', '1']: Create metrics for each repository seperatly,\n\
  ['false', '0']: Create metrics combining all repository data."
  }
};

export const authSchema: Schema = {
  authorization: {
    in: ["headers"],
    exists: {
      errorMessage: "Authorization token required",
    },
    trim: true,
    custom: {
      options: (input, { req, location, path }) => {
        const inputSplited = input.split(" ");

        if (!(inputSplited.length === 2 && inputSplited[0] === "Bearer")) return false;

        return validator.default.isJWT(inputSplited[1]);
      },
      errorMessage: "Invalid authorization token"
    },
  },
};