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
          message: "缺少工作空间 ID",
        },
        { status: 400 }
      );
    }

    if (!groundExists(groundId)) {
      return NextResponse.json(
        {
          success: false,
          message: "工作空间不存在",
        },
        { status: 404 }
      );
    }

    const ground = readGroundData(groundId);
    const existingSaint = ground.role.find((role) => isSaintRole(role));

    let updatedGround;
    if (existingSaint) {
      updatedGround = {
        ...ground,
        role: ground.role.filter((role) => !isSaintRole(role)),
        workflow: {
          ...ground.workflow,
          pending_plan: null,
          pending_judgement: null,
        },
      };
    } else {
      const saint = createDefaultSaintRole({
        default_url: ground.default_url,
        default_key: ground.default_key,
        default_model: ground.default_model,
      });
      updatedGround = {
        ...ground,
        role: [...ground.role, saint],
        workflow: {
          ...ground.workflow,
          pending_plan: null,
          pending_judgement: null,
        },
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
        message: error instanceof Error ? error.message : "切换 Saint 角色失败",
      },
      { status: 500 }
    );
  }
}
