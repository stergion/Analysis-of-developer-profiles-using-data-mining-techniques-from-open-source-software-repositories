import express, { Request, Response } from "express";
import { updateUser } from "../controllers/installationController.js";
import { computeUserMetrics } from "../controllers/metricsController.js";
import { validateUpdateContributions, validateUpdateMetrics } from "../middleware/validation/validator.js";
import db from "../models/index.js";
import getInstallationOctokit from "../octokit/getInstallationOctokit.js";
import logger from "../utils/logger/logger.js";

const log = logger.default;

const router = express.Router();


router.route("/test")
    .post((req: Request, res: Response) => {
        res.end("Success!!!");
    });

router.route("/contributions/update")
    .post(
        //   @ts-ignore
        validateUpdateContributions,
        async (req: Request, res: Response) => {
            const { updatedAtTimestamp } = req.body;

            const updatedAt: Date = new Date(parseInt(updatedAtTimestamp));
            // console.log(updatedAt);

            // 1. find users to update
            const cursor = db.users.find({ updatedAt: { $lt: updatedAt } }, {
                projection: {
                    _id: 0, login: 1,
                }
            });

            // 2. update users' contributions
            try {
                const promises = [];
                for await (const { login } of cursor) {
                    promises.push(updateUser(
                        await getInstallationOctokit(login),
                        login,
                    ));
                }
                await Promise.all(promises);
            } catch (error) {
                log.error(JSON.stringify(error));
            } finally {
                await cursor.close();
            }

            res.end();
        });

router.route("/metrics/update")
    .post(
        // @ts-ignore 
        validateUpdateMetrics,
        async (req: Request, res: Response) => {
            const { updatedAtTimestamp, forEachRepo } = req.body;

            const updatedAt: Date = new Date(parseInt(updatedAtTimestamp));
            const withRepos = forEachRepo ? { repositories: 1 } : {};
            
            // 1. find users to update
            const cursor = db.users.find({ updatedAt: { $lt: updatedAt } }, {
                projection: {
                    login: 1, ...withRepos
                }
            });

            // 2. update users' metrics
            try {
                for await (const { _id, login, repositories } of cursor) {
                    console.log(login);

                    computeUserMetrics(_id, repositories);
                }
            } catch (error) {
                // log.error(JSON.stringify(error));
                console.log(error);

            } finally {
                await cursor.close();
            }

            res.end();
        });


router.route("/users/installed")
        .get(
            async (req: Request, res: Response) => {
                const users_installed = await db.users.find({}, {
                    projection: {
                        _id: 0,
                        login: 1
                    }
                }).toArray()

                res.send(users_installed)
            }
        )

router.route("/users/update/all");


export default router;
