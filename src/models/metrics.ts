import { InferIdType, ObjectId } from "mongodb";
import { getDb } from "../db/conn.js";
import { MetricDoc } from "./models.js";
import { BaseModel } from "./models.js";

const db = await getDb();

class Metrics extends BaseModel<MetricDoc> {
    constructor() {
        super(db, "metrics");
    }

}

export default new Metrics();
