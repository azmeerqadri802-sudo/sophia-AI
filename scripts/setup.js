import { randomBytes } from "node:crypto";
import { open, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const envPath = resolve(projectRoot, ".env");

try {
  await readFile(envPath, "utf8");
  process.stderr.write("An .env file already exists. Keep it as-is; replace it yourself only if you intend to rotate the admin password or encryption key.\n");
  process.exitCode = 1;
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  const password = randomBytes(30).toString("base64url");
  const encryptionKey = randomBytes(32).toString("base64");
  const contents = [
    `APP_ADMIN_PASSWORD=${password}`,
    `CONFIG_ENCRYPTION_KEY=${encryptionKey}`,
    "HOST=127.0.0.1",
    "PORT=4173",
    ""
  ].join("\n");
  const handle = await open(envPath, "wx", 0o600);
  try {
    await handle.writeFile(contents, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  process.stdout.write(`Created .env with a random admin password and encryption key.\n\nAdmin password (save it now):\n${password}\n\nKeep .env private and back it up securely.\n`);
}
