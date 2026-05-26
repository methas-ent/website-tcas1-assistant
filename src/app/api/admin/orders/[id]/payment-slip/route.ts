import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/db";
import { resolveLocalPaymentSlipPath } from "@/lib/payment-slip-storage";

type PaymentSlipRouteProps = {
  params: {
    id: string;
  };
};

function safeFileName(value: string | null) {
  return (value || "payment-slip").replace(/[\r\n"]/g, "_");
}

export async function GET(_request: Request, { params }: PaymentSlipRouteProps) {
  await requireAdmin(`/admin/orders/${params.id}`);

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      paymentSlipStorageKey: true,
      paymentSlipOriginalFileName: true,
      paymentSlipMimeType: true,
    },
  });

  if (!order?.paymentSlipStorageKey) {
    return NextResponse.json({ error: "Payment slip not found" }, { status: 404 });
  }

  let bytes: Buffer;

  try {
    bytes = await readFile(resolveLocalPaymentSlipPath(order.paymentSlipStorageKey));
  } catch {
    return NextResponse.json({ error: "Payment slip unavailable" }, { status: 404 });
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
