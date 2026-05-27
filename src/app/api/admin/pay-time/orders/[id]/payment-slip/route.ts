import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/db";
import { resolveLocalPaymentSlipPath } from "@/lib/payment-slip-storage";

type PayTimePaymentSlipRouteProps = {
  params: {
    id: string;
  };
};

function safeFileName(value: string | null) {
  return (value || "pay-time-slip").replace(/[\r\n"]/g, "_");
}

/**
 * Stream the payment slip for a Pay Time order. Admin-only — uses the same
 * shape as `/api/admin/orders/[id]/payment-slip` but reads from PayTimeOrder.
 * Pay Time slips are stored under the `pay-time/` sub-folder per Phase 2.
 */
export async function GET(
  _request: Request,
  { params }: PayTimePaymentSlipRouteProps,
) {
  await requireAdmin(`/admin/pay-time/${params.id}`);

  const order = await prisma.payTimeOrder.findUnique({
    where: { id: params.id },
    select: {
      paymentSlipStorageKey: true,
      paymentSlipOriginalFileName: true,
      paymentSlipMimeType: true,
    },
  });

  if (!order?.paymentSlipStorageKey) {
    return NextResponse.json(
      { error: "Payment slip not found" },
      { status: 404 },
    );
  }

  let bytes: Buffer;

  try {
    bytes = await readFile(
      resolveLocalPaymentSlipPath(order.paymentSlipStorageKey),
    );
  } catch {
    return NextResponse.json(
      { error: "Payment slip unavailable" },
      { status: 404 },
    );
  }

  const mimeType = order.paymentSlipMimeType || "application/octet-stream";

  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-disposition": `inline; filename="${safeFileName(
        order.paymentSlipOriginalFileName,
      )}"`,
      "content-length": String(bytes.byteLength),
      "content-type": mimeType,
      "x-content-type-options": "nosniff",
    },
  });
}
