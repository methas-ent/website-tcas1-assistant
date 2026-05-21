import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser, isStudent } from "@/lib/auth";
import prisma from "@/lib/db";

type CheckoutRequestBody = {
  customerPhone?: unknown;
  note?: unknown;
  packageIds?: unknown;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!isStudent(user)) {
    return NextResponse.json(
      { error: "กรุณาเข้าสู่ระบบด้วยบัญชีนักเรียนก่อน checkout" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | CheckoutRequestBody
    | null;
  const rawPackageIds = Array.isArray(body?.packageIds)
    ? body.packageIds
    : [];
  const packageIds = Array.from(
    new Set(
      rawPackageIds.filter(
        (packageId): packageId is string =>
          typeof packageId === "string" && packageId.length > 0,
      ),
    ),
  );

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
  const customerPhone =
    typeof body?.customerPhone === "string" && body.customerPhone.trim()
      ? body.customerPhone.trim()
      : null;
  const note =
    typeof body?.note === "string" && body.note.trim()
      ? body.note.trim()
      : null;

  const order = await prisma.order.create({
    data: {
      userId: user!.id,
      status: "PENDING_REVIEW",
      totalCents,
      currency,
      customerName: user!.name,
      customerEmail: user!.email,
      customerPhone,
      note,
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
