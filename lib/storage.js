import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dataDirectory = resolve(projectRoot, "data");
const statePath = resolve(dataDirectory, "crm.json");
const secretsPath = resolve(dataDirectory, "integrations.enc");

export const seedCampaigns = [
  { id: "campaign-intro", name: "Enterprise introductions", channel: "Email + LinkedIn", status: "active", audience: "Operations leaders", sent: 128, replies: 19, updatedAt: new Date().toISOString(), sample: true },
  { id: "campaign-saas", name: "SaaS expansion", channel: "Email", status: "active", audience: "SaaS founders", sent: 84, replies: 12, updatedAt: new Date().toISOString(), sample: true },
  { id: "campaign-reengage", name: "Q4 re-engagement", channel: "Email + WhatsApp", status: "paused", audience: "Existing contacts", sent: 46, replies: 8, updatedAt: new Date().toISOString(), sample: true }
];

const ago = (hours) => new Date(Date.now() - hours * 3_600_000).toISOString();
export const seedLeads = [
  { id: "lead-001", name: "Amina Rahman", company: "Northstar Labs", email: "amina@example.test", phone: "+92 300 111 0201", role: "VP of Operations", source: "Website", status: "Qualified", score: 96, value: 18000, campaignId: "campaign-intro", createdAt: ago(2), updatedAt: ago(2), sample: true },
  { id: "lead-002", name: "Hamza Qureshi", company: "Vertex Cloud", email: "hamza@example.test", phone: "+92 300 111 0202", role: "Founder", source: "LinkedIn", status: "Contacted", score: 91, value: 24000, campaignId: "campaign-saas", createdAt: ago(5), updatedAt: ago(4), sample: true },
  { id: "lead-003", name: "Sara Malik", company: "Atlas Commerce", email: "sara@example.test", phone: "+92 300 111 0203", role: "Head of Growth", source: "Referral", status: "New", score: 88, value: 12500, campaignId: "campaign-intro", createdAt: ago(8), updatedAt: ago(8), sample: true },
  { id: "lead-004", name: "Omar Farooq", company: "Cedar Systems", email: "omar@example.test", phone: "+92 300 111 0204", role: "Managing Director", source: "Webinar", status: "Active Database", score: 84, value: 32000, campaignId: "campaign-saas", createdAt: ago(24), updatedAt: ago(16), sample: true },
  { id: "lead-005", name: "Noor Siddiqui", company: "Lumen Health", email: "noor@example.test", phone: "+92 300 111 0205", role: "Commercial Lead", source: "Website", status: "New", score: 79, value: 9800, campaignId: "campaign-reengage", createdAt: ago(30), updatedAt: ago(28), sample: true }
];

export const emptyIntegrations = () => ({
  aiProvider: "gemini",
  aiKeys: { gemini: "", openai: "" },
  email: { senderEmail: "", smtpUsername: "", smtpPassword: "" },
  calendarWebhookUrl: ""
});

function encryptionKey() {
  const raw = process.env.CONFIG_ENCRYPTION_KEY ?? "";
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("CONFIG_ENCRYPTION_KEY must be a base64-encoded 32-byte key. Run npm run setup.");
  return key;
}

export async function ensureDataDirectory() {
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
}

async function atomicWrite(target, contents, mode = 0o600) {
  await ensureDataDirectory();
  const temporary = `${target}.${process.pid}.${randomBytes(5).toString("hex")}.tmp`;
  await writeFile(temporary, contents, { encoding: "utf8", mode, flag: "wx" });
  await rename(temporary, target);
}

export async function readCrm() {
  await ensureDataDirectory();
  try {
    const parsed = JSON.parse(await readFile(statePath, "utf8"));
    return {
      leads: Array.isArray(parsed.leads) ? parsed.leads : seedLeads,
      campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : seedCampaigns
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const initial = { leads: seedLeads, campaigns: seedCampaigns };
    await writeCrm(initial);
    return initial;
  }
}

export async function writeCrm(value) {
  await atomicWrite(statePath, JSON.stringify(value, null, 2));
}

export async function readIntegrations() {
  await ensureDataDirectory();
  try {
    const record = JSON.parse(await readFile(secretsPath, "utf8"));
    const iv = Buffer.from(record.iv, "base64");
    const tag = Buffer.from(record.tag, "base64");
    const ciphertext = Buffer.from(record.ciphertext, "base64");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    const cleartext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    return { ...emptyIntegrations(), ...JSON.parse(cleartext) };
  } catch (error) {
    if (error.code === "ENOENT") return emptyIntegrations();
    throw error;
  }
}

export async function writeIntegrations(value) {
  await ensureDataDirectory();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const envelope = JSON.stringify({ version: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") });
  await atomicWrite(secretsPath, envelope);
}
