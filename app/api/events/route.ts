import { NextResponse } from "next/server";

import { getEventsConfig } from "@/app/lib/config";

export async function GET() {
  try {
    const events = getEventsConfig();

    return NextResponse.json({
      success: true,
      data: events,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load events config",
      },
      { status: 500 }
    );
  }
}