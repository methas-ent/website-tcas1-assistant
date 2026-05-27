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
  courseIds?: unknown;
};

type CheckoutPayload = {
  customerPhone: string | null;
  note: string | null;
  packageIds: string[];
  courseIds: string[];
  paymentSlip: File | null;
};

function normalizeIds(values: unknown[]) {
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
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
      packageIds: normalizeIds(formData.getAll("packageIds")),
      courseIds: normalizeIds(formData.getAll("courseIds")),
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
  const rawCourseIds = Array.isArray(body?.courseIds) ? body.courseIds : [];

  return {
    packageIds: normalizeIds(rawPackageIds),
    courseIds: normalizeIds(rawCourseIds),
    customerPhone: optionalString(body?.customerPhone),
    note: optionalString(body?.note),
    paymentSlip: null,
  };
}

function assertExactlyOneRef(refs: {
  packageId?: string | null;
  courseId?: string | null;
}) {
  if (Boolean(refs.packageId) === Boolean(refs.courseId)) {
    throw new Error(
      "OrderItem must reference exactly one of packageId or courseId",
    );
  }
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
  const { packageIds, courseIds } = checkout;

  if (!packageIds.length && !courseIds.length) {
    return NextResponse.json(
      { error: "ยังไม่มีรายการในตะกร้า" },
      { status: 400 },
    );
  }

  const [packages, courses] = await Promise.all([
    packageIds.length
      ? prisma.coursePackage.findMany({
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
        })
      : Promise.resolve(
          [] as Array<{
            id: string;
            title: string;
            priceCents: number;
            currency: string;
            items: { courseId: string }[];
          }>,
        ),
    courseIds.length
      ? prisma.course.findMany({
          where: {
            id: { in: courseIds },
            isPublished: true,
          },
          select: {
            id: true,
            title: true,
            priceCents: true,
            currency: true,
          },
        })
      : Promise.resolve(
          [] as Array<{
            id: string;
            title: string;
            priceCents: number;
            currency: string;
          }>,
        ),
  ]);

  if (packages.length !== packageIds.length) {
    return NextResponse.json(
      { error: "บางแพ็กเกจไม่พร้อมขายแล้ว กรุณาตรวจสอบตะกร้าอีกครั้ง" },
      { status: 400 },
    );
  }

  if (courses.length !== courseIds.length) {
    return NextResponse.json(
      { error: "บางคอร์สไม่พร้อมขายแล้ว กรุณาตรวจสอบตะกร้าอีกครั้ง" },
      { status: 400 },
    );
  }

  const currencies = new Set<string>([
    ...packages.map((pkg) => pkg.currency),
    ...courses.map((course) => course.currency),
  ]);

  if (currencies.size > 1) {
    return NextResponse.json(
      { error: "ยังไม่รองรับตะกร้าหลายสกุลเงิน" },
      { status: 400 },
    );
  }

  const currency =
    packages[0]?.currency ?? courses[0]?.currency ?? "THB";

  if (packages.some((coursePackage) => coursePackage.items.length === 0)) {
    return NextResponse.json(
      { error: "บางแพ็กเกจยังไม่มีคอร์ส กรุณาตรวจสอบตะกร้าอีกครั้ง" },
      { status: 400 },
    );
  }

  const totalCents =
    packages.reduce((sum, pkg) => sum + pkg.priceCents, 0) +
    courses.reduce((sum, course) => sum + course.priceCents, 0);

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

  const packageItems = packages.map((coursePackage) => {
    assertExactlyOneRef({ packageId: coursePackage.id, courseId: null });
    return {
      packageId: coursePackage.id,
      courseId: null,
      titleSnapshot: coursePackage.title,
      priceCentsSnapshot: coursePackage.priceCents,
      courseIdsSnapshotJson: JSON.stringify(
        Array.from(new Set(coursePackage.items.map((item) => item.courseId))),
      ),
    };
  });

  const courseItems = courses.map((course) => {
    assertExactlyOneRef({ packageId: null, courseId: course.id });
    return {
      packageId: null,
      courseId: course.id,
      titleSnapshot: course.title,
      priceCentsSnapshot: course.priceCents,
      courseIdsSnapshotJson: JSON.stringify([course.id]),
    };
  });

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
        create: [...packageItems, ...courseItems],
      },
    },
    select: { id: true },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");

  return NextResponse.json({ orderId: order.id, status: "PENDING_REVIEW" });
}
