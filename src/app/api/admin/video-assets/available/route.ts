import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAdmin } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

function parseBoolean(value: string | null, fallback: boolean) {
  if (value === null) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  return fallback;
}

function parseLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const unusedOnly = parseBoolean(url.searchParams.get("unusedOnly"), true);
  const limit = parseLimit(url.searchParams.get("limit"));

  const where: {
    OR?: Array<{ title?: { contains: string }; originalFileName?: { contains: string } }>;
    lessons?: { none: object };
  } = {};

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { originalFileName: { contains: search } },
    ];
  }

  if (unusedOnly) {
    where.lessons = { none: {} };
  }

  const rows = await prisma.videoAsset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      status: true,
      sizeBytes: true,
      mimeType: true,
      createdAt: true,
      originalFileName: true,
      _count: { select: { lessons: true } },
    },
  });

  const assets = rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    sizeBytes: Number(row.sizeBytes ?? 0n),
    mimeType: row.mimeType,
    createdAt: row.createdAt.toISOString(),
    originalFileName: row.originalFileName,
    isUsed: row._count.lessons > 0,
  }));

  return NextResponse.json({ assets });
}
