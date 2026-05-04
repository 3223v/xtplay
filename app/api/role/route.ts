import { NextResponse } from "next/server";

import {
  groundExists,
  readGroundData,
  writeGroundData,
} from "@/app/lib/sim/storage";
import {
  createRoleId,
  normalizeRoleKind,
  normalizeRoleStatus,
  RoleConfig,
  roleSchema,
} from "@/app/lib/sim/types";
import { getUserIdFromRequest } from "@/app/lib/auth/utils";

function resolveGroundId(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("groundId") || "1";
}

function resolveRoleDefaults(userId: string, role: Partial<RoleConfig>, groundId: string) {
  const ground = readGroundData(userId, groundId);

  return roleSchema.parse({
    id: role.id || createRoleId(role.name || "role"),
    kind: normalizeRoleKind(role.kind, role.name),
    name: role.name || "新角色",
    description: role.description || "",
    use_prompt: role.use_prompt || "",
    system_prompt: role.system_prompt || "",
    canvas_position: role.canvas_position || { x: 0, y: 0 },
    url: role.url ?? ground.default_url,
    key: role.key ?? ground.default_key,
    model: role.model ?? ground.default_model,
    temperature: role.temperature,
    knowledge_private: role.knowledge_private || [],
    knowledge_public: role.knowledge_public || [],
    blocked_role_names: role.blocked_role_names || [],
    unknown_role_names: role.unknown_role_names || [],
    inbox: role.inbox || [],
    redundancy: role.redundancy ?? 0,
    status: normalizeRoleStatus(role.status),
    enabled: role.enabled ?? true,
    last_think: role.last_think || "",
    last_error: role.last_error || "",
  });
}

export async function GET(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const groundId = resolveGroundId(request);

    if (!groundExists(userId, groundId)) {
      return NextResponse.json(
        {
          success: false,
          message: "工作空间不存在",
        },
        { status: 404 },
      );
    }

    const data = readGroundData(userId, groundId);

    return NextResponse.json({
      success: true,
      data: data.role,
      groundId,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "读取角色列表失败",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const groundId = resolveGroundId(request);
    const body = (await request.json()) as Partial<RoleConfig>;

    if (!groundExists(userId, groundId)) {
      return NextResponse.json(
        {
          success: false,
          message: "工作空间不存在",
        },
        { status: 404 },
      );
    }

    const data = readGroundData(userId, groundId);
    const newRole = resolveRoleDefaults(userId, body, groundId);

    const ground = writeGroundData(userId, groundId, {
      ...data,
      role: [...data.role, newRole],
    });

    return NextResponse.json({
      success: true,
      data: newRole,
      ground,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "创建角色失败",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const groundId = resolveGroundId(request);
    const body = (await request.json()) as Partial<RoleConfig> & { id?: string };

    if (!groundExists(userId, groundId)) {
      return NextResponse.json(
        {
          success: false,
          message: "工作空间不存在",
        },
        { status: 404 },
      );
    }

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "缺少角色 ID",
        },
        { status: 400 },
      );
    }

    const data = readGroundData(userId, groundId);
    const nextRoles = data.role.map((role) =>
      role.id === body.id || role.name === body.id
        ? resolveRoleDefaults(userId, { ...role, ...body }, groundId)
        : role,
    );
    const updatedGround = writeGroundData(userId, groundId, {
      ...data,
      role: nextRoles,
    });
    const updatedRole = updatedGround.role.find(
      (role) => role.id === body.id || role.name === body.id,
    );

    return NextResponse.json({
      success: true,
      data: updatedRole,
      ground: updatedGround,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "更新角色失败",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const groundId = searchParams.get("groundId") || "1";
    const id = searchParams.get("id");

    if (!groundExists(userId, groundId)) {
      return NextResponse.json(
        {
          success: false,
          message: "工作空间不存在",
        },
        { status: 404 },
      );
    }

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "缺少角色 ID",
        },
        { status: 400 },
      );
    }

    const data = readGroundData(userId, groundId);
    const ground = writeGroundData(userId, groundId, {
      ...data,
      role: data.role.filter((role) => role.id !== id && role.name !== id),
    });

    return NextResponse.json({
      success: true,
      message: `角色 ${id} 已删除`,
      ground,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "删除角色失败",
      },
      { status: 500 },
    );
  }
}