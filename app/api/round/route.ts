import { NextResponse } from "next/server";

import { advanceGroundRound } from "@/app/lib/sim/engine";
import {
  groundExists,
  readGroundData,
  writeGroundData,
} from "@/app/lib/sim/storage";
import { GroundFile, RoundEvent, roundSchema } from "@/app/lib/sim/types";

function resolveGroundId(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("groundId") || "1";
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
      data: data.round,
      groundId,
      simulation: data.simulation,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to read rounds",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const groundId = resolveGroundId(request);
    const body = (await request.json().catch(() => ({}))) as {
      before?: unknown;
      after?: unknown;
      output?: unknown[];
      instructions?: string;
      event?: RoundEvent | null;
      batchRoleIds?: string[];
      excludedRoleIds?: string[];
      dryRun?: boolean;
      persist?: boolean;
    };

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

    if (body.before || body.after || body.output) {
      const manualRound = roundSchema.parse({
        round: data.round.length + 1,
        createdAt: new Date().toISOString(),
        before: body.before || {},
        after: body.after || {},
        output: body.output || [],
      });
      const ground = writeGroundData(groundId, {
        ...data,
        round: [...data.round, manualRound],
      });

      return NextResponse.json({
        success: true,
        data: manualRound,
        ground,
      });
    }

    const { ground, round } = await advanceGroundRound(data, {
      instructions: body.instructions,
      event: body.event,
      batchRoleIds: body.batchRoleIds,
      excludedRoleIds: body.excludedRoleIds,
      dryRun: body.dryRun,
    });

    const persistedGround =
      body.persist === false ? ground : writeGroundData(groundId, ground as GroundFile);

    return NextResponse.json({
      success: true,
      data: round,
      ground: persistedGround,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create round",
      },
      { status: 500 },
    );
  }
}
