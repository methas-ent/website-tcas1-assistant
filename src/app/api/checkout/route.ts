import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser, isStudent } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  getPaymentSlipErrorMessage,
  savePaymentSlip,
} from "@/lib/payment-slip-storage";

type CheckoutRequestBody = {
  customerPhone?: unknown;
  note?: unknown;
  packageIds?: unknown;
};

type CheckoutPayload = {
  customerPhone: string | null;
  note: string | null;
  packageIds: string[];
  paymentSlip: File | null;
};

function normalizePackageIds(values: unknown[]) {
  return Array.from(
    new Set(
      values.filter(
        (packageId): packageId is string =>
          typeof packageId === "string" && packageId.length > 0,
      ),
    ),
  );
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function readCheckoutPayload(request: Request): Promise<CheckoutPayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const paymentSlip = formData.get("paymentSlip");

    return {
      packageIds: normalizePackageIds(formData.getAll("packageIds")),
      customerPhone: optionalString(formData.get("customerPhone")),
      note: optionalString(formData.get("note")),
      paymentSlip: paymentSlip instanceof File ? paymentSlip : null,
    };
  }

  const body = (await request.json().catch(() => null)) as
    | CheckoutRequestBody
    | null;
  const rawPackageIds = Array.isArray(body?.packageIds)
    ? body.packageIds
    : [];

  return {
    packageIds: normalizePackageIds(rawPackageIds),
    customerPhone: optionalString(body?.customerPhone),
    note: optionalString(body?.note),
    paymentSlip: null,
  };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!isStudent(user)) {
    return NextResponse.json(
      { error: "กรุณาเข้าสู่ระบบด้วยบัญชีนักเรียนก่อน checkout" },
      { status: 401 },
    );
  }

  const checkout = await readCheckoutPayload(request);
  const packageIds = checkout.packageIds;

  if (!packageIds.length) {
    return NextResponse.json(
      { error: "ยังไม่มีแพ็กเกจในตะกร้า" },
      { status: 400 },
    );
  }

  const packages = await prisma.coursePackage.findMany({
    where: {
      id: { in: packageIds },
      isPublished: true,
    },
    select: {
      id: true,
      title: true,
      priceCents: true,
      currency: true,
      items: {
        select: {
          courseId: true,
        },
      },
    },
  });

  if (packages.length !== packageIds.length) {
    return NextResponse.json(
      { error: "บางแพ็กเกจไม่พร้อมขายแล้ว กรุณาตรวจสอบตะกร้าอีกครั้ง" },
      { status: 400 },
    );
  }

  const currency = packages[0]?.currency ?? "THB";

  if (packages.some((coursePackage) => coursePackage.currency !== currency)) {
    return NextResponse.json(
      { error: "ยังไม่รองรับตะกร้าหลายสกุลเงิน" },
      { status: 400 },
    );
  }

  if (packages.some((coursePackage) => coursePackage.items.length === 0)) {
    return NextResponse.json(
      { error: "บางแพ็กเกจยังไม่มีคอร์ส กรุณาตรวจสอบตะกร้าอีกครั้ง" },
      { status: 400 },
    );
  }

  const totalCents = packages.reduce(
    (sum, coursePackage) => sum + coursePackage.priceCents,
    0,
  );

  if (!checkout.paymentSlip) {
    return NextResponse.json(
      { error: "กรุณาแนบสลิปโอนเงินก่อนส่งคำสั่งซื้อ" },
      { status: 400 },
    );
  }

  let paymentSlip;

  try {
    paymentSlip = await savePaymentSlip(checkout.paymentSlip);
  } catch (error) {
    const code = error instanceof Error ? error.message : "storage";

    return NextResponse.json(
      { error: getPaymentSlipErrorMessage(code) ?? "บันทึกสลิปไม่สำเร็จ" },
      { status: 400 },
    );
  }

  const order = await prisma.order.create({
    data: {
      userId: user!.id,
      status: "PENDING_REVIEW",
      totalCents,
      currency,
      customerName: user!.name,
      customerEmail: user!.email,
      customerPhone: checkout.customerPhone,
      note: checkout.note,
      paymentSlipStorageKey: paymentSlip.storageKey,
      paymentSlipOriginalFileName: paymentSlip.originalFileName,
      paymentSlipMimeType: paymentSlip.mimeType,
      paymentSlipSizeBytes: paymentSlip.sizeBytes,
      paymentSlipUploadedAt: new Date(),
      items: {
        create: packages.map((coursePackage) => ({
          packageId: coursePackage.id,
          titleSnapshot: coursePackage.title,
          priceCentsSnapshot: coursePackage.priceCents,
          courseIdsSnapshotJson: JSON.stringify(
            Array.from(new Set(coursePackage.items.map((item) => item.courseId))),
          ),
        })),
      },
    },
    select: { id: true },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");

  return NextResponse.json({ orderId: order.id, status: "PENDING_REVIEW" });
}
