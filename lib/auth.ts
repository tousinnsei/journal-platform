import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  generateToken,
  verifyToken,
  type AuthUserPayload,
} from "@/lib/jwt";

export { AUTH_COOKIE_NAME, generateToken, verifyToken };

export type AuthUser = AuthUserPayload;

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
