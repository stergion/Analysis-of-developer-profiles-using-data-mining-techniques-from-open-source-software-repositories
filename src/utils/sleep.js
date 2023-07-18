/* eslint-disable import/prefer-default-export */
/* eslint-disable no-promise-executor-return */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
