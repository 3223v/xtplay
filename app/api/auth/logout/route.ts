import { NextResponse } from "next/server";

import { deleteSession } from "@/app/lib/auth/server-storage";

export async function POST(request: Request) {
  try {
    const cookies = request.headers.get("cookie");
    const sessionIdMatch = cookies?.match(/session_id=([^;]+)/);
    const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;

    if (sessionId) {
      deleteSession(sessionId);
    }

    const response = NextResponse.json({
      success: true,
      message: "登出成功",
    });

    response.cookies.set("session_id", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    });

    response.cookies.set("user_data", "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("登出失败:", error);
    return NextResponse.json(
      { success: false, message: "登出失败" },
      { status: 500 }
    );
  }
}