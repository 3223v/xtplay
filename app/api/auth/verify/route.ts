import { NextResponse } from "next/server";

import { getSession, getUserById } from "@/app/lib/auth/server-storage";

export async function GET(request: Request) {
  try {
    const cookies = request.headers.get("cookie");
    const userDataMatch = cookies?.match(/user_data=([^;]+)/);
    const sessionIdMatch = cookies?.match(/session_id=([^;]+)/);

    let userId: string | null = null;

    if (userDataMatch) {
      try {
        const urlDecoded = decodeURIComponent(userDataMatch[1]);
        const userData = JSON.parse(atob(urlDecoded));
        userId = userData.id || null;
      } catch {
        userId = null;
      }
    }

    if (!userId && sessionIdMatch) {
      const session = getSession(sessionIdMatch[1]);
      userId = session?.user_id || null;
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const user = getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error("验证失败:", error);
    return NextResponse.json(
      { success: false, message: "验证失败" },
      { status: 500 }
    );
  }
}