import "dotenv/config";
import { check } from "express-validator";
import { LEGAL_TCP_SOCKET_OPTIONS } from "mongodb";
import fetch, { Response } from 'node-fetch';
import { checkHttpStatus, HTTPResponseError } from "../helpers/checkHttpStatus.js";
import { login } from "../helpers/login.js";

let domainName: string;

if (process.env.NODE_ENV === "dev") {
    const PORT = process.env.PORT;
    domainName = `http://localhost:${PORT}`;
} else {
    domainName = process.env.DOMAIN_NAME as string;
}

const updatedAt = new Date();
updatedAt.setUTCDate(updatedAt.getUTCDate() - 15);

try {
    const token = await login(`${domainName}/login`, {
        username: process.env.APP_USERNAME as string,
        password: process.env.APP_PASS as string
    });

    const body = {
        updatedAtTimestamp: updatedAt.valueOf()
    };

    const response = await fetch(`${domainName}/api/contributions/update/`, {
        method: 'POST',
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body),
    });

    checkHttpStatus(response);

    // const data = await response.json();

    // console.log(data);
} catch (error) {
    if (error instanceof HTTPResponseError) {
        console.log(await error.response.json());
    }
    console.log(error);
}
