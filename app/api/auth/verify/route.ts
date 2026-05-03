import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "ground_auth";

function isAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
}

function getAuthPassword(): string {
  return process.env.AUTH_PASSWORD || "";
}

export async function GET(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.json(
      { success: false, message: "认证未启用" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const password = searchParams.get("password");
  const correctPassword = getAuthPassword();

  if (password === correctPassword) {
    const response = NextResponse.json({ success: true, message: "验证成功" });
    response.cookies.set(AUTH_COOKIE_NAME, correctPassword, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });
    return response;
  }

  return NextResponse.json(
    { success: false, message: "密码错误" },
    { status: 401 }
  );
}