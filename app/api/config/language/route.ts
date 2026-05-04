import { NextRequest, NextResponse } from "next/server";

import { getLanguageConfig, setLanguageConfig } from "@/app/lib/config";
import type { Language } from "@/app/lib/types";

export async function GET() {
  try {
    const language = getLanguageConfig();

    return NextResponse.json({
      success: true,
      data: language,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "加载语言配置失败",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const newLanguage = body.language as Language;

    if (newLanguage !== "zh" && newLanguage !== "en") {
      return NextResponse.json(
        {
          success: false,
          message: "无效的语言类型，必须是 'zh' 或 'en'",
        },
        { status: 400 }
      );
    }

    await setLanguageConfig(newLanguage);

    return NextResponse.json({
      success: true,
      data: newLanguage,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "更新语言配置失败",
      },
      { status: 500 }
    );
  }
}
