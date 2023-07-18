import winston from "winston";
import process from 'process';

let logLevel;
if (process.env.NODE_ENV === "dev") {
  logLevel = "info";
} else {
  logLevel = "warn";
}

export default {
  default: winston.loggers.add("default-logger", {
    level: logLevel ?? "warn",
    format: winston.format.json(),
    defaultMeta: { service: "user-service", pid: process.pid },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ level: true }),
          winston.format.simple(),
        ),
      }),
    ],
  }),
};
