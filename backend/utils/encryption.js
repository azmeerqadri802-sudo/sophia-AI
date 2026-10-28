const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SECRET_SOURCE = process.env.ENCRYPTION_SECRET || 'OmnixGlobalSophiaSecretKey2026!!';
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(String(SECRET_SOURCE))
  .digest('base64')
  .substring(0, 32);

function encryptApiKey(plainText) {
  if (!plainText) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptApiKey(encryptedPayload) {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = parts.join(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encryptApiKey, decryptApiKey };
