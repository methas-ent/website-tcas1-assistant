"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/db";

function parseCourseIdsSnapshot(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (courseId): courseId is string =>
        typeof courseId === "string" && courseId.length > 0,
    );
  } catch {
    return [];
  }
}

export async function markOrderPaidAction(formData: FormData) {
  await requireAdmin("/admin/orders");

  const orderId = String(formData.get("orderId") ?? "");

  if (!orderId) {
    redirect("/admin/orders");
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            coursePackage: {
              include: {
                items: {
                  select: {
                    courseId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order || order.status === "CANCELLED") {
      return;
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: order.paidAt ?? new Date(),
      },
    });

    for (const orderItem of order.items) {
      const snapshotCourseIds = parseCourseIdsSnapshot(
        orderItem.courseIdsSnapshotJson,
      );
      const fallbackCourseIds = orderItem.coursePackage.items.map(
        (item) => item.courseId,
      );
      const courseIds = Array.from(
        new Set(snapshotCourseIds.length > 0 ? snapshotCourseIds : fallbackCourseIds),
      );

      for (const courseId of courseIds) {
        await tx.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: order.userId,
              courseId,
            },
          },
          create: {
            userId: order.userId,
            courseId,
            orderId: order.id,
            orderItemId: orderItem.id,
            status: "ACTIVE",
          },
          update: {
            status: "ACTIVE",
          },
        });
      }
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}`);
}

export async function cancelOrderAction(formData: FormData) {
  await requireAdmin("/admin/orders");

  const orderId = String(formData.get("orderId") ?? "");

  if (!orderId) {
    redirect("/admin/orders");
  }

  await prisma.order.updateMany({
    where: {
      id: orderId,
      status: { not: "PAID" },
    },
    data: {
      status: "CANCELLED",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}`);
}
