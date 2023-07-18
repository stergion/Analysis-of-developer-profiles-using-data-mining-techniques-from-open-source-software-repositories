import "dotenv/config";

import express from "express";
import helmet from "helmet";

import { connectToDatabase } from "./db/conn.js";
import { createNodeMiddleware, githubApp } from "./octokit/githubApp.js";
import publicRouter from "./routes/publicRouter.js";
import apiRouter from "./routes/apiRouter.js";
import logger from "./utils/logger/logger.js";
import { auth } from "./middleware/auth.js";
import { validateAuth } from "./middleware/validation/validator.js";

// async function getOctokitMiddleware(app: App) {
//   let middleware = null;

//   do {
//     try {
//       for await (const { octokit } of app.eachRepository.iterator()) {
//         middleware = (req: Request, res: Response, next: NextFunction) => {
//           req.octokit = octokit;
//           next();
//         };
//       }
//     } catch (error) {
//       await requestErrorHandler(error);
//     }
//   } while (!middleware);

//   return middleware;
// }

const log = logger.default;

const { PORT } = process.env || 5000;

const app = express();

app.use(
  helmet({
    expectCt: false,
  })
);
app.use(express.json());

app.use(createNodeMiddleware(githubApp));
// app.use("/", await getOctokitMiddleware(githubApp));
app.use("/", publicRouter);
// @ts-ignore
app.use("/api", validateAuth, auth, apiRouter);

app.listen(PORT, async () => {
  await connectToDatabase();

  log.info(`Server is running on port: ${PORT}`);
});
