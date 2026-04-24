import { NextResponse } from "next/server";

import {
  createGround,
  deleteGround,
  groundExists,
  listGroundSummaries,
  readGroundData,
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

    if (id) {
      if (!groundExists(id)) {
        return NextResponse.json(
          {
            success: false,
            message: "Ground not found",
          },
          { status: 404 },
        );
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
    console.error("GET /api/ground failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to read grounds",
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
      simulation: body.simulation,
    });

    return NextResponse.json({
      success: true,
      data: toGroundSummary(ground),
      ground,
      message: "Ground created successfully",
    });
  } catch (error) {
    console.error("POST /api/ground failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create ground",
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
          message: "Ground ID is required",
        },
        { status: 400 },
      );
    }

    if (!groundExists(body.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Ground not found",
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
      round: body.round,
    });

    return NextResponse.json({
      success: true,
      data: ground,
      summary: toGroundSummary(ground),
      message: "Ground updated successfully",
    });
  } catch (error) {
    console.error("PUT /api/ground failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update ground",
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
          message: "Ground ID is required",
        },
        { status: 400 },
      );
    }

    if (!groundExists(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Ground not found",
        },
        { status: 404 },
      );
    }

    deleteGround(id);

    return NextResponse.json({
      success: true,
      message: `Ground ${id} deleted successfully`,
    });
  } catch (error) {
    console.error("DELETE /api/ground failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete ground",
      },
      { status: 500 },
    );
  }
}
