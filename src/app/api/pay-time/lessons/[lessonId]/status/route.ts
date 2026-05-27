import { NextResponse } from "next/server";
import { getCurrentUser, isStudent } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  evaluatePayTimeEligibility,
  findActiveExtension,
  PAY_TIME_STATUS,
} from "@/lib/pay-time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: {
    lessonId: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();

  if (!user || !isStudent(user)) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบด้วยบัญชีนักเรียน" },
      { status: 401 },
    );
  }

  const eligibility = await evaluatePayTimeEligibility({
    userId: user.id,
    lessonId: params.lessonId,
  });

  const [activeExtension, pendingOrder] = await Promise.all([
    findActiveExtension({ userId: user.id, lessonId: params.lessonId }),
    prisma.payTimeOrder.findFirst({
      where: {
        userId: user.id,
        lessonId: params.lessonId,
        status: PAY_TIME_STATUS.PENDING,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
  ]);

  if (eligibility.kind === "OK") {
    return NextResponse.json({
      eligibility: "OK",
      lessonId: eligibility.lesson.id,
      priceCents: eligibility.priceCents,
      hours: eligibility.hours,
      currency: "THB",
      description: eligibility.lesson.payTimeDescription ?? null,
      activeExtension: activeExtension
        ? {
            expiresAt: activeExtension.expiresAt.toISOString(),
            hoursGranted: activeExtension.hoursGranted,
          }
        : null,
      pendingOrderId: pendingOrder?.id ?? null,
    });
  }

  return NextResponse.json({
    eligibility: eligibility.kind,
    lessonId: params.lessonId,
    priceCents: 0,
    hours: 0,
    currency: "THB",
    description: null,
    activeExtension: activeExtension
      ? {
          expiresAt: activeExtension.expiresAt.toISOString(),
          hoursGranted: activeExtension.hoursGranted,
        }
      : null,
    pendingOrderId: pendingOrder?.id ?? null,
  });
}
