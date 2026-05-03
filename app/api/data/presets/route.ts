import { NextResponse } from "next/server";

import { getPresetsConfig } from "@/app/lib/config";

export async function GET() {
  try {
    const presets = getPresetsConfig();

    return NextResponse.json({
      success: true,
      data: presets,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load presets config",
      },
      { status: 500 }
    );
  }
}