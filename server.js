import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { loadEnvironment } from "./lib/env.js";
import { emptyIntegrations, ensureDataDirectory, projectRoot, readCrm, readIntegrations, writeCrm, writeIntegrations } from "./lib/storage.js";
import { sendGmail, validateEmailAddress } from "./lib/smtp.js";

await loadEnvironment();

const adminPassword = process.env.APP_ADMIN_PASSWORD ?? "";
if (adminPassword.length < 16) throw new Error("APP_ADMIN_PASSWORD must be at least 16 characters. Run npm run setup.");
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "127.0.0.1";
const sessions = new Map();
const loginAttempts = new Map();
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
await readCrm();
await ensureDataDirectory();

function sha256(value) { return createHash("sha256").update(value).digest(); }
function sameSecret(left, right) { return timingSafeEqual(sha256(left), sha256(right)); }
function cookieValue(request, name) {
  const pair = (request.headers.cookie ?? "").split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : "";
}
function getSession(request) {
  const id = cookieValue(request, "sophia_session");
  const entry = sessions.get(id);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) { sessions.delete(id); return null; }
  return { id, ...entry };
}
function setSessionCookie(request, response, id, maxAge) {
  const secure = request.socket.encrypted || (process.env.TRUST_PROXY === "1" && request.headers["x-forwarded-proto"] === "https");
  response.setHeader("Set-Cookie", `sophia_session=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}; Max-Age=${maxAge}`);
}
function json(response, status, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders });
  response.end(body);
}
function publicSettings(value) {
  return {
    aiProvider: value.aiProvider,
    aiConfigured: Boolean(value.aiKeys?.[value.aiProvider]),
    openaiConfigured: Boolean(value.aiKeys?.openai),
    geminiConfigured: Boolean(value.aiKeys?.gemini),
    senderEmail: value.email?.senderEmail ?? "",
    smtpUsername: value.email?.smtpUsername ?? "",
    emailConfigured: Boolean(value.email?.senderEmail && value.email?.smtpUsername && value.email?.smtpPassword),
    calendarWebhookUrl: value.calendarWebhookUrl ?? "",
    calendarConfigured: Boolean(value.calendarWebhookUrl)
  };
}
function setHeaders(response, request) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (request.socket.encrypted || (process.env.TRUST_PROXY === "1" && request.headers["x-forwarded-proto"] === "https")) response.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
}
function isSameOrigin(request) {
  const origin = request.headers.origin;
  const hostHeader = request.headers.host;
  if (!origin || !hostHeader) return false;
  let scheme = request.socket.encrypted ? "https" : "http";
  if (process.env.TRUST_PROXY === "1" && request.headers["x-forwarded-proto"] === "https") scheme = "https";
  try { return new URL(origin).origin === `${scheme}://${hostHeader}`; } catch { return false; }
}
async function readJson(request, limit = 100_000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("Request is too large."), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("Request body must be valid JSON."), { status: 400 }); }
}
function sessionRequired(request, response) {
  const session = getSession(request);
  if (!session) { json(response, 401, { error: "Please sign in again." }); return null; }
  return session;
}
function csrfRequired(request, response, session) {
  if (!isSameOrigin(request) || request.headers["x-csrf-token"] !== session.csrf) {
    json(response, 403, { error: "Request verification failed. Refresh and try again." });
    return false;
  }
  return true;
}
function cleanText(value, limit = 180) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, limit);
}
function email(value) {
  try { return validateEmailAddress(value); } catch { throw Object.assign(new Error("Enter a valid email address."), { status: 400 }); }
}
function leadPayload(body, existing = {}) {
  const name = cleanText(body.name ?? existing.name, 120);
  const company = cleanText(body.company ?? existing.company, 140);
  const emailAddress = email(body.email ?? existing.email);
  const value = Number(body.value ?? existing.value ?? 0);
  const score = Number(body.score ?? existing.score ?? 50);
  if (!name || !company) throw Object.assign(new Error("Lead name and company are required."), { status: 400 });
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000) throw Object.assign(new Error("Deal value must be between 0 and 1,000,000,000."), { status: 400 });
  if (!Number.isInteger(score) || score < 0 || score > 100) throw Object.assign(new Error("Lead score must be between 0 and 100."), { status: 400 });
  const allowedStatuses = new Set(["New", "Contacted", "Qualified", "Active Database", "Proposal"]);
  const candidateStatus = cleanText(body.status ?? existing.status ?? "New", 32);
  if (!allowedStatuses.has(candidateStatus)) throw Object.assign(new Error("Choose a valid lead status."), { status: 400 });
  return {
    ...existing,
    sample: Boolean(existing.sample && emailAddress.toLowerCase().endsWith(".test")),
    name,
    company,
    email: emailAddress,
    phone: cleanText(body.phone ?? existing.phone, 64),
    role: cleanText(body.role ?? existing.role, 120),
    source: cleanText(body.source ?? existing.source ?? "Manually added", 80),
    status: candidateStatus,
    score,
    value: Math.round(value),
    campaignId: cleanText(body.campaignId ?? existing.campaignId, 100),
    updatedAt: new Date().toISOString()
  };
}
function campaignPayload(body, existing = {}) {
  const name = cleanText(body.name ?? existing.name, 120);
  if (!name) throw Object.assign(new Error("Campaign name is required."), { status: 400 });
  const status = body.status ?? existing.status ?? "active";
  if (!["active", "paused"].includes(status)) throw Object.assign(new Error("Choose a valid campaign status."), { status: 400 });
  return { ...existing, name, channel: cleanText(body.channel ?? existing.channel ?? "Email", 80), audience: cleanText(body.audience ?? existing.audience ?? "New prospects", 100), status, updatedAt: new Date().toISOString() };
}
function providerError(response, body) {
  if (response.status === 401 || response.status === 403) return "The provider rejected this API key. Check the key and permissions in Settings.";
  if (response.status === 429) return "The AI provider rate limit was reached. Wait a moment and try again.";
  const message = typeof body?.error?.message === "string" ? body.error.message.slice(0, 220) : `provider request failed (${response.status})`;
  return `AI request failed: ${message}`;
}
async function callAi(settings, prompt) {
  const provider = settings.aiProvider;
  const key = settings.aiKeys?.[provider];
  if (!key) throw Object.assign(new Error(`Add a ${provider === "openai" ? "OpenAI" : "Gemini"} API key in Settings to use Sophia AI.`), { status: 409 });
  const controller = AbortSignal.timeout(30_000);
  let upstream;
  if (provider === "openai") {
    upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", signal: controller,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-6-luna", input: prompt, max_output_tokens: 420 })
    });
  } else {
    const model = "gemini-3.5-flash-lite";
    upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST", signal: controller,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 420, temperature: 0.6 } })
    });
  }
  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw Object.assign(new Error(providerError(upstream, result)), { status: upstream.status === 429 ? 429 : 502 });
  const text = provider === "openai"
    ? (result.output_text ?? result.output?.flatMap(item => item.content ?? []).find(item => item.type === "output_text")?.text)
    : result.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("");
  if (!text?.trim()) throw Object.assign(new Error("Sophia received an empty response. Try again."), { status: 502 });
  return text.trim();
}
function ipv4IsPublic(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4) return false;
  const [a, b] = parts;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)));
}
function ipv6IsPublic(address) {
  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice(7);
    if (mapped.includes(".")) return ipv4IsPublic(mapped);
    const halves = mapped.split(":");
    if (halves.length === 2 && halves.every(part => /^[0-9a-f]{1,4}$/.test(part))) {
      const high = Number.parseInt(halves[0], 16);
      const low = Number.parseInt(halves[1], 16);
      return ipv4IsPublic(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
    return false;
  }
  return !(normalized === "::" || normalized === "::1" || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("ff") || normalized.startsWith("::ffff:127.") || normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168."));
}
async function publicHttpsUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw Object.assign(new Error("Enter a complete HTTPS webhook URL."), { status: 400 }); }
  if (url.protocol !== "https:" || (url.port && url.port !== "443") || url.username || url.password || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal") || url.hostname === "localhost") {
    throw Object.assign(new Error("Use a public HTTPS webhook URL."), { status: 400 });
  }
  const version = isIP(url.hostname);
  let addresses;
  if (version) {
    const publicAddress = version === 4 ? ipv4IsPublic(url.hostname) : ipv6IsPublic(url.hostname);
    if (!publicAddress) throw Object.assign(new Error("Webhook URLs cannot target a private or local network."), { status: 400 });
    addresses = [{ address: url.hostname, family: version }];
  } else {
    try {
      addresses = await lookup(url.hostname, { all: true, verbatim: true });
      if (!addresses.length || addresses.some(answer => answer.family === 4 ? !ipv4IsPublic(answer.address) : !ipv6IsPublic(answer.address))) {
        throw new Error("private address");
      }
    } catch {
      throw Object.assign(new Error("Webhook host must resolve to a public IP address."), { status: 400 });
    }
  }
  return { url, addresses };
}
async function sendWebhook(rawUrl, payload) {
  const { url, addresses } = await publicHttpsUrl(rawUrl);
  const address = addresses.find(answer => answer.family === 4) ?? addresses[0];
  const body = JSON.stringify(payload);
  const response = await new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: "POST", servername: isIP(url.hostname) ? undefined : url.hostname,
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "User-Agent": "Sophia-Omnix/1.0" },
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family)
    }, incoming => {
      let responseSize = 0;
      incoming.on("data", chunk => { responseSize += chunk.length; if (responseSize > 20_000) request.destroy(new Error("Booking endpoint response was too large.")); });
      incoming.on("end", () => resolve({ statusCode: incoming.statusCode ?? 0 }));
      incoming.on("error", reject);
    });
    request.setTimeout(15_000, () => request.destroy(new Error("Booking endpoint timed out.")));
    request.on("error", reject);
    request.end(body);
  });
  if (response.statusCode < 200 || response.statusCode >= 300) throw Object.assign(new Error(`Booking endpoint returned HTTP ${response.statusCode}.`), { status: 502 });
}
function handleError(response, error) {
  if (response.headersSent) { response.destroy(); return; }
  const status = error.status ?? 500;
  if (status >= 500) console.error(`${new Date().toISOString()} ${error.name}: ${error.message}`);
  json(response, status, { error: status >= 500 && status !== 502 ? "The server could not complete that request." : error.message });
}

async function handleApi(request, response, url) {
  const route = url.pathname;
  if (route === "/api/health" && request.method === "GET") return json(response, 200, { ok: true });
  if (route === "/api/login" && request.method === "POST") {
    if (!isSameOrigin(request)) return json(response, 403, { error: "Sign-in request verification failed." });
    const client = request.socket.remoteAddress ?? "unknown";
    const attempt = loginAttempts.get(client) ?? { count: 0, firstAt: Date.now() };
    if (Date.now() - attempt.firstAt > 10 * 60_000) { attempt.count = 0; attempt.firstAt = Date.now(); }
    if (attempt.count >= 8) return json(response, 429, { error: "Too many sign-in attempts. Wait ten minutes and try again." });
    const body = await readJson(request, 5_000);
    attempt.count += 1;
    loginAttempts.set(client, attempt);
    if (typeof body.password !== "string" || !sameSecret(body.password, adminPassword)) return json(response, 401, { error: "That admin password did not match." });
    loginAttempts.delete(client);
    const id = randomBytes(32).toString("base64url");
    const csrf = randomBytes(32).toString("base64url");
    sessions.set(id, { csrf, expiresAt: Date.now() + 8 * 60 * 60_000 });
    setSessionCookie(request, response, id, 8 * 60 * 60);
    const integrations = await readIntegrations();
    return json(response, 200, { authenticated: true, csrf, integrations: publicSettings(integrations) });
  }
  if (route === "/api/session" && request.method === "GET") {
    const session = getSession(request);
    if (!session) return json(response, 200, { authenticated: false });
    const integrations = await readIntegrations();
    return json(response, 200, { authenticated: true, csrf: session.csrf, integrations: publicSettings(integrations) });
  }
  const session = sessionRequired(request, response);
  if (!session) return;
  if (request.method !== "GET" && !csrfRequired(request, response, session)) return;

  if (route === "/api/logout" && request.method === "POST") {
    sessions.delete(session.id);
    setSessionCookie(request, response, "", 0);
    return json(response, 200, { ok: true });
  }
  if (route === "/api/crm" && request.method === "GET") return json(response, 200, await readCrm());
  if (route === "/api/settings" && request.method === "GET") return json(response, 200, publicSettings(await readIntegrations()));

  if (route === "/api/settings" && request.method === "PUT") {
    const body = await readJson(request, 20_000);
    const settings = await readIntegrations();
    if (body.aiProvider !== undefined) {
      if (!["gemini", "openai"].includes(body.aiProvider)) throw Object.assign(new Error("Choose Gemini or OpenAI."), { status: 400 });
      settings.aiProvider = body.aiProvider;
    }
    for (const provider of ["gemini", "openai"]) if (Object.hasOwn(body, `${provider}ApiKey`)) {
      const value = String(body[`${provider}ApiKey`] ?? "").trim();
      if (value) settings.aiKeys[provider] = value.slice(0, 500);
      if (body[`clear${provider[0].toUpperCase()}${provider.slice(1)}ApiKey`] === true) settings.aiKeys[provider] = "";
    }
    if (Object.hasOwn(body, "senderEmail")) settings.email.senderEmail = body.senderEmail ? email(body.senderEmail) : "";
    if (Object.hasOwn(body, "smtpUsername")) settings.email.smtpUsername = body.smtpUsername ? email(body.smtpUsername) : "";
    if (Object.hasOwn(body, "smtpPassword") && body.smtpPassword) settings.email.smtpPassword = String(body.smtpPassword).replace(/\s+/g, "").slice(0, 300);
    if (body.clearSmtpPassword === true) settings.email.smtpPassword = "";
    if (Object.hasOwn(body, "calendarWebhookUrl")) {
      const value = String(body.calendarWebhookUrl ?? "").trim();
      if (value) {
        if (value.length > 2_000) throw Object.assign(new Error("Webhook URL is too long."), { status: 400 });
        const parsed = new URL(value);
        if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw Object.assign(new Error("Use a complete HTTPS webhook URL."), { status: 400 });
      }
      settings.calendarWebhookUrl = value;
    }
    await writeIntegrations(settings);
    return json(response, 200, publicSettings(settings));
  }
  if (route === "/api/settings/test-ai" && request.method === "POST") {
    const settings = await readIntegrations();
    const provider = url.searchParams.get("provider");
    if (!["gemini", "openai"].includes(provider)) throw Object.assign(new Error("Choose an AI provider."), { status: 400 });
    const key = settings.aiKeys[provider];
    if (!key) throw Object.assign(new Error(`Save a ${provider === "openai" ? "OpenAI" : "Gemini"} API key first.`), { status: 409 });
    const verify = provider === "openai"
      ? await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) })
      : await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(15_000) });
    if (!verify.ok) throw Object.assign(new Error(verify.status === 401 || verify.status === 403 ? "The provider rejected this API key." : `Provider check failed (HTTP ${verify.status}).`), { status: 502 });
    return json(response, 200, { connected: true, provider });
  }
  if (route === "/api/settings/test-email" && request.method === "POST") {
    const settings = await readIntegrations();
    if (!settings.email.senderEmail || !settings.email.smtpUsername || !settings.email.smtpPassword) throw Object.assign(new Error("Save a sender email, Gmail account and app password first."), { status: 409 });
    await sendGmail({ ...settings.email, to: settings.email.senderEmail, subject: "Sophia connection check", text: "Gmail is connected to Sophia. You can now review and send lead email drafts from the CRM." });
    return json(response, 200, { connected: true });
  }
  if (route === "/api/settings/test-webhook" && request.method === "POST") {
    const settings = await readIntegrations();
    if (!settings.calendarWebhookUrl) throw Object.assign(new Error("Save a booking webhook URL first."), { status: 409 });
    await sendWebhook(settings.calendarWebhookUrl, { event: "sophia.connection_test", source: "sophia-omnix", timestamp: new Date().toISOString(), test: true });
    return json(response, 200, { connected: true });
  }
  if (route === "/api/ai/draft" && request.method === "POST") {
    const body = await readJson(request, 8_000);
    const crm = await readCrm();
    const lead = crm.leads.find(item => item.id === body.leadId);
    if (!lead) throw Object.assign(new Error("That lead is no longer in the database."), { status: 404 });
    const integrations = await readIntegrations();
    const prompt = `You are Sophia, a thoughtful, concise B2B sales agent for Omnix Global. Draft a personal first-touch sales email for this lead. Use only the provided facts. Do not invent customer results, personal history, or commitments. Write one subject line beginning "Subject:" then a blank line then an email under 110 words. Keep the tone warm and direct, with one specific question and no fabricated facts.\n\nLead name: ${lead.name}\nRole: ${lead.role}\nCompany: ${lead.company}\nSource: ${lead.source}\nSales context: ${cleanText(body.context, 1_000) || "A brief introduction to Omnix Global's services."}`;
    const draft = await callAi(integrations, prompt);
    return json(response, 200, { draft, provider: integrations.aiProvider });
  }
  if (route === "/api/bookings" && request.method === "POST") {
    const body = await readJson(request, 8_000);
    const crm = await readCrm();
    const lead = crm.leads.find(item => item.id === body.leadId);
    if (!lead) throw Object.assign(new Error("That lead is no longer in the database."), { status: 404 });
    const integrations = await readIntegrations();
    if (!integrations.calendarWebhookUrl) throw Object.assign(new Error("Add a calendar booking webhook in Settings first."), { status: 409 });
    const startsAt = new Date(body.startsAt);
    if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() < Date.now() - 60_000 || startsAt.getTime() > Date.now() + 366 * 86_400_000) throw Object.assign(new Error("Choose a meeting time within the next 12 months."), { status: 400 });
    await sendWebhook(integrations.calendarWebhookUrl, { event: "sophia.meeting.requested", source: "sophia-omnix", timestamp: new Date().toISOString(), lead: { id: lead.id, name: lead.name, company: lead.company, email: lead.email }, meeting: { startsAt: startsAt.toISOString(), timezone: cleanText(body.timezone, 60) || "UTC", notes: cleanText(body.notes, 1_000) } });
    return json(response, 201, { booked: true, startsAt: startsAt.toISOString() });
  }
  if (route === "/api/leads" && request.method === "POST") {
    const body = await readJson(request, 10_000);
    const crm = await readCrm();
    if (crm.leads.length >= 5_000) throw Object.assign(new Error("Lead limit reached."), { status: 409 });
    const lead = { id: randomUUID(), ...leadPayload(body), createdAt: new Date().toISOString(), sample: false };
    crm.leads.unshift(lead);
    await writeCrm(crm);
    return json(response, 201, lead);
  }
  if (route === "/api/campaigns" && request.method === "POST") {
    const body = await readJson(request, 10_000);
    const crm = await readCrm();
    if (crm.campaigns.length >= 300) throw Object.assign(new Error("Campaign limit reached."), { status: 409 });
    const campaign = { id: randomUUID(), ...campaignPayload(body), sent: 0, replies: 0 };
    crm.campaigns.unshift(campaign);
    await writeCrm(crm);
    return json(response, 201, campaign);
  }

  const leadMatch = route.match(/^\/api\/leads\/([^/]+)$/);
  if (leadMatch && ["PATCH", "DELETE"].includes(request.method)) {
    const id = decodeURIComponent(leadMatch[1]);
    const crm = await readCrm();
    const index = crm.leads.findIndex(item => item.id === id);
    if (index < 0) throw Object.assign(new Error("Lead not found."), { status: 404 });
    if (request.method === "DELETE") {
      crm.leads.splice(index, 1);
      await writeCrm(crm);
      return json(response, 200, { deleted: id });
    }
    const body = await readJson(request, 10_000);
    crm.leads[index] = leadPayload(body, crm.leads[index]);
    await writeCrm(crm);
    return json(response, 200, crm.leads[index]);
  }
  const sendMatch = route.match(/^\/api\/leads\/([^/]+)\/send-email$/);
  if (sendMatch && request.method === "POST") {
    const body = await readJson(request, 12_000);
    const crm = await readCrm();
    const lead = crm.leads.find(item => item.id === decodeURIComponent(sendMatch[1]));
    if (!lead) throw Object.assign(new Error("Lead not found."), { status: 404 });
    if (lead.email.toLowerCase().endsWith(".test")) throw Object.assign(new Error("Example .test addresses cannot receive email. Replace this sample contact with a real address first."), { status: 400 });
    if (typeof body.body !== "string" || !body.body.trim()) throw Object.assign(new Error("Email body cannot be empty."), { status: 400 });
    const settings = await readIntegrations();
    await sendGmail({ ...settings.email, to: lead.email, subject: body.subject, text: body.body });
    lead.status = lead.status === "New" ? "Contacted" : lead.status;
    lead.updatedAt = new Date().toISOString();
    await writeCrm(crm);
    return json(response, 200, { sent: true, lead });
  }
  const campaignMatch = route.match(/^\/api\/campaigns\/([^/]+)$/);
  if (campaignMatch && ["PATCH", "DELETE"].includes(request.method)) {
    const id = decodeURIComponent(campaignMatch[1]);
    const crm = await readCrm();
    const index = crm.campaigns.findIndex(item => item.id === id);
    if (index < 0) throw Object.assign(new Error("Campaign not found."), { status: 404 });
    if (request.method === "DELETE") {
      crm.campaigns.splice(index, 1);
      for (const lead of crm.leads) if (lead.campaignId === id) lead.campaignId = "";
      await writeCrm(crm);
      return json(response, 200, { deleted: id });
    }
    const body = await readJson(request, 10_000);
    crm.campaigns[index] = campaignPayload(body, crm.campaigns[index]);
    await writeCrm(crm);
    return json(response, 200, crm.campaigns[index]);
  }

  return json(response, 404, { error: "That route does not exist." });
}

const server = createServer(async (request, response) => {
  setHeaders(response, request);
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(request, response, url);
    if (request.method !== "GET" && request.method !== "HEAD") return json(response, 405, { error: "Method not allowed." }, { Allow: "GET, HEAD" });
    const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const publicRoot = resolve(projectRoot, "public");
    const assetPath = resolve(publicRoot, relative);
    if (!assetPath.startsWith(`${publicRoot}${sep}`)) return json(response, 403, { error: "Forbidden." });
    const contents = await readFile(assetPath);
    response.writeHead(200, { "Content-Type": mime[extname(assetPath)] ?? "application/octet-stream", "Cache-Control": assetPath.endsWith(".html") ? "no-cache" : "public, max-age=300" });
    if (request.method === "HEAD") return response.end();
    return response.end(contents);
  } catch (error) {
    if (error.code === "ENOENT") return json(response, 404, { error: "Page not found." });
    handleError(response, error);
  }
});

server.listen(port, host, () => {
  process.stdout.write(`Sophia for Omnix Global is listening at http://${host}:${port}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
