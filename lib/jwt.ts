import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

export const AUTH_COOKIE_NAME = "journal_admin_token";

const DEV_FALLBACK_SECRET = "journal-platform-jwt-secret-key-2026";

export interface AuthUserPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret !== DEV_FALLBACK_SECRET) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET 未配置或仍在使用开发默认密钥，请设置强随机的 JWT_SECRET 环境变量。"
    );
  }
  console.warn(
    "[journal-platform] 警告: 未配置 JWT_SECRET 或仍在使用开发默认密钥，请勿在生产环境使用。"
  );
  return DEV_FALLBACK_SECRET;
}

export function generateToken(user: AuthUserPayload): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

function base64UrlDecode(input: string): Uint8Array<ArrayBuffer> {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const bin = atob(base64 + padding);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

export async function verifyToken(token: string): Promise<AuthUserPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(headerB64))
    ) as { alg?: string };
    if (header.alg !== "HS256") return null;

    const secret = getJwtSecret();
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const expectedSignature = base64UrlDecode(signatureB64);
    const valid = await crypto.subtle.verify("HMAC", key, expectedSignature, data);
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    ) as {
      id: string;
      email: string;
      name: string;
      role: Role;
      exp?: number;
    };

    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return null;
    }
    if (!payload.id || !payload.email || !payload.name || !payload.role) {
      return null;
    }

    return { id: payload.id, email: payload.email, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}
