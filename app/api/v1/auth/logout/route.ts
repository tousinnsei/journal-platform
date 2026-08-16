import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ code: 200, message: "已退出登录" });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
