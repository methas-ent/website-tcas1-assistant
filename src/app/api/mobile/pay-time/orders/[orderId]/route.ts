import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireMobileStudent } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: {
    orderId: string;
  };
};

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireMobileStudent(request);

  if (!auth.ok) {
    return auth.response;
  }

  const order = await prisma.payTimeOrder.findUnique({
    where: { id: params.orderId },
    select: {
      id: true,
      userId: true,
      lessonId: true,
      status: true,
      priceCentsSnapshot: true,
      hoursSnapshot: true,
      currency: true,
      titleSnapshot: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      note: true,
      createdAt: true,
      approvedAt: true,
      rejectedAt: true,
      appliedAt: true,
      extension: {
        select: {
          id: true,
          expiresAt: true,
          startsAt: true,
          hoursGranted: true,
          status: true,
        },
      },
    },
  });

  if (!order || order.userId !== auth.user.id) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "ไม่พบคำสั่งซื้อ" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    order: {
      id: order.id,
      lessonId: order.lessonId,
      status: order.status,
      priceCents: order.priceCentsSnapshot,
      hours: order.hoursSnapshot,
      currency: order.currency,
      title: order.titleSnapshot,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      note: order.note,
      createdAt: order.createdAt.toISOString(),
      approvedAt: order.approvedAt?.toISOString() ?? null,
      rejectedAt: order.rejectedAt?.toISOString() ?? null,
      appliedAt: order.appliedAt?.toISOString() ?? null,
      extension: order.extension
        ? {
            id: order.extension.id,
            expiresAt: order.extension.expiresAt.toISOString(),
            startsAt: order.extension.startsAt.toISOString(),
            hoursGranted: order.extension.hoursGranted,
            status: order.extension.status,
          }
        : null,
    },
  });
}
