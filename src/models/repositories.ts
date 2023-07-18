import { Filter, FindOptions, InferIdType, UpdateOptions, UpdateResult, EnhancedOmit } from "mongodb";
import { getDb } from "../db/conn.js";
import { BaseModel, RepositoryDoc, WithOwnerAndName } from "./models.js";

const db = await getDb();

class RepositoryModel extends BaseModel<RepositoryDoc> {
    constructor() {
        super(db, "repositories");
    }

    getOneId(owner: RepositoryDoc["owner"], name: RepositoryDoc["name"]) {
        return this.collection.findOne(
            { owner, name },
            { projection: { _id: 1 } }
        ) as Promise<{ _id: InferIdType<RepositoryDoc>; } | null>;
    }

    async getNameWithOwner(_id: InferIdType<RepositoryDoc>) {
        const result = await this.collection.findOne(
            { _id },
            {
                projection: {
                    nameWithOwner: {
                        $concat: ["$owner", "/", "$name"],
                    },
                }
            }
        )

        return result?.nameWithOwner;
    }

    upsertMany(docs: RepositoryDoc[], options?: Omit<UpdateOptions, 'upsert'>): Promise<(UpdateResult | undefined)[]> {
        const result = [];

        for (let i = 0; i < docs.length; i++) {
            const { owner, name } = docs[i];
            result.push(this.updateOne(
                { owner, name },
                { $set: docs[i] },
                { ...options, upsert: true }
            ));
        }

        return Promise.all(result);
    }

    findMany(queries: WithOwnerAndName<Partial<RepositoryDoc>>[], options?: FindOptions<RepositoryDoc>) {
        const ownerAndnameArr = queries.map(({ owner, name }) => ({ owner, name }));
        return this.find({ $or: ownerAndnameArr }, options);
    }

    async findManyIds(queries: WithOwnerAndName<Partial<RepositoryDoc>>[], options?: FindOptions<RepositoryDoc>) {
        const ownerAndnameArr = queries.map(({ owner, name }) => ({ owner, name }));
        const repoDocs = await this.find(
            { $or: ownerAndnameArr },
            { projection: { _id: 1 } }
        ).toArray();

        return repoDocs.map(({ _id }) => _id);
    }
}

export default new RepositoryModel();

