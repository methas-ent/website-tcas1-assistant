"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/db";
import {
  approvePayTimeOrder,
  rejectPayTimeOrder,
} from "@/lib/pay-time";

// ---------------------------------------------------------------------------
// Helpers (mirrors admin-catalog-actions.ts style)
// ---------------------------------------------------------------------------

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function revalidatePayTimePaths(courseId?: string | null) {
  revalidatePath("/admin/pay-time");
  if (courseId) {
    revalidatePath(`/admin/courses/${courseId}/edit`);
  }
}

// ---------------------------------------------------------------------------
// Approve
// ---------------------------------------------------------------------------

/**
 * Approve a Pay Time order. Idempotent — calling twice with the same orderId
 * redirects with `?info=already-approved` instead of throwing.
 */
export async function approvePayTimeOrderAction(orderId: string): Promise<void> {
  return approvePayTimeOrderById(orderId);
}

/**
 * FormData-friendly wrapper around `approvePayTimeOrderAction`. Allows the
 * approve button to be a plain `<form action={...}>` with a hidden orderId.
 */
export async function approvePayTimeOrderFormAction(
  formData: FormData,
): Promise<void> {
  const orderId = text(formData, "orderId");
  return approvePayTimeOrderById(orderId);
}

async function approvePayTimeOrderById(orderId: string): Promise<void> {
  const admin = await requireAdmin(`/admin/pay-time/${orderId}`);

  if (!orderId) {
    redirect("/admin/pay-time");
  }

  const existing = await prisma.payTimeOrder.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, courseIdSnapshot: true },
  });

  if (!existing) {
    redirect("/admin/pay-time?error=not-found");
  }

  const courseId = existing.courseIdSnapshot;

  let alreadyApplied = false;

  try {
    const result = await approvePayTimeOrder({
      orderId,
      adminUserId: admin.id,
    });
    alreadyApplied = result.alreadyApplied;
  } catch (error) {
    const code = error instanceof Error ? error.message : "unknown";

    if (code === "PAY_TIME_ORDER_ALREADY_REJECTED") {
      revalidatePayTimePaths(courseId);
      redirect(`/admin/pay-time/${orderId}?error=already-rejected`);
    }

    if (code === "PAY_TIME_ORDER_NOT_FOUND") {
      redirect("/admin/pay-time?error=not-found");
    }

    console.error("admin.pay_time.approve_failed", {
      adminUserId: admin.id,
      orderId,
      code,
    });
    redirect(`/admin/pay-time/${orderId}?error=approve-failed`);
  }

  console.info("admin.pay_time.approve", {
    adminUserId: admin.id,
    orderId,
    alreadyApplied,
  });

  revalidatePayTimePaths(courseId);

  if (alreadyApplied) {
    redirect(`/admin/pay-time/${orderId}?info=already-approved`);
  }

  redirect(`/admin/pay-time/${orderId}?info=approved`);
}

// ---------------------------------------------------------------------------
// Reject
// ---------------------------------------------------------------------------

export async function rejectPayTimeOrderAction(formData: FormData): Promise<void> {
  const orderId = text(formData, "orderId");
  const admin = await requireAdmin(`/admin/pay-time/${orderId}`);

  if (!orderId) {
    redirect("/admin/pay-time");
  }

  const reason = optionalText(formData, "reason") ?? undefined;

  const existing = await prisma.payTimeOrder.findUnique({
    where: { id: orderId },
    select: { id: true, courseIdSnapshot: true },
  });

  if (!existing) {
    redirect("/admin/pay-time?error=not-found");
  }

  try {
    await rejectPayTimeOrder({
      orderId,
      adminUserId: admin.id,
      reason,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "unknown";

    if (code === "PAY_TIME_ORDER_ALREADY_APPROVED") {
      revalidatePayTimePaths(existing.courseIdSnapshot);
      redirect(`/admin/pay-time/${orderId}?error=already-approved`);
    }

    if (code === "PAY_TIME_ORDER_NOT_FOUND") {
      redirect("/admin/pay-time?error=not-found");
    }

    console.error("admin.pay_time.reject_failed", {
      adminUserId: admin.id,
      orderId,
      code,
    });
    redirect(`/admin/pay-time/${orderId}?error=reject-failed`);
  }

  console.info("admin.pay_time.reject", {
    adminUserId: admin.id,
    orderId,
    hasReason: Boolean(reason),
  });

  revalidatePayTimePaths(existing.courseIdSnapshot);
  redirect(`/admin/pay-time/${orderId}?info=rejected`);
}

// ---------------------------------------------------------------------------
// Per-lesson Pay Time config
// ---------------------------------------------------------------------------

const MAX_PAY_TIME_HOURS = 720; // 30 days

function parseBooleanField(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim().toLowerCase();
  return raw === "true" || raw === "on" || raw === "1";
}

/**
 * Persist the per-lesson Pay Time settings. Validates price and hours.
 *
 * Expected fields:
 *  - lessonId: string
 *  - payTimeEnabled: "true" | "false" | "on" | missing
 *  - payTimePrice: THB (decimal string)
 *  - payTimeHours: integer 1..720
 *  - payTimeDescription: optional string
 */
export async function updateLessonPayTimeConfigAction(
  formData: FormData,
): Promise<void> {
  // Gate on admin before any DB lookup. We don't know the courseId yet, so
  // start with the safe `/admin` next URL; once we resolve the lesson we
  // continue using the course edit path for subsequent redirects.
  const admin = await requireAdmin("/admin/pay-time");

  const lessonId = text(formData, "lessonId");

  if (!lessonId) {
    redirect("/admin/pay-time?error=invalid-pay-time-config");
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true },
  });

  if (!lesson) {
    redirect("/admin/pay-time?error=not-found");
  }

  const courseId = lesson.courseId;
  const redirectPath = `/admin/courses/${courseId}/edit`;

  const enabled = parseBooleanField(formData, "payTimeEnabled");
  const priceRaw = text(formData, "payTimePrice").replace(/,/g, "");
  const hoursRaw = text(formData, "payTimeHours");
  const description = optionalText(formData, "payTimeDescription");

  const parsedPrice = Number.parseFloat(priceRaw);
  const priceCents =
    Number.isFinite(parsedPrice) && parsedPrice >= 0
      ? Math.round(parsedPrice * 100)
      : -1;

  const parsedHours = Number.parseInt(hoursRaw, 10);
  const hours = Number.isFinite(parsedHours) ? parsedHours : 0;

  if (priceCents < 0) {
    redirect(`${redirectPath}?error=invalid-pay-time-price`);
  }

  if (hours <= 0 || hours > MAX_PAY_TIME_HOURS) {
    redirect(`${redirectPath}?error=invalid-pay-time-hours`);
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      payTimeEnabled: enabled,
      payTimePriceCents: priceCents,
      payTimeHours: hours,
      payTimeDescription: description,
    },
  });

  console.info("admin.pay_time.lesson_config_update", {
    adminUserId: admin.id,
    lessonId,
    enabled,
    priceCents,
    hours,
  });

  revalidatePath(redirectPath);
  revalidatePath("/admin/pay-time");
  redirect(`${redirectPath}?saved=pay-time`);
}
