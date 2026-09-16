import test from "node:test";
import assert from "node:assert/strict";

process.env.STUDENT_SESSION_SECRET = "test-secret-that-is-not-used-in-production";

const { createStudentSession, verifyStudentSession } = await import("../lib/student-session.js");

test("creates and verifies a session for the expected activity", () => {
  const token = createStudentSession({ email: "Alumno@Example.com", slug: "arreglos-strings-01" });
  const session = verifyStudentSession(token, "arreglos-strings-01");

  assert.equal(session.email, "alumno@example.com");
  assert.equal(session.slug, "arreglos-strings-01");
  assert.ok(session.exp > session.iat);
});

test("rejects a session used for another activity", () => {
  const token = createStudentSession({ email: "alumno@example.com", slug: "arreglos-strings-01" });
  assert.equal(verifyStudentSession(token, "otra-actividad"), null);
});

test("rejects a modified session", () => {
  const token = createStudentSession({ email: "alumno@example.com", slug: "arreglos-strings-01" });
  const [payload, signature] = token.split(".");
  assert.equal(verifyStudentSession(`${payload}x.${signature}`, "arreglos-strings-01"), null);
});
