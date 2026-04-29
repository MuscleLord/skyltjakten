import crypto from "node:crypto";

export function createNonce(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashNonce(nonce: string): string {
  return crypto.createHash("sha256").update(nonce, "utf8").digest("hex");
}