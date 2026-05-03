import { NextResponse } from "next/server";

import {
  advanceGroundRound,
  applySaintJudgementToGround,
  proposeSaintJudgement,
  proposeSaintPlan,
} from "@/app/lib/sim/engine";
import {
  groundExists,
  readGroundData,
  writeGroundData,
} from "@/app/lib/sim/storage";
import {
  getBatchRoles,
  getSaintRole,
  GroundFile,
  SaintJudgement,
  SaintPlan,
} from "@/app/lib/sim/types";

type SaintAction =
  | "propose_plan"
  | "approve_plan"
  | "reject_plan"
  | "approve_judgement"
  | "reject_judgement";

function resolveGroundId(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("groundId") || "1";
}

function resolvePlanBatchRoleIds(ground: GroundFile, plan: SaintPlan) {
  const batchRoleIds = ground.role
    .filter(
      (role) =>
        role.enabled &&
        role.status !== "dead" &&
        role.kind !== "saint" &&
        plan.batch_role_names.includes(role.name),
    )
    .map((role) => role.id);

  if (batchRoleIds.length > 0) {
    return batchRoleIds;
  }

  return getBatchRoles(ground).map((role) => role.id);
}

export async function POST(request: Request) {
  try {
    const groundId = resolveGroundId(request);
    const body = (await request.json().catch(() => ({}))) as {
      action?: SaintAction;
      dryRun?: boolean;
      editedPlan?: {
        instructions?: string;
        event?: { type: string; title: string; prompt: string } | null;
        batchRoleIds?: string[];
        messageScope?: "public" | "batch_only";
      };
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

    const action = body.action;

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          message: "Saint action is required",
        },
        { status: 400 },
      );
    }

    const ground = readGroundData(groundId);

    if (!getSaintRole(ground)) {
      return NextResponse.json(
        {
          success: false,
          message: "No saint host exists in this ground",
        },
        { status: 400 },
      );
    }

    if (action === "propose_plan") {
      const plan = await proposeSaintPlan(ground, {
        dryRun: body.dryRun,
      });
      const updatedGround = writeGroundData(groundId, {
        ...ground,
        workflow: {
          ...ground.workflow,
          pending_plan: plan,
          pending_judgement: null,
        },
      });

      return NextResponse.json({
        success: true,
        action,
        ground: updatedGround,
        pending_plan: plan,
      });
    }

    if (action === "reject_plan") {
      const updatedGround = writeGroundData(groundId, {
        ...ground,
        workflow: {
          ...ground.workflow,
          pending_plan: null,
        },
      });

      return NextResponse.json({
        success: true,
        action,
        ground: updatedGround,
      });
    }

    if (action === "approve_plan") {
      const pendingPlan = ground.workflow.pending_plan;

      if (!pendingPlan) {
        return NextResponse.json(
          {
            success: false,
            message: "No pending saint plan to approve",
          },
          { status: 400 },
        );
      }

      const instructions = body.editedPlan?.instructions ?? pendingPlan.instructions;
      const event = body.editedPlan?.event ?? pendingPlan.event;
      const messageScope = body.editedPlan?.messageScope ?? pendingPlan.message_scope;
      const batchRoleIds = body.editedPlan?.batchRoleIds ?? resolvePlanBatchRoleIds(ground, pendingPlan);

      const cleanedGround = writeGroundData(groundId, {
        ...ground,
        workflow: {
          ...ground.workflow,
          pending_plan: null,
          pending_judgement: null,
        },
      });

      const { ground: executedGround, round } = await advanceGroundRound(cleanedGround, {
        instructions,
        event,
        batchRoleIds,
        messageScope,
        dryRun: body.dryRun,
      });

      let persistedGround = writeGroundData(groundId, {
        ...executedGround,
        workflow: {
          ...executedGround.workflow,
          pending_plan: null,
          pending_judgement: null,
        },
      });

      const judgement = await proposeSaintJudgement(persistedGround, round, {
        dryRun: body.dryRun,
      });

      persistedGround = writeGroundData(groundId, {
        ...persistedGround,
        workflow: {
          ...persistedGround.workflow,
          pending_plan: null,
          pending_judgement: judgement,
        },
      });

      return NextResponse.json({
        success: true,
        action,
        round,
        ground: persistedGround,
        pending_judgement: judgement,
      });
    }

    if (action === "approve_judgement") {
      const pendingJudgement = ground.workflow.pending_judgement;

      if (!pendingJudgement) {
        return NextResponse.json(
          {
            success: false,
            message: "No pending saint judgement to approve",
          },
          { status: 400 },
        );
      }

      const updatedGround = writeGroundData(
        groundId,
        applySaintJudgementToGround(ground, pendingJudgement),
      );

      return NextResponse.json({
        success: true,
        action,
        ground: updatedGround,
      });
    }

    if (action === "reject_judgement") {
      const updatedGround = writeGroundData(groundId, {
        ...ground,
        workflow: {
          ...ground.workflow,
          pending_judgement: null,
        },
      });

      return NextResponse.json({
        success: true,
        action,
        ground: updatedGround,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unsupported saint action",
      },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to process saint action",
      },
      { status: 500 },
    );
  }
}
