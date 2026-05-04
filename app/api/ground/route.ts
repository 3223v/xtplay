import { NextResponse } from "next/server";

import {
  createGround,
  deleteGround,
  exportGroundData,
  groundExists,
  listGroundSummaries,
  readGroundData,
  undoLastRound,
  updateGround,
} from "@/app/lib/sim/storage";
import { GroundFile, toGroundSummary } from "@/app/lib/sim/types";

export interface GroundListItem {
  id: string;
  name: string;
  description: string;
  default_url: string;
  default_key: string;
  default_model: string;
  createdAt: string;
  updatedAt: string;
  roleCount: number;
  roundCount: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const exportMode = searchParams.get("export") === "true";

    if (id) {
      if (!groundExists(id)) {
        return NextResponse.json(
          {
            success: false,
            message: "工作空间不存在",
          },
          { status: 404 },
        );
      }

      if (exportMode) {
        const exportedGround = exportGroundData(id);
        return NextResponse.json({
          success: true,
          data: exportedGround,
        });
      }

      const ground = readGroundData(id);

      return NextResponse.json({
        success: true,
        data: ground,
      });
    }

    return NextResponse.json({
      success: true,
      data: listGroundSummaries(),
    });
  } catch (error) {
    console.error("读取工作空间列表失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "读取工作空间列表失败",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<GroundFile>;
    const ground = createGround({
      name: body.name,
      description: body.description,
      default_url: body.default_url,
      default_key: body.default_key,
      default_model: body.default_model,
      knowledge: body.knowledge,
      rule: body.rule,
      role: body.role,
      workflow: body.workflow,
      simulation: body.simulation,
    });

    return NextResponse.json({
      success: true,
      data: toGroundSummary(ground),
      ground,
      message: "工作空间创建成功",
    });
  } catch (error) {
    console.error("创建工作空间失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "创建工作空间失败",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<GroundFile>;

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "缺少工作空间 ID",
        },
        { status: 400 },
      );
    }

    if (!groundExists(body.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "工作空间不存在",
        },
        { status: 404 },
      );
    }

    const ground = updateGround(body.id, {
      name: body.name,
      description: body.description,
      default_url: body.default_url,
      default_key: body.default_key,
      default_model: body.default_model,
      knowledge: body.knowledge,
      rule: body.rule,
      role: body.role,
      simulation: body.simulation,
      workflow: body.workflow,
      round: body.round,
    });

    return NextResponse.json({
      success: true,
      data: ground,
      summary: toGroundSummary(ground),
      message: "工作空间更新成功",
    });
  } catch (error) {
    console.error("更新工作空间失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "更新工作空间失败",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "缺少工作空间 ID",
        },
        { status: 400 },
      );
    }

    if (!groundExists(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "工作空间不存在",
        },
        { status: 404 },
      );
    }

    deleteGround(id);

    return NextResponse.json({
      success: true,
      message: `工作空间 ${id} 已删除`,
    });
  } catch (error) {
    console.error("删除工作空间失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "删除工作空间失败",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "缺少工作空间 ID",
        },
        { status: 400 },
      );
    }

    if (!groundExists(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "工作空间不存在",
        },
        { status: 404 },
      );
    }

    if (action === "undo") {
      const ground = undoLastRound(id);
      return NextResponse.json({
        success: true,
        data: ground,
        summary: toGroundSummary(ground),
        message: "上一回合已撤销",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "无效的操作",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("执行操作失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "执行操作失败",
      },
      { status: 500 },
    );
  }
}
