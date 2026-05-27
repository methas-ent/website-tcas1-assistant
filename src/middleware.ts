import { NextResponse, type NextRequest } from "next/server";

const DEV_EXPO_PORTS = new Set(["8081", "8082", "19006"]);

function configuredOrigins() {
  return new Set(
    (process.env.MOBILE_CORS_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const first = parts[0]!;
  const second = parts[1]!;

  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function allowedCorsOrigin(origin: string | null) {
  if (!origin) {
    return null;
  }

  const explicitOrigins = configuredOrigins();

  if (explicitOrigins.has(origin)) {
    return origin;
  }

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  try {
    const url = new URL(origin);
    const isLocalHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1" ||
      isPrivateIpv4(url.hostname);

    if (isLocalHost && DEV_EXPO_PORTS.has(url.port)) {
      return origin;
    }
  } catch {
    return null;
  }

  return null;
}

function applyCorsHeaders(response: NextResponse, origin: string | null) {
  const allowedOrigin = allowedCorsOrigin(origin);

  if (!allowedOrigin) {
    return response;
  }

  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Range",
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Expose-Headers",
    "Accept-Ranges, Content-Range, Content-Length, Content-Type",
  );
  response.headers.append("Vary", "Origin");

  return response;
}

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return applyCorsHeaders(
      new NextResponse(null, { status: 204 }),
      request.headers.get("origin"),
    );
  }

  return applyCorsHeaders(NextResponse.next(), request.headers.get("origin"));
}

export const config = {
  matcher: ["/api/mobile/:path*", "/api/playback/:path*"],
};
