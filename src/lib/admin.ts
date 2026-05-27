import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import prisma from "@/lib/db";

export type AdminOrderStatus =
  | "PENDING_PAYMENT"
  | "PENDING_REVIEW"
  | "PAID"
  | "CANCELLED";

export const adminOrderStatuses: AdminOrderStatus[] = [
  "PENDING_PAYMENT",
  "PENDING_REVIEW",
  "PAID",
  "CANCELLED",
];

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING_PAYMENT: "รอชำระเงิน",
    PENDING_REVIEW: "รอตรวจสอบ",
    PAID: "ชำระแล้ว",
    CANCELLED: "ยกเลิก",
  };

  return labels[status] ?? status;
}

export async function requireAdmin(next = "/admin") {
  const user = await getCurrentUser();

  if (!isAdmin(user)) {
    const error = user ? "forbidden" : "required";
    redirect(`/admin/login?error=${error}&next=${encodeURIComponent(next)}`);
  }

  return user!;
}

export async function getAdminDashboard() {
  const [
    totalOrders,
    paidOrders,
    pendingOrders,
    pendingSlipReviews,
    totalStudents,
    totalCourses,
    totalPackages,
    paidOrderItems,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({
      where: { status: { in: ["PENDING_PAYMENT", "PENDING_REVIEW"] } },
    }),
    prisma.order.count({
      where: {
        status: "PENDING_REVIEW",
        paymentSlipStorageKey: { not: null },
      },
    }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.course.count(),
    prisma.coursePackage.count(),
    prisma.orderItem.findMany({
      where: { order: { status: "PAID" } },
      select: {
        courseId: true,
        coursePackage: {
          select: {
            items: {
              select: { courseId: true },
            },
          },
        },
      },
    }),
  ]);
  const purchasedCourseIds = new Set(
    paidOrderItems.flatMap((item) => {
      if (item.coursePackage) {
        return item.coursePackage.items.map(
          (packageItem) => packageItem.courseId,
        );
      }
      return item.courseId ? [item.courseId] : [];
    }),
  );

  return {
    totalOrders,
    paidOrders,
    pendingOrders,
    pendingSlipReviews,
    totalStudents,
    totalCourses,
    totalPackages,
    purchasedPackages: paidOrderItems.length,
    purchasedCourses: purchasedCourseIds.size,
  };
}

export async function getAdminOrders(status?: string) {
  const safeStatus = adminOrderStatuses.includes(status as AdminOrderStatus)
    ? (status as AdminOrderStatus)
    : undefined;

  return prisma.order.findMany({
    where: safeStatus ? { status: safeStatus } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          coursePackage: {
            select: {
              title: true,
              items: {
                select: {
                  courseId: true,
                },
              },
            },
          },
        },
      },
      user: {
        select: {
          email: true,
          name: true,
        },
      },
      enrollments: {
        select: { id: true },
      },
    },
  });
}

export async function getAdminOrderDetail(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      items: {
        include: {
          coursePackage: {
            include: {
              items: {
                orderBy: { sortOrder: "asc" },
                include: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      category: true,
                      level: true,
                    },
                  },
                },
              },
            },
          },
          enrollments: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      },
      enrollments: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });
}
