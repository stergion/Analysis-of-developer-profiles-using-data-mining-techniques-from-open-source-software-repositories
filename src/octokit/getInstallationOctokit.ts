import usersMeta, { UserMetaDoc } from "../models/usersMeta.js";
import logger from "../utils/logger/logger.js";
import { githubApp } from "./githubApp.js";
import { GetResponseTypeFromEndpointMethod, GetResponseDataTypeFromEndpointMethod } from "@octokit/types";
import { Octokit } from "octokit";


const defaultInstallationId = 26214620;
const log = logger.default;

export default async function getInstallationOctokit(login: UserMetaDoc["login"]): Promise<Octokit>;
export default async function getInstallationOctokit(installationId: UserMetaDoc["installationId"]): Promise<Octokit>;
export default async function getInstallationOctokit(
    loginOrInstallationId: UserMetaDoc["login"] | UserMetaDoc["installationId"]
): Promise<Octokit> {
    let installationId: undefined | number;
    switch (typeof loginOrInstallationId) {
        case "string":
            const result = await usersMeta.getInstallationId(loginOrInstallationId);
            installationId = result?.installationId ?? defaultInstallationId;

        case "number":
            // if installationId is undefined then loginOrInstallationId is not a string.
            // sto loginOrInstallationId is a number.
            // if installationId is defined then it is a number and loginOrInstallationId is a string
            installationId = (installationId ?? loginOrInstallationId) as number;
            break;

        default:
            // loginOrInstallationId is neither a string nor a number
            // throw error
            throw new Error("Argument of function getInstallationOctokit is neither type of string nor number.");

            break;
    }

    if (installationId === defaultInstallationId) log.warn(`User ${loginOrInstallationId} has NOT installed the app. Returning with default Octokit installation.`);

    return githubApp.getInstallationOctokit(installationId);
}