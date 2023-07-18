import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import logger from "../utils/logger/logger.js";

const log: typeof logger.default = logger.default;

export async function auth(req: Request, res: Response, next: NextFunction) {
  // verify user is authenticated
  const { authorization } = req.headers;

  // if (!authorization) {
  //   return res.status(401).json({ error: "Authorization token required" });
  // }

  const result = authorization!.split(" ");

  // if (!(result.length === 2 && result[0] === "Bearer")) {
  //   return res.status(401).json({ error: "Invalid authorization token" });
  // }

  const token = result[1];

  try {
    const payload = jwt.verify(token, process.env.APP_SECRET as string) as { _id: string; };

    log.info(`User ${payload._id} logged in.`);
    next();

  } catch (error) {
    log.error(error);
    res.status(401).json({ error: "Request is not authorized" });
  }
};
