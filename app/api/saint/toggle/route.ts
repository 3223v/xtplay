import { NextResponse } from "next/server";

import {
  groundExists,
  readGroundData,
  writeGroundData,
} from "@/app/lib/sim/storage";
import { createDefaultSaintRole, isSaintRole } from "@/app/lib/sim/types";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groundId = searchParams.get("groundId");
    
    if (!groundId) {
      return NextResponse.json(
        {
          success: false,
          message: "Ground ID is required",
        },
        { status: 400 }
      );
    }

    if (!groundExists(groundId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Ground not found",
        },
        { status: 404 }
      );
    }

    const ground = readGroundData(groundId);
    const existingSaint = ground.role.find((role) => isSaintRole(role));
    
    let updatedGround;
    if (existingSaint) {
      // Remove saint role
      updatedGround = {
        ...ground,
        role: ground.role.filter((role) => !isSaintRole(role)),
      };
    } else {
      // Add saint role
      const saint = createDefaultSaintRole({
        default_url: ground.default_url,
        default_key: ground.default_key,
        default_model: ground.default_model,
      });
      updatedGround = {
        ...ground,
        role: [...ground.role, saint],
      };
    }

    const result = writeGroundData(groundId, updatedGround);
    
    return NextResponse.json({
      success: true,
      data: result,
      hasSaint: result.role.some((role) => isSaintRole(role)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to toggle saint role",
      },
      { status: 500 }
    );
  }
}