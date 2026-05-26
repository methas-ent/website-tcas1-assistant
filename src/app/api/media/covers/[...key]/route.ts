import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { resolveLocalCoverImagePath } from "@/lib/cover-image-storage";

type CoverImageRouteProps = {
  params: {
    key: string[];
  };
};

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
      "content-type": "image/png",
      "x-content-type-options": "nosniff",
    },
  });
}
