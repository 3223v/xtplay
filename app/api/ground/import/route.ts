import { NextResponse } from "next/server";
import fs from "fs";

import {
  defaultWorkflowState,
  groundSchema,
  GroundFile,
} from "@/app/lib/sim/types";
import {
  readGroundData,
  writeGroundData,
  getGroundPath,
} from "@/app/lib/sim/storage";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as GroundFile;

    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          message: "Ground name is required",
        },
        { status: 400 }
      );
    }

    // Generate a new ground ID
    const generateUniqueId = () => {
      let id = Math.floor(Math.random() * 10000).toString();
      while (fs.existsSync(getGroundPath(id))) {
        id = Math.floor(Math.random() * 10000).toString();
      }
      return id;
    };

    const groundId = generateUniqueId();

    // Normalize the ground data
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

    // Validate the ground data
    try {
      groundSchema.parse(normalizedGround);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid ground data: ${error instanceof Error ? error.message : 'Unknown validation error'}`,
        },
        { status: 400 }
      );
    }

    // Write the ground data to file
    const result = writeGroundData(groundId, normalizedGround);

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
      message: "Ground imported successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to import ground",
      },
      { status: 500 }
    );
  }
}
