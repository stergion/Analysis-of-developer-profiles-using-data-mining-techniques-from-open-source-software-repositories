import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";

import db from "../models/index.js";
import { computeUserMetrics } from "../controllers/metricsController.js";
import fetch from "node-fetch";
import { model_service_url } from "../serverconfig.json";

const router = express.Router();


router.route("/login")
  .post(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!(username && password)) {
      res.status(400).send("All inputs are required");
    }

    if (!(username === process.env.APP_USERNAME && password === process.env.APP_PASS)) {
      res.status(400).send("Invalid Credentials");
    }

    const token = jwt.sign(
      { _id: "admin" },
      process.env.APP_SECRET as string,
      {
        expiresIn: "30m",
      }
    );

    res.status(200).json({ token });
  });


router.route("/users/:login/metrics")
  .get(async (req: Request, res: Response) => {
    const login = req.params.login;
    const perReposotory = req.query.perReposotory === "true";
    const user = await db.users.getOneId(login, perReposotory);
    let metrics;

    if (!user) {
      return res.status(404).end("User not found.");
    }

    if ("repositories" in user) {
      metrics = await computeUserMetrics(user._id, user.repositories);
    }
    else {
      metrics = await computeUserMetrics(user._id);
    }

    res.send(metrics);
  });


router.route("/users/:login/role")
  .get(async (req: Request, res: Response) => {
    const login = req.params.login;
    const perReposotory = req.query.perReposotory === "true";
    const user = await db.users.getOneId(login, perReposotory);
    let metrics;

    if (!user) {
      return res.status(404).end("User not found.");
    }

    if ("repositories" in user) {
      metrics = await computeUserMetrics(user._id, user.repositories);
    }
    else {
      metrics = await computeUserMetrics(user._id);
    }

    const response = await fetch(model_service_url, {
      method: 'post',
      body: JSON.stringify(metrics),
      headers: { 'Content-Type': 'application/json' }
    });
    const roles = await response.json();

    res.send(roles);
  });
// .get()


export default router;
