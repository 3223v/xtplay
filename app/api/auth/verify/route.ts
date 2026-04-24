import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const GROUND_PASSWORD = "1234";
const AUTH_COOKIE_NAME = "ground_auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get("password");

  if (password === GROUND_PASSWORD) {
    const response = NextResponse.json({ success: true, message: "验证成功" });
    response.cookies.set(AUTH_COOKIE_NAME, GROUND_PASSWORD, {
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
