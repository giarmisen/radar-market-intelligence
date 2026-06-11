import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { google, gmail_v1 } from "googleapis";
import { getSupabase } from "../supabase";
import type { IngestRawItem } from "../types";

const DEFAULT_LOOKBACK_DAYS = 7;
const DEFAULT_MAX_MESSAGES = 50;
const DEFAULT_ALERT_INBOX = "radarmarket.languageservices@gmail.com";
const GOOGLE_ALERTS_SENDER = "googlealerts-noreply@google.com";

export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

const ANCHOR_RE = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

interface GmailCredentialBlock {
  client_id: string;
  client_secret: string;
  redirect_uris?: string[];
}

interface GmailCredentialsFile {
  installed?: GmailCredentialBlock;
  web?: GmailCredentialBlock;
}

export interface GmailIngestParams {
  sourceId: string;
  email?: string;
  sinceDate?: string;
  maxMessages?: number;
}

export interface GmailOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function credentialsPath(): string {
  const explicit = process.env.GMAIL_CREDENTIALS_PATH?.trim();
  if (explicit) {
    return explicit;
  }

  const fromCwd = resolve(process.cwd(), "config/gmail-credentials.json");
  if (existsSync(fromCwd)) {
    return fromCwd;
  }

  return resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../config/gmail-credentials.json",
  );
}

function defaultSinceDate(lookbackDays = DEFAULT_LOOKBACK_DAYS): string {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - lookbackDays);
  return since.toISOString().slice(0, 10);
}

function toGmailAfterDate(isoDate: string): string {
  return isoDate.replace(/-/g, "/");
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function loadGmailCredentials(): GmailOAuthConfig {
  let raw: string;
  try {
    raw = readFileSync(credentialsPath(), "utf8");
  } catch {
    throw new Error(
      `Gmail credentials not found at ${credentialsPath()}. Copy config/gmail-credentials.json.example and fill in OAuth client details.`,
    );
  }

  const parsed = JSON.parse(raw) as GmailCredentialsFile;
  const block = parsed.installed ?? parsed.web;
  if (!block?.client_id || !block?.client_secret) {
    throw new Error(
      "Invalid Gmail credentials file: expected installed or web OAuth client with client_id and client_secret.",
    );
  }

  const redirectUri =
    block.redirect_uris?.[0] ?? "http://localhost:3000/oauth2callback";

  return {
    clientId: block.client_id,
    clientSecret: block.client_secret,
    redirectUri,
  };
}

export async function loadRefreshToken(email: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("gmail_tokens")
    .select("refresh_token")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Gmail refresh token: ${error.message}`);
  }

  return data?.refresh_token ?? null;
}

export async function saveRefreshToken(
  email: string,
  refreshToken: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("gmail_tokens").upsert(
    {
      email,
      refresh_token: refreshToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );

  if (error) {
    throw new Error(`Failed to save Gmail refresh token: ${error.message}`);
  }
}

const ALERTS_INTERNAL_MARKERS = [
  "/alerts/feedback",
  "/alerts/edit",
  "/alerts/remove",
  "/alerts?source=",
  "/alerts?s=",
  "#history",
  "ffu=",
] as const;

function isGoogleHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "google.com" || host.endsWith(".google.com");
}

function isAlertsInternalHref(href: string): boolean {
  const lower = href.toLowerCase();
  return ALERTS_INTERNAL_MARKERS.some((marker) => lower.includes(marker));
}

/** Pre-enrichment gate: only external news/content URLs, never Google-owned hosts. */
export function isArticleUrl(url: string): boolean {
  if (!url.trim() || isAlertsInternalHref(url)) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (isGoogleHost(parsed.hostname)) {
    return false;
  }

  const lower = url.toLowerCase();
  if (lower.includes("unsubscribe")) return false;
  if (lower.includes("facebook.com/sharer")) return false;
  if (lower.includes("twitter.com/intent")) return false;
  if (lower.includes("linkedin.com/share")) return false;

  return true;
}

function normalizeAlertUrl(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("mailto:")) {
    return null;
  }
  if (isAlertsInternalHref(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (isGoogleHost(url.hostname) && url.pathname === "/url") {
      const target = url.searchParams.get("url") ?? url.searchParams.get("q");
      if (!target || isAlertsInternalHref(target)) {
        return null;
      }
      const unwrapped = decodeURIComponent(target).trim();
      if (!unwrapped || !isArticleUrl(unwrapped)) {
        return null;
      }
      return new URL(unwrapped).toString();
    }

    if (!isArticleUrl(url.toString())) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export interface ParsedAlertLink {
  title: string;
  url: string;
}

export function parseGoogleAlertHtml(html: string): ParsedAlertLink[] {
  const links: ParsedAlertLink[] = [];
  const seenUrls = new Set<string>();

  let match: RegExpExecArray | null;
  ANCHOR_RE.lastIndex = 0;
  while ((match = ANCHOR_RE.exec(html)) !== null) {
    const href = match[1];
    const title = stripHtml(match[2]);
    const url = normalizeAlertUrl(href);

    if (!url || !title || title.length < 3) {
      continue;
    }
    if (!isArticleUrl(url)) {
      continue;
    }
    if (seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    links.push({ title, url });
  }

  return links;
}

function extractHtmlBody(part: gmail_v1.Schema$MessagePart | undefined): string {
  if (!part) {
    return "";
  }

  if (part.mimeType === "text/html" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }

  for (const child of part.parts ?? []) {
    const html = extractHtmlBody(child);
    if (html) {
      return html;
    }
  }

  return "";
}

function messageEventDate(message: gmail_v1.Schema$Message): string {
  const internal = message.internalDate;
  if (internal) {
    const parsed = new Date(Number(internal));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  const headerDate = message.payload?.headers?.find(
    (header) => header.name?.toLowerCase() === "date",
  )?.value;
  if (headerDate) {
    const parsed = new Date(headerDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  return new Date().toISOString().slice(0, 10);
}

function messageSubject(message: gmail_v1.Schema$Message): string {
  return (
    message.payload?.headers
      ?.find((header) => header.name?.toLowerCase() === "subject")
      ?.value?.trim() ?? "Google Alert"
  );
}

async function createGmailClient(email: string): Promise<gmail_v1.Gmail> {
  const oauthConfig = loadGmailCredentials();
  const oauth2 = new google.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    oauthConfig.redirectUri,
  );

  const refreshToken = await loadRefreshToken(email);
  if (!refreshToken) {
    throw new Error(
      `No Gmail refresh token for ${email}. Run: npx tsx scripts/gmail-auth.ts`,
    );
  }

  oauth2.setCredentials({ refresh_token: refreshToken });
  oauth2.on("tokens", (tokens) => {
    if (tokens.refresh_token) {
      void saveRefreshToken(email, tokens.refresh_token);
    }
  });

  return google.gmail({ version: "v1", auth: oauth2 });
}

/**
 * Reads Google Alert emails via Gmail API and extracts article links.
 */
export async function ingestGmail(
  params: GmailIngestParams,
): Promise<IngestRawItem[]> {
  const email = params.email?.trim() || DEFAULT_ALERT_INBOX;
  const sinceDate = params.sinceDate ?? defaultSinceDate();
  const maxMessages = params.maxMessages ?? DEFAULT_MAX_MESSAGES;
  const gmail = await createGmailClient(email);

  const query = `from:${GOOGLE_ALERTS_SENDER} after:${toGmailAfterDate(sinceDate)}`;
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: maxMessages,
  });

  const messageIds =
    listResponse.data.messages
      ?.map((message) => message.id)
      .filter((id): id is string => Boolean(id)) ?? [];

  const items: IngestRawItem[] = [];
  const seenUrls = new Set<string>();

  for (const messageId of messageIds) {
    const { data: message } = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const eventDate = messageEventDate(message);
    if (eventDate < sinceDate) {
      continue;
    }

    const html = extractHtmlBody(message.payload);
    if (!html) {
      continue;
    }

    const subject = messageSubject(message);
    const links = parseGoogleAlertHtml(html);

    for (const link of links) {
      if (!isArticleUrl(link.url) || seenUrls.has(link.url)) {
        continue;
      }

      seenUrls.add(link.url);
      items.push({
        title: link.title,
        url: link.url,
        raw_content: `${subject}\n\n${link.title}`.trim(),
        source_id: params.sourceId,
        event_date: eventDate,
      });
    }
  }

  return items;
}
