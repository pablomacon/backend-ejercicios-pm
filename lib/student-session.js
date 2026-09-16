import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_DURATION_SECONDS = Number(process.env.STUDENT_SESSION_SECONDS || 12 * 60 * 60);

function secret() {
  const value = process.env.STUDENT_SESSION_SECRET || process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!value) throw new Error("Falta configurar STUDENT_SESSION_SECRET.");
  return value;
}

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function signature(payload) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createStudentSession({ email, slug }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = encode(JSON.stringify({ email: String(email).toLowerCase(), slug, iat: now, exp: now + SESSION_DURATION_SECONDS }));
  return `${payload}.${signature(payload)}`;
}

export function verifyStudentSession(token, expectedSlug) {
  const [payload, receivedSignature, extra] = String(token || "").split(".");
  if (!payload || !receivedSignature || extra) return null;

  const expectedSignature = signature(payload);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!data.email || data.slug !== expectedSlug || !Number.isFinite(data.exp) || data.exp <= now) return null;
  return data;
}
