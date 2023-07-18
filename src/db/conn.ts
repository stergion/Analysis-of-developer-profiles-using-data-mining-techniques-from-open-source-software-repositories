import { MongoClient, AuthMechanism, Db } from "mongodb";
import logger from "../utils/logger/logger.js";

const log: typeof logger.default = logger.default;

let uri;
const dbName = process.env.DB_NAME as string;

// Replace the following with values for your environment.
if (process.env.NODE_ENV === "dev") {
  log.warn("DB: Running on development DB");

  const username = encodeURIComponent(process.env.DB_USERNAME as string);
  const clusterUrl = process.env.DB_CLUSTER_URL as string;
  const clientPEMFile = encodeURIComponent(process.env.DB_X509_CERT_PATH as string);
  const authMechanism = AuthMechanism.MONGODB_X509;

  uri = `mongodb+srv://${username}@${clusterUrl}/?authMechanism=${authMechanism}&tls=true&tlsCertificateKeyFile=${clientPEMFile}`;
} else if (process.env.NODE_ENV === "production") {
  log.warn("DB: Running on production DB");

  const username = encodeURIComponent(process.env.DB_USER as string);
  const password = encodeURIComponent(process.env.DB_PASS as string);
  const clusterUrl = process.env.DB_CLUSTER_URL as string;
  const authMechanism = "DEFAULT";

  uri = `mongodb+srv://${username}:${password}@${clusterUrl}/?authMechanism=${authMechanism}`;
} else {
  throw new Error("Incorrect node environment");
}

// Create a new MongoClient
const client: MongoClient = new MongoClient(uri);
let db: Db;

export async function connectToDatabase() {
  if (db) return db;

  await client.connect();

  db = client.db(dbName);

  await db.command({ ping: 1 });

  log.info(`Successfully connected to database: ${db.databaseName}.`);

  return db;
}

export function getDb() {
  return connectToDatabase();
}

export function startSession() {
  return client.startSession();
}

export function close() {
  client.close();
}

export default { connectToDatabase, getDb };
