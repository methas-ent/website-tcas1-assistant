/**
 * Pay Time (per-video viewing extension) — service layer.
 *
 * Pay Time lets a student pay to extend their viewing window on a single
 * lesson video, even after their course enrollment has expired. The flow:
 *   1. Student requests an extension on an eligible lesson.
 *      → `createPayTimeOrder` snapshots price/hours and stores the slip.
 *   2. Admin reviews the slip and either approves or rejects.
 *      → `approvePayTimeOrder` writes a `VideoAccessExtension` row whose
 *        `expiresAt` is consulted by `authorizeLessonPlayback` as a
 *        supplemental access check.
 *
 * Pay Time is *supplemental*. It never downgrades enrollment-based access,
 * never bypasses `isPublished`, and never grants access to lessons the user
 * was never enrolled in (the eligibility rule).
 *
 * Schema reference: prisma/schema.prisma — `PayTimeOrder`,
 * `VideoAccessExtension`, plus `Lesson.payTime*` fields.
 */

import type { Lesson, PayTimeOrder, VideoAccessExtension } from "@prisma/client";
import prisma from "@/lib/db";
import {
  savePaymentSlip,
  type StoredPaymentSlip,
} from "@/lib/payment-slip-storage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Discriminator constant for Pay Time orders. Kept here (not in the schema)
 * so the existing `Order` model and checkout flow remain untouched. Use it
 * anywhere the codebase would otherwise hardcode the string literal.
 */
export const PAY_TIME_ORDER_KIND = "VIDEO_TIME_EXTENSION" as const;

export const PAY_TIME_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const PAY_TIME_EXTENSION_STATUS = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
} as const;

export type PayTimeOrderStatus =
  (typeof PAY_TIME_STATUS)[keyof typeof PAY_TIME_STATUS];

export type PayTimeExtensionStatus =
  (typeof PAY_TIME_EXTENSION_STATUS)[keyof typeof PAY_TIME_EXTENSION_STATUS];

/**
 * Sub-folder passed to `savePaymentSlip` so Pay Time slips land under
 * `pay-time/YYYY/MM/...` and never collide with course-checkout slips.
 */
const PAY_TIME_SLIP_SUBFOLDER = "pay-time";

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

/**
 * Snapshot of the eligibility lesson fields needed by callers (price modal,
 * order creation, admin display). Kept narrow so we don't leak more than
 * we need.
 */
export type PayTimeEligibleLesson = {
  id: string;
  title: string;
  courseId: string;
  payTimeEnabled: boolean;
  payTimePriceCents: number;
  payTimeHours: number;
  payTimeDescription: string | null;
};

export type PayTimeEligibility =
  | {
      kind: "OK";
      lesson: PayTimeEligibleLesson;
      priceCents: number;
      hours: number;
    }
  | { kind: "LESSON_NOT_FOUND" }
  | { kind: "NOT_ENABLED" }
  | { kind: "NEVER_ENROLLED" };

/**
 * Decide whether `userId` may purchase Pay Time on `lessonId`.
 *
 * Rules (kept conservative on purpose):
 *  - Lesson must exist and be published.
 *  - Lesson must have Pay Time enabled with a positive price and a positive
 *    duration in hours.
 *  - The user must have, or *have had*, an Enrollment for the lesson's
 *    course — Pay Time is a top-up, not a first-time purchase channel.
 *    `expiresAt` is intentionally ignored so post-expiry users can extend.
 */
export async function evaluatePayTimeEligibility(args: {
  userId: string;
  lessonId: string;
}): Promise<PayTimeEligibility> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: args.lessonId },
    select: {
      id: true,
      title: true,
      courseId: true,
      isPublished: true,
      payTimeEnabled: true,
      payTimePriceCents: true,
      payTimeHours: true,
      payTimeDescription: true,
    },
  });

  if (!lesson || !lesson.isPublished) {
    return { kind: "LESSON_NOT_FOUND" };
  }

  if (
    !lesson.payTimeEnabled ||
    lesson.payTimePriceCents <= 0 ||
    lesson.payTimeHours <= 0
  ) {
    return { kind: "NOT_ENABLED" };
  }

  // Any enrollment (past or present) qualifies — Pay Time is supplemental.
  const everEnrolled = await prisma.enrollment.findFirst({
    where: { userId: args.userId, courseId: lesson.courseId },
    select: { id: true },
  });

  if (!everEnrolled) {
    return { kind: "NEVER_ENROLLED" };
  }

  return {
    kind: "OK",
    lesson: {
      id: lesson.id,
      title: lesson.title,
      courseId: lesson.courseId,
      payTimeEnabled: lesson.payTimeEnabled,
      payTimePriceCents: lesson.payTimePriceCents,
      payTimeHours: lesson.payTimeHours,
      payTimeDescription: lesson.payTimeDescription,
    },
    priceCents: lesson.payTimePriceCents,
    hours: lesson.payTimeHours,
  };
}

// ---------------------------------------------------------------------------
// Active extension lookup
// ---------------------------------------------------------------------------

/**
 * Find the user's currently active (non-expired) Pay Time extension for a
 * lesson, if any. Returns the row with the latest `expiresAt`.
 *
 * NOTE: the "live" check is `expiresAt > now`. The textual `status`
 * column ("ACTIVE" / "EXPIRED" / "REVOKED") is informational; we treat
 * "REVOKED" as a hard stop but otherwise rely on `expiresAt`.
 */
export async function findActiveExtension(args: {
  userId: string;
  lessonId: string;
}): Promise<VideoAccessExtension | null> {
  return prisma.videoAccessExtension.findFirst({
    where: {
      userId: args.userId,
      lessonId: args.lessonId,
      expiresAt: { gt: new Date() },
      status: { not: PAY_TIME_EXTENSION_STATUS.REVOKED },
    },
    orderBy: { expiresAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Approval / rejection
// ---------------------------------------------------------------------------

export type ApprovePayTimeOrderResult = {
  extension: VideoAccessExtension;
  alreadyApplied: boolean;
};

/**
 * Approve a `PayTimeOrder` and create the resulting `VideoAccessExtension`
 * atomically. Idempotent: calling twice returns `alreadyApplied: true` on
 * the second call.
 *
 * Failure modes (thrown):
 *   - `PAY_TIME_ORDER_NOT_FOUND` — no such order.
 *   - `PAY_TIME_ORDER_ALREADY_REJECTED` — order was rejected; admins must
 *     create a new order rather than flip a rejection.
 *
 * Idempotency proof: the early-return on `status === APPROVED` returns the
 * existing extension. Even if two admins race past that check, the DB-level
 * `VideoAccessExtension.payTimeOrderId @unique` constraint (see
 * `prisma/schema.prisma`) makes the second `create` throw, which rolls back
 * the transaction. The caller can safely retry — the second attempt sees
 * `APPROVED` and short-circuits.
 */
export async function approvePayTimeOrder(args: {
  orderId: string;
  adminUserId: string;
}): Promise<ApprovePayTimeOrderResult> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const order = await tx.payTimeOrder.findUnique({
      where: { id: args.orderId },
      include: { extension: true },
    });

    if (!order) {
      throw new Error("PAY_TIME_ORDER_NOT_FOUND");
    }

    // Idempotent fast path — order is already APPROVED and has an extension.
    if (order.status === PAY_TIME_STATUS.APPROVED && order.extension) {
      return { extension: order.extension, alreadyApplied: true };
    }

    if (order.status === PAY_TIME_STATUS.REJECTED) {
      throw new Error("PAY_TIME_ORDER_ALREADY_REJECTED");
    }

    // Stack on top of any existing active extension so users don't lose
    // time they already paid for. If nothing is active, start from `now`.
    const existing = await tx.videoAccessExtension.findFirst({
      where: {
        userId: order.userId,
        lessonId: order.lessonId,
        expiresAt: { gt: now },
        status: { not: PAY_TIME_EXTENSION_STATUS.REVOKED },
      },
      orderBy: { expiresAt: "desc" },
      select: { expiresAt: true },
    });
    const baseExpiresAt =
      existing && existing.expiresAt > now ? existing.expiresAt : now;
    const expiresAt = new Date(
      baseExpiresAt.getTime() + order.hoursSnapshot * 60 * 60 * 1000,
    );

    const extension = await tx.videoAccessExtension.create({
      data: {
        userId: order.userId,
        lessonId: order.lessonId,
        payTimeOrderId: order.id,
        hoursGranted: order.hoursSnapshot,
        startsAt: now,
        expiresAt,
        status: PAY_TIME_EXTENSION_STATUS.ACTIVE,
      },
    });

    await tx.payTimeOrder.update({
      where: { id: order.id },
      data: {
        status: PAY_TIME_STATUS.APPROVED,
        approvedById: args.adminUserId,
        approvedAt: now,
        appliedAt: now,
      },
    });

    return { extension, alreadyApplied: false };
  });
}

/**
 * Reject a PENDING Pay Time order. No `VideoAccessExtension` is created.
 * Already-rejected orders are a no-op; APPROVED orders throw
 * `PAY_TIME_ORDER_ALREADY_APPROVED` because un-approving would create a
 * dangling extension.
 */
export async function rejectPayTimeOrder(args: {
  orderId: string;
  adminUserId: string;
  reason?: string;
}): Promise<void> {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const order = await tx.payTimeOrder.findUnique({
      where: { id: args.orderId },
      select: { id: true, status: true, note: true },
    });

    if (!order) {
      throw new Error("PAY_TIME_ORDER_NOT_FOUND");
    }

    if (order.status === PAY_TIME_STATUS.REJECTED) {
      return;
    }

    if (order.status === PAY_TIME_STATUS.APPROVED) {
      throw new Error("PAY_TIME_ORDER_ALREADY_APPROVED");
    }

    const trimmedReason = args.reason?.trim();
    const noteSuffix = trimmedReason ? `\n[REJECT] ${trimmedReason}` : "";

    await tx.payTimeOrder.update({
      where: { id: order.id },
      data: {
        status: PAY_TIME_STATUS.REJECTED,
        rejectedById: args.adminUserId,
        rejectedAt: now,
        note: noteSuffix ? `${order.note ?? ""}${noteSuffix}`.trim() : order.note,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Order creation / slip replacement
// ---------------------------------------------------------------------------

export type CreatePayTimeOrderArgs = {
  userId: string;
  lessonId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  note?: string;
  slipFile: File;
};

/**
 * Create a PENDING Pay Time order. Eligibility is re-checked, price and
 * duration are snapshotted from the live `Lesson` row, and the slip is
 * persisted via the shared `savePaymentSlip` helper under the `pay-time`
 * sub-folder.
 *
 * Throws:
 *   - `PAY_TIME_LESSON_NOT_FOUND` — lesson missing or unpublished.
 *   - `PAY_TIME_NOT_ENABLED` — lesson exists but Pay Time is off.
 *   - `PAY_TIME_NEVER_ENROLLED` — user never had access to this course.
 *   - any error thrown by `savePaymentSlip` (e.g. `type`, `size`).
 */
export async function createPayTimeOrder(
  args: CreatePayTimeOrderArgs,
): Promise<PayTimeOrder> {
  const eligibility = await evaluatePayTimeEligibility({
    userId: args.userId,
    lessonId: args.lessonId,
  });

  if (eligibility.kind === "LESSON_NOT_FOUND") {
    throw new Error("PAY_TIME_LESSON_NOT_FOUND");
  }
  if (eligibility.kind === "NOT_ENABLED") {
    throw new Error("PAY_TIME_NOT_ENABLED");
  }
  if (eligibility.kind === "NEVER_ENROLLED") {
    throw new Error("PAY_TIME_NEVER_ENROLLED");
  }

  // Persist slip *before* writing the row, so we never end up with an
  // order pointing at a missing file. If the DB insert fails, the slip is
  // orphaned on disk — admin tooling already has to handle that for the
  // course-checkout path, so we follow the same pattern here.
  const slip: StoredPaymentSlip = await savePaymentSlip(args.slipFile, {
    subfolder: PAY_TIME_SLIP_SUBFOLDER,
  });

  const customerName = args.customerName.trim();
  const customerEmail = args.customerEmail.trim().toLowerCase();
  const customerPhone = args.customerPhone?.trim() || null;
  const note = args.note?.trim() || null;

  if (!customerName || !customerEmail) {
    throw new Error("PAY_TIME_MISSING_CUSTOMER");
  }

  return prisma.payTimeOrder.create({
    data: {
      userId: args.userId,
      lessonId: eligibility.lesson.id,
      courseIdSnapshot: eligibility.lesson.courseId,
      titleSnapshot: eligibility.lesson.title,
      priceCentsSnapshot: eligibility.priceCents,
      hoursSnapshot: eligibility.hours,
      status: PAY_TIME_STATUS.PENDING,
      paymentSlipStorageKey: slip.storageKey,
      paymentSlipOriginalFileName: slip.originalFileName,
      paymentSlipMimeType: slip.mimeType,
      paymentSlipSizeBytes: slip.sizeBytes,
      paymentSlipUploadedAt: new Date(),
      customerName,
      customerEmail,
      customerPhone,
      note,
    },
  });
}

/**
 * Replace the slip on a PENDING order owned by this user. Used by the
 * mobile flow where the slip can be uploaded after the order row exists.
 * Approving/rejecting an order locks the slip — only PENDING is mutable.
 */
export async function replacePayTimeOrderSlip(args: {
  userId: string;
  orderId: string;
  slipFile: File;
}): Promise<PayTimeOrder> {
  const order = await prisma.payTimeOrder.findUnique({
    where: { id: args.orderId },
    select: { id: true, userId: true, status: true },
  });

  if (!order || order.userId !== args.userId) {
    throw new Error("PAY_TIME_ORDER_NOT_FOUND");
  }

  if (order.status !== PAY_TIME_STATUS.PENDING) {
    throw new Error("PAY_TIME_ORDER_NOT_PENDING");
  }

  const slip = await savePaymentSlip(args.slipFile, {
    subfolder: PAY_TIME_SLIP_SUBFOLDER,
  });

  return prisma.payTimeOrder.update({
    where: { id: order.id },
    data: {
      paymentSlipStorageKey: slip.storageKey,
      paymentSlipOriginalFileName: slip.originalFileName,
      paymentSlipMimeType: slip.mimeType,
      paymentSlipSizeBytes: slip.sizeBytes,
      paymentSlipUploadedAt: new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// Re-exports for callers that want the underlying Prisma types
// ---------------------------------------------------------------------------

export type { Lesson, PayTimeOrder, VideoAccessExtension };
