import tls from "node:tls";

function expectAddress(value, label) {
  const address = String(value ?? "").trim();
  if (address.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(address) || /[\r\n]/.test(address)) {
    throw new Error(`${label} must be a valid email address.`);
  }
  return address;
}

export function validateEmailAddress(value, label = "Email") {
  return expectAddress(value, label);
}

export async function sendGmail({ username, password, senderEmail, to, subject, text }) {
  const user = expectAddress(username, "Gmail account");
  const from = expectAddress(senderEmail, "Sender email");
  const recipient = expectAddress(to, "Recipient email");
  if (!password) throw new Error("Save a Gmail app password in Settings before sending.");
  const cleanSubject = String(subject ?? "").replace(/[\r\n]/g, " ").slice(0, 180) || "A note from Sophia";
  const body = String(text ?? "").replace(/\r?\n/g, "\r\n").slice(0, 30_000);
  const headers = [
    `From: Sophia <${from}>`, `To: ${recipient}`,
    `Subject: ${cleanSubject.replace(/[^\x20-\x7E]/g, "")}`,
    "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 8bit",
    "X-Mailer: Sophia Omnix Sales Agent"
  ];
  const message = `${headers.join("\r\n")}\r\n\r\n${body.split("\r\n").map(line => line.startsWith(".") ? `.${line}` : line).join("\r\n")}\r\n.`;

  await new Promise((resolve, reject) => {
    const socket = tls.connect({ host: "smtp.gmail.com", port: 465, servername: "smtp.gmail.com", minVersion: "TLSv1.2" });
    socket.setTimeout(15_000, () => socket.destroy(new Error("Gmail SMTP timed out.")));
    let buffer = "";
    const pending = [];
    const replies = [];
    let closed = false;
    const stop = (error) => {
      if (closed) return;
      closed = true;
      socket.destroy();
      reject(error);
    };
    socket.on("error", stop);
    socket.on("close", () => {
      if (!closed) stop(new Error("Gmail SMTP connection closed unexpectedly."));
    });
    socket.on("data", chunk => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\r\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (/^\d{3} /.test(line)) {
          const reply = { code: Number(line.slice(0, 3)), line };
          const waiter = pending.shift();
          if (waiter) waiter(reply.code, reply.line);
          else replies.push(reply);
        }
      }
    });
    const response = () => new Promise((resolveResponse, rejectResponse) => {
      const queued = replies.shift();
      if (queued) return resolveResponse(queued);
      const timer = setTimeout(() => rejectResponse(new Error("Gmail SMTP did not respond in time.")), 15_000);
      pending.push((code, line) => { clearTimeout(timer); resolveResponse({ code, line }); });
    });
    const command = async (value, expected) => {
      const next = response();
      socket.write(`${value}\r\n`);
      const { code, line } = await next;
      if (!expected.includes(code)) throw new Error(code === 535 ? "Gmail rejected the account or app password." : `Gmail SMTP rejected a request (${code}).`);
      return line;
    };

    socket.once("secureConnect", () => {
      void (async () => {
        try {
          const { code: greetingCode } = await response();
          if (greetingCode !== 220) throw new Error("Could not connect to Gmail SMTP.");
          await command("EHLO sophia.omnix.local", [250]);
          await command("AUTH LOGIN", [334]);
          await command(Buffer.from(user).toString("base64"), [334]);
          await command(Buffer.from(password).toString("base64"), [235]);
          await command(`MAIL FROM:<${from}>`, [250]);
          await command(`RCPT TO:<${recipient}>`, [250, 251]);
          await command("DATA", [354]);
          await command(message, [250]);
          await command("QUIT", [221]);
          closed = true;
          socket.end();
          resolve();
        } catch (error) { stop(error); }
      })();
    });
  });
}
