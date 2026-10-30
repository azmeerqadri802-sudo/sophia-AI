import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

export async function loadEnvironment() {
  try {
    const source = await readFile(resolve(projectRoot, ".env"), "utf8");
    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const divider = line.indexOf("=");
      if (divider < 1) continue;
      const name = line.slice(0, divider).trim();
      let value = line.slice(divider + 1).trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!Object.hasOwn(process.env, name)) process.env[name] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
