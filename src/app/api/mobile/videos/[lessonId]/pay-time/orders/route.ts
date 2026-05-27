import { NextResponse, type NextRequest } from "next/server";
import { createPayTimeOrder } from "@/lib/pay-time";
import { getPaymentSlipErrorMessage } from "@/lib/payment-slip-storage";
import { requireMobileStudent } from "@/lib/mobile-api";

export const runtime = "nodejs";

const PAY_TIME_ERROR_MESSAGES: Record<string, string> = {
  PAY_TIME_LESSON_NOT_FOUND: "ไม่พบบทเรียนที่เลือก",
  PAY_TIME_NOT_ENABLED: "บทเรียนนี้ยังไม่เปิดให้ซื้อเวลาดู",
  PAY_TIME_NEVER_ENROLLED: "ต้องเคยลงทะเบียนเรียนคอร์สนี้มาก่อนถึงจะซื้อเวลาดูได้",
  PAY_TIME_MISSING_CUSTOMER: "กรุณาระบุชื่อและอีเมลผู้สั่งซื้อ",
};

type Params = {
  params: {
    lessonId: string;
  };
};

function readString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

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
  const customerName =
    readString(formData.get("customerName")) || auth.user.name;
  const customerEmail =
    readString(formData.get("customerEmail")) || auth.user.email;
  const customerPhone = readString(formData.get("customerPhone"));
  const note = readString(formData.get("note"));
  const slipFile = formData.get("paymentSlip");

  if (!(slipFile instanceof File) || slipFile.size <= 0) {
    return NextResponse.json(
      { error: "MISSING_SLIP", message: "กรุณาแนบสลิปโอนเงิน" },
      { status: 400 },
    );
  }

  try {
    const order = await createPayTimeOrder({
      userId: auth.user.id,
      lessonId: params.lessonId,
      customerName,
      customerEmail,
      customerPhone: customerPhone || undefined,
      note: note || undefined,
      slipFile,
    });

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      priceCents: order.priceCentsSnapshot,
      hoursSnapshot: order.hoursSnapshot,
      currency: order.currency,
      expectedTotalThb: (order.priceCentsSnapshot / 100).toFixed(2),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const mapped = PAY_TIME_ERROR_MESSAGES[message];

    if (mapped) {
      return NextResponse.json(
        { error: message, message: mapped },
        { status: 400 },
      );
    }

    const slipMessage = getPaymentSlipErrorMessage(message);

    if (slipMessage) {
      return NextResponse.json(
        { error: message, message: slipMessage },
        { status: 400 },
      );
    }

    console.error("[mobile/pay-time/orders] failed", error);

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "ไม่สามารถสร้างคำสั่งซื้อได้" },
      { status: 500 },
    );
  }
}
