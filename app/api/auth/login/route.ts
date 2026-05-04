import { NextResponse } from "next/server";

import { findUserByIdentifier, createSession } from "@/app/lib/auth/server-storage";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { identifier: string; password: string };

    if (!body.identifier || !body.password) {
      return NextResponse.json(
        { success: false, message: "缺少用户名/邮箱或密码" },
        { status: 400 }
      );
    }

    const user = findUserByIdentifier(body.identifier);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "用户名或密码错误" },
        { status: 401 }
      );
    }

    if (user.password !== body.password) {
      return NextResponse.json(
        { success: false, message: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const session = createSession(user.id);

    const userData = Buffer.from(JSON.stringify({
      id: user.id,
      username: user.username,
      email: user.email,
    })).toString("base64");

    const response = NextResponse.json({
      success: true,
      message: "登录成功",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
    });

    response.cookies.set("session_id", session.session_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
    });

    response.cookies.set("user_data", userData, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("登录失败:", error);
    return NextResponse.json(
      { success: false, message: "登录失败" },
      { status: 500 }
    );
  }
}