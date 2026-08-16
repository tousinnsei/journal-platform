import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { generateToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { loginSchema, firstErrorMessage } from "@/lib/validators";
import { logAuditAction } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { code: 400, message: firstErrorMessage(result.error) },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { code: 401, message: "邮箱或密码不正确" },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { code: 401, message: "邮箱或密码不正确" },
        { status: 401 }
      );
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await logAuditAction(user.id, "LOGIN", "user", user.id, { email: user.email });

    const response = NextResponse.json({
      code: 200,
      message: "登录成功",
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { code: 500, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
