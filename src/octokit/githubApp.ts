import "dotenv/config";
import { App, createNodeMiddleware, Octokit } from "octokit";
import { throttling } from "@octokit/plugin-throttling";
import { retry } from "@octokit/plugin-retry";
import { paginateGraphql } from "@octokit/plugin-paginate-graphql";
import { requestLog } from "@octokit/plugin-request-log";

import { createUser, deleteUser } from "../controllers/installationController.js";
import usersMeta, { UserMetaDoc } from "../models/usersMeta.js";
import logger from "../utils/logger/logger.js";

const log = logger.default;


function onRateLimit(retryAfter: number, options: any, octokit: Octokit) {
  octokit.log.warn(
    `Throttle: Request quota exhausted for request ${options.method} ${options.url}`
  );

  if (options.request.retryCount < 20) {
    // retries 20 times
    octokit.log.info(`Retrying after ${retryAfter} seconds! (retryCount: ${options.request.retryCount})`);
    return true;
  }
};

function onSecondaryRateLimit(retryAfter: number, options: any, octokit: Octokit) {
  octokit.log.warn(
    `Throttle: SecondaryRateLimit detected for request ${options.method} ${options.url}`
  );

  octokit.log.info(`Retrying after ${retryAfter} seconds! (retryCount: ${options.request.retryCount})`);
  return true;
}

let OctokitWithThrottling = Octokit
  .plugin(
    paginateGraphql,
    throttling,
    retry,
    requestLog
  )
  .defaults({
    throttle: {
      onRateLimit,
      onSecondaryRateLimit,
    },
    request: {
      retries: 10,
      retryAfter: 1
    },
  });

const githubApp = new App({
  Octokit: OctokitWithThrottling,
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/gm, "\n"),
  webhooks: {
    secret: process.env.GITHUB_WEBHOOK_SECRET!,
  },
  oauth: { clientId: null!, clientSecret: null! },
  log: {
    warn: log.warn.bind(log),
    info: log.info.bind(log),
    error: log.error.bind(log),
    debug: log.debug.bind(log),
  }
});

const { webhooks } = githubApp;

webhooks.on("installation.created", ({ octokit, name, payload }) => {
  const { installation: { id, account: { login } } } = payload;

  // todo: controller.createInstallatom
  // todo: controller.createUser
  const doc: UserMetaDoc = {
    login,
    updatedAt: null,
    installation: {
      id,
      status: "active",
      createdAt: new Date(),
    },
    contributions: {
      updatedAt: null
    },
    metrics: {
      updatedAt: null
    }
  };

  usersMeta.insertOne(doc);
  createUser(octokit, login);
});

webhooks.on("installation.suspend", ({ octokit, name, payload }) => {
  const { installation: { id, account: { login } } } = payload;

  // todo: controller.suspendInstallation
  usersMeta.updateOne({ login, installation: { id } }, { installation: { status: "suspended", updatedAt: new Date() } });
});

webhooks.on("installation.unsuspend", ({ octokit, name, payload }) => {
  const { installation: { id, account: { login } } } = payload;

  // todo: controller.unsuspendInstallation
  usersMeta.updateOne({ login, installation: { id } }, { installation: { status: "active", updatedAt: new Date() } });
});

webhooks.on("installation.deleted", ({ octokit, name, payload }) => {
  const { installation: { id, account: { login } } } = payload;

  // todo: controller.deleteInstallation
  // todo: controller.deleteUser
  usersMeta.updateOne({ login, installation: { id } }, { installation: { id: null, status: "deleted", updatedAt: new Date() } });
  deleteUser(login);
});

export { githubApp, createNodeMiddleware };
