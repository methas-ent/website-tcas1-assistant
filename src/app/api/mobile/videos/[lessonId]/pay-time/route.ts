import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/db";
import {
  evaluatePayTimeEligibility,
  findActiveExtension,
  PAY_TIME_STATUS,
} from "@/lib/pay-time";
import { requireMobileStudent } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: {
    lessonId: string;
  };
};

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireMobileStudent(request);

  if (!auth.ok) {
    return auth.response;
  }

  const eligibility = await evaluatePayTimeEligibility({
    userId: auth.user.id,
    lessonId: params.lessonId,
  });

  const [activeExtension, pendingOrder] = await Promise.all([
    findActiveExtension({ userId: auth.user.id, lessonId: params.lessonId }),
    prisma.payTimeOrder.findFirst({
      where: {
        userId: auth.user.id,
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
