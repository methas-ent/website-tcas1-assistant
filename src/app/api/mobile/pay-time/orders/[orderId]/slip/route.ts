import { NextResponse, type NextRequest } from "next/server";
import { replacePayTimeOrderSlip } from "@/lib/pay-time";
import { getPaymentSlipErrorMessage } from "@/lib/payment-slip-storage";
import { requireMobileStudent } from "@/lib/mobile-api";

export const runtime = "nodejs";

const PAY_TIME_ERROR_MESSAGES: Record<string, string> = {
  PAY_TIME_ORDER_NOT_FOUND: "ไม่พบคำสั่งซื้อนี้",
  PAY_TIME_ORDER_NOT_PENDING: "คำสั่งซื้อนี้ไม่ได้อยู่ในสถานะรอตรวจสอบแล้ว",
};

type Params = {
  params: {
    orderId: string;
  };
};

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireMobileStudent(request);

  if (!auth.ok) {
    return auth.response;
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "INVALID_PAYLOAD", message: "ต้องส่งคำขอเป็น multipart/form-data" },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const slipFile = formData.get("paymentSlip");

  if (!(slipFile instanceof File) || slipFile.size <= 0) {
    return NextResponse.json(
      { error: "MISSING_SLIP", message: "กรุณาแนบสลิปโอนเงิน" },
      { status: 400 },
    );
  }

  try {
    const order = await replacePayTimeOrderSlip({
      userId: auth.user.id,
      orderId: params.orderId,
      slipFile,
    });

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      paymentSlipUploadedAt: order.paymentSlipUploadedAt?.toISOString() ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const mapped = PAY_TIME_ERROR_MESSAGES[message];

    if (mapped) {
      return NextResponse.json(
        { error: message, message: mapped },
        { status: message === "PAY_TIME_ORDER_NOT_FOUND" ? 404 : 400 },
      );
    }

    const slipMessage = getPaymentSlipErrorMessage(message);

    if (slipMessage) {
      return NextResponse.json(
        { error: message, message: slipMessage },
        { status: 400 },
      );
    }

    console.error("[mobile/pay-time/orders/slip] failed", error);

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "ไม่สามารถอัปเดตสลิปได้" },
      { status: 500 },
    );
  }
}
