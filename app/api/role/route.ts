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

function resolveGroundId(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("groundId") || "1";
}

function resolveRoleDefaults(role: Partial<RoleConfig>, groundId: string) {
  const ground = readGroundData(groundId);

  return roleSchema.parse({
    id: role.id || createRoleId(role.name || "role"),
    kind: normalizeRoleKind(role.kind, role.name),
    name: role.name || "New Role",
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
    const groundId = resolveGroundId(request);

    if (!groundExists(groundId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Ground not found",
        },
        { status: 404 },
      );
    }

    const data = readGroundData(groundId);

    return NextResponse.json({
      success: true,
      data: data.role,
      groundId,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to read roles",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const groundId = resolveGroundId(request);
    const body = (await request.json()) as Partial<RoleConfig>;

    if (!groundExists(groundId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Ground not found",
        },
        { status: 404 },
      );
    }

    const data = readGroundData(groundId);
    const newRole = resolveRoleDefaults(body, groundId);

    const ground = writeGroundData(groundId, {
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
        message: "Failed to create role",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const groundId = resolveGroundId(request);
    const body = (await request.json()) as Partial<RoleConfig> & { id?: string };

    if (!groundExists(groundId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Ground not found",
        },
        { status: 404 },
      );
    }

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Role ID is required",
        },
        { status: 400 },
      );
    }

    const data = readGroundData(groundId);
    const nextRoles = data.role.map((role) =>
      role.id === body.id || role.name === body.id
        ? resolveRoleDefaults({ ...role, ...body }, groundId)
        : role,
    );
    const updatedGround = writeGroundData(groundId, {
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
        message: "Failed to update role",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groundId = searchParams.get("groundId") || "1";
    const id = searchParams.get("id");

    if (!groundExists(groundId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Ground not found",
        },
        { status: 404 },
      );
    }

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Role ID is required",
        },
        { status: 400 },
      );
    }

    const data = readGroundData(groundId);
    const ground = writeGroundData(groundId, {
      ...data,
      role: data.role.filter((role) => role.id !== id && role.name !== id),
    });

    return NextResponse.json({
      success: true,
      message: `Role ${id} deleted`,
      ground,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete role",
      },
      { status: 500 },
    );
  }
}
