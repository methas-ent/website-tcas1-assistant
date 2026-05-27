import { NextResponse } from "next/server";
import { getCurrentUser, isStudent } from "@/lib/auth";
import { createPayTimeOrder } from "@/lib/pay-time";
import { getPaymentSlipErrorMessage } from "@/lib/payment-slip-storage";

export const runtime = "nodejs";

const PAY_TIME_ERROR_MESSAGES: Record<string, string> = {
  PAY_TIME_LESSON_NOT_FOUND: "ไม่พบบทเรียนที่เลือก",
  PAY_TIME_NOT_ENABLED: "บทเรียนนี้ยังไม่เปิดให้ซื้อเวลาดู",
  PAY_TIME_NEVER_ENROLLED: "ต้องเคยลงทะเบียนเรียนคอร์สนี้มาก่อนถึงจะซื้อเวลาดูได้",
  PAY_TIME_MISSING_CUSTOMER: "กรุณาระบุชื่อและอีเมลผู้สั่งซื้อ",
};

function readString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !isStudent(user)) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบด้วยบัญชีนักเรียน" },
      { status: 401 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "INVALID_PAYLOAD", message: "ต้องส่งคำขอเป็น multipart/form-data" },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const lessonId = readString(formData.get("lessonId"));
  const customerName =
    readString(formData.get("customerName")) || user.name;
  const customerEmail =
    readString(formData.get("customerEmail")) || user.email;
  const customerPhoneRaw = readString(formData.get("customerPhone"));
  const noteRaw = readString(formData.get("note"));
  const slipFile = formData.get("paymentSlip");

  if (!lessonId) {
    return NextResponse.json(
      { error: "MISSING_LESSON", message: "ไม่พบรหัสบทเรียน" },
      { status: 400 },
    );
  }

  if (!(slipFile instanceof File) || slipFile.size <= 0) {
    return NextResponse.json(
      { error: "MISSING_SLIP", message: "กรุณาแนบสลิปโอนเงิน" },
      { status: 400 },
    );
  }

  try {
    const order = await createPayTimeOrder({
      userId: user.id,
      lessonId,
      customerName,
      customerEmail,
      customerPhone: customerPhoneRaw || undefined,
      note: noteRaw || undefined,
      slipFile,
    });

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      priceCents: order.priceCentsSnapshot,
      hoursSnapshot: order.hoursSnapshot,
      expectedTotalThb: (order.priceCentsSnapshot / 100).toFixed(2),
      currency: order.currency,
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

    console.error("[pay-time/checkout] failed", error);

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "ไม่สามารถสร้างคำสั่งซื้อได้" },
      { status: 500 },
    );
  }
}
