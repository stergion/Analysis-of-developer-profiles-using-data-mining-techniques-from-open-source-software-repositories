/* eslint-disable no-underscore-dangle */
import Bree from "bree";
import Cabin from "cabin";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// import { Signale } from 'signale';

// initialize cabin
// const cabin = new Cabin({
//   axe: {
//     logger: new Signale()
//   }
// });

const bree = new Bree({
  logger: new Cabin(),
  root: path.join(__dirname, "jobs"),
  jobs: [
    {
      name: "updateUsers",
      interval: "15s",
    },
  ],
});

// start all jobs (this is the equivalent of reloading a crontab):
await bree.start();
