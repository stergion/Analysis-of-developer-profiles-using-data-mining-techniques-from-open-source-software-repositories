import { WithId } from "mongodb";
import { getDb } from "../db/conn.js";
import { UserMetaDoc } from "./models.js";
import { BaseModel } from "./models.js";

const db = await getDb();

class UserMetaModel extends BaseModel<UserMetaDoc> {
    installationIds?: number[];
    idIndex = 0;
    constructor() {
        super(db, "usersMeta");
    }

    async getInstallationIds() {
        const agg = [
            {
                '$match': {
                    'installation.status': 'active'
                }
            }, {
                '$project': {
                    'app_id': '$installation.id'
                }
            }
        ];
        const cursor = this.collection.aggregate(agg);
        return (await cursor.toArray()).map(doc => doc.app_id) as number[];
    }
    
    async getInstallationId2() {
        if (!this.installationIds) this.installationIds = await this.getInstallationIds();
        this.idIndex = (this.idIndex + 1) % this.installationIds.length;
        return this.installationIds[this.idIndex];
    }

    getInstallationId(login: UserMetaDoc["login"]) {
        return this.findOne(
            { login: `${login}` },
            { projection: { installationId: 1 } }
        ) as Promise<{ installationId: UserMetaDoc["installationId"]; } | null>;
    }
    getUpdatedAt(login: UserMetaDoc["login"]) {
        return this.findOne(
            { login: `${login}` },
            { projection: { updatedAt: 1 } }
        ) as Promise<{ installationId: UserMetaDoc["updatedAt"]; } | null>;
    }
}

export default new UserMetaModel();
export { UserMetaDoc };