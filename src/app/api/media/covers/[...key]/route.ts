import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { resolveLocalCoverImagePath } from "@/lib/cover-image-storage";

type CoverImageRouteProps = {
  params: {
    key: string[];
  };
};

function contentTypeForKey(storageKey: string) {
  const lower = storageKey.toLowerCase();

  if (lower.endsWith(".png")) {
    return "image/png";
  }

  if (lower.endsWith(".webp")) {
    return "image/webp";
  }

  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  return "application/octet-stream";
}

export async function GET(_request: Request, { params }: CoverImageRouteProps) {
  const storageKey = params.key.join("/");

  let bytes: Buffer;

  try {
    bytes = await readFile(resolveLocalCoverImagePath(storageKey));
  } catch {
    return NextResponse.json({ error: "Cover image unavailable" }, { status: 404 });
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      "content-length": String(bytes.byteLength),
      "content-type": contentTypeForKey(storageKey),
      "x-content-type-options": "nosniff",
    },
  });
}
