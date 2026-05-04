import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import {
  defaultWorkflowState,
  groundSchema,
  GroundFile,
} from "@/app/lib/sim/types";
import {
  readGroundData,
  writeGroundData,
  getNextGroundId,
} from "@/app/lib/sim/storage";
import { getUserIdFromRequest } from "@/app/lib/auth/utils";

export async function POST(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as GroundFile;

    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          message: "需要工作空间名称",
        },
        { status: 400 }
      );
    }

    const groundId = getNextGroundId(userId);

    const normalizedGround: GroundFile = {
      id: groundId,
      name: body.name,
      description: body.description || "",
      default_url: body.default_url || "",
      default_key: body.default_key || "",
      default_model: body.default_model || "",
      role: body.role || [],
      round: body.round || [],
      knowledge: body.knowledge || [],
      rule: body.rule || [],
      simulation: body.simulation || {
        mode: "auto",
        round_goal: "",
        batch_size: 10,
        current_batch_index: 0,
        max_round_history: 100,
      },
      workflow: body.workflow || defaultWorkflowState,
      createdAt: body.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    try {
      groundSchema.parse(normalizedGround);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: `工作空间数据无效: ${error instanceof Error ? error.message : '未知验证错误'}`,
        },
        { status: 400 }
      );
    }

    const result = writeGroundData(userId, groundId, normalizedGround);

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        name: result.name,
        description: result.description,
        default_url: result.default_url,
        default_key: result.default_key,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
      message: "工作空间导入成功",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "导入工作空间失败",
      },
      { status: 500 }
    );
  }
}