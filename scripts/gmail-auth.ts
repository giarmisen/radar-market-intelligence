import { config } from "dotenv";
import { createInterface } from "readline";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import {
  GMAIL_READONLY_SCOPE,
  loadGmailCredentials,
  saveRefreshToken,
} from "../lib/ingest/gmail";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

process.env.GMAIL_CREDENTIALS_PATH ??= resolve(
  projectRoot,
  "config/gmail-credentials.json",
);

config({ path: resolve(projectRoot, ".env.local") });

const DEFAULT_ALERT_INBOX = "radarmarket.languageservices@gmail.com";

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolveAnswer) => {
    rl.question(question, (answer) => {
      rl.close();
      resolveAnswer(answer.trim());
    });
  });
}

async function main(): Promise<void> {
  const email = process.env.GMAIL_ALERT_INBOX?.trim() || DEFAULT_ALERT_INBOX;
  const oauthConfig = loadGmailCredentials();
  const oauth2 = new google.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    oauthConfig.redirectUri,
  );

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    scope: [GMAIL_READONLY_SCOPE],
    prompt: "consent",
  });

  console.log(`Authorize Gmail access for ${email}`);
  console.log("\nOpen this URL in your browser:\n");
  console.log(authUrl);
  console.log("");

  const code =
    process.argv[2]?.trim() ||
    (await prompt("Paste the authorization code here: "));

  if (!code) {
    throw new Error("Authorization code is required.");
  }

  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh_token received. Revoke app access in Google Account settings and retry.",
    );
  }

  await saveRefreshToken(email, tokens.refresh_token);
  console.log(`Saved refresh token for ${email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
