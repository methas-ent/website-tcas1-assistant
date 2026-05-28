import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAdmin } from "@/lib/auth";
import prisma from "@/lib/db";
import { getVideoStorageProvider } from "@/lib/video-storage";

export const dynamic = "force-dynamic";

function formFile(formData: FormData, key: string) {
  const value = formData.get(key);

  if (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    typeof (value as { size: unknown }).size === "number"
  ) {
    return value as File;
  }

  return null;
}

function pickFile(formData: FormData) {
  return formFile(formData, "videoFile") ?? formFile(formData, "file");
}

function errorResponse(code: string, status = 400) {
  return NextResponse.json({ error: code }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);

  if (!isAdmin(user)) {
    return errorResponse("forbidden", 403);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse("invalid-form", 400);
  }

  const rawTitle = String(formData.get("title") ?? "").trim();
  const file = pickFile(formData);

  if (!file || file.size <= 0) {
    return errorResponse("invalid-file", 400);
  }

  const fallbackTitle = file.name.replace(/\.[^.]+$/, "").trim();
  const title = rawTitle || fallbackTitle || "วิดีโอใหม่";

  let storedVideo;

  try {
    storedVideo = await getVideoStorageProvider().saveVideo(file);
  } catch (error) {
    const code = error instanceof Error ? error.message : "storage";
    const mapped =
      code === "type"
        ? "invalid-type"
        : code === "size"
          ? "invalid-size"
          : code === "invalid"
            ? "invalid-file"
            : "storage";
    return errorResponse(mapped, 400);
  }

  const created = await prisma.videoAsset.create({
    data: {
      title,
      storageProvider: storedVideo.storageProvider,
      storageKey: storedVideo.storageKey,
      originalFileName: storedVideo.originalFileName,
      mimeType: storedVideo.mimeType,
      sizeBytes: storedVideo.sizeBytes,
      status: "READY",
      metadataJson: JSON.stringify({
        description: "",
        source: "standalone-upload",
      }),
    },
    select: {
      id: true,
      title: true,
      status: true,
      sizeBytes: true,
      mimeType: true,
      createdAt: true,
      originalFileName: true,
    },
  });

  console.info(
    `[admin-audit] standalone video asset uploaded id=${created.id} by=${user!.id}`,
  );

  return NextResponse.json({
    asset: {
      id: created.id,
      title: created.title,
      status: created.status,
      sizeBytes: Number(created.sizeBytes ?? 0n),
      mimeType: created.mimeType,
      createdAt: created.createdAt.toISOString(),
      originalFileName: created.originalFileName,
      isUsed: false,
    },
  });
}
