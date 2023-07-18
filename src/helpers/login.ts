import "dotenv/config";
import fetch from "node-fetch";

interface LoginCredendials {
  username: string;
  password: string;
}

export const login = async (loginURL: string, credentials: LoginCredendials) => {
  const response = await fetch(loginURL, {
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    method: "POST",
    body: JSON.stringify({
      username: credentials.username,
      password: credentials.password
    }),
  });

  const { token } = await response.json() as { token: string; };

  return token;
};
