import type {
  LessonProgressResponse,
  MobileAuthResponse,
  MobileCourseDetail,
  MobileCourseListItem,
  MobileLessonContext,
  MobileUser,
  PayTimeOrderCreateResponse,
  PayTimeOrderResponse,
  PayTimeOrderSlipUpdateResponse,
  PayTimeStatusResponse,
  PlaybackAuthorizeResponse,
} from "@knowledge/shared";

export class ApiError extends Error {
  status: number;
  code?: string;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;

    if (
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
    ) {
      this.code = payload.error;
    }
  }
}

type ApiClientOptions = {
  baseUrl: string;
  getSessionToken?: () => string | null | Promise<string | null>;
};

type JsonBody = Record<string, unknown> | undefined;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export class KnowledgeApiClient {
  private readonly baseUrl: string;
  private readonly getSessionToken?: ApiClientOptions["getSessionToken"];

  constructor(options: ApiClientOptions) {
    this.baseUrl = trimTrailingSlash(options.baseUrl);
    this.getSessionToken = options.getSessionToken;
  }

  resolveUrl(path: string) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  }

  private async request<T>(
    path: string,
    init: RequestInit & { json?: JsonBody; form?: FormData } = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);
    const sessionToken = this.getSessionToken
      ? await this.getSessionToken()
      : null;

    if (sessionToken) {
      headers.set("Authorization", `Bearer ${sessionToken}`);
    }

    let body = init.body;

    if (init.json) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(init.json);
    }

    if (init.form) {
      // Let fetch set the multipart boundary automatically.
      headers.delete("Content-Type");
      body = init.form;
    }

    const response = await fetch(this.resolveUrl(path), {
      ...init,
      headers,
      body,
    });
    const payload = await readJson(response);

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === "object" &&
        "message" in payload &&
        typeof payload.message === "string"
          ? payload.message
          : `Request failed with ${response.status}`;

      throw new ApiError(response.status, message, payload);
    }

    return payload as T;
  }

  login(email: string, password: string) {
    return this.request<MobileAuthResponse>("/api/mobile/auth/login", {
      method: "POST",
      json: { email, password },
    });
  }

  me() {
    return this.request<{ user: MobileUser }>("/api/mobile/auth/me");
  }

  logout() {
    return this.request<{ ok: true }>("/api/mobile/auth/logout", {
      method: "POST",
    });
  }

  getMyCourses() {
    return this.request<{ courses: MobileCourseListItem[] }>(
      "/api/mobile/courses",
    );
  }

  getCourse(courseId: string) {
    return this.request<{ course: MobileCourseDetail }>(
      `/api/mobile/courses/${encodeURIComponent(courseId)}`,
    );
  }

  getLesson(lessonId: string) {
    return this.request<MobileLessonContext>(
      `/api/mobile/lessons/${encodeURIComponent(lessonId)}`,
    );
  }

  updateProgress(input: {
    lessonId: string;
    progressSeconds?: number;
    completed?: boolean;
  }) {
    return this.request<LessonProgressResponse>("/api/mobile/progress", {
      method: "POST",
      json: input,
    });
  }

  authorizePlayback(lessonId: string) {
    return this.request<PlaybackAuthorizeResponse>("/api/playback/authorize", {
      method: "POST",
      json: { lessonId },
    });
  }

  refreshPlaybackToken(sessionId: string) {
    return this.request<PlaybackAuthorizeResponse>("/api/playback/token", {
      method: "POST",
      json: { sessionId },
    });
  }

  heartbeatPlaybackSession(sessionId: string) {
    return this.request<{ ok: true }>(
      `/api/playback/session/${encodeURIComponent(sessionId)}/heartbeat`,
      { method: "POST" },
    );
  }

  endPlaybackSession(sessionId: string) {
    return this.request<{ ok: true }>(
      `/api/playback/session/${encodeURIComponent(sessionId)}/end`,
      { method: "POST" },
    );
  }

  getPayTimeStatus(lessonId: string) {
    return this.request<PayTimeStatusResponse>(
      `/api/mobile/videos/${encodeURIComponent(lessonId)}/pay-time`,
    );
  }

  createPayTimeOrder(lessonId: string, form: FormData) {
    return this.request<PayTimeOrderCreateResponse>(
      `/api/mobile/videos/${encodeURIComponent(lessonId)}/pay-time/orders`,
      { method: "POST", form },
    );
  }

  getPayTimeOrder(orderId: string) {
    return this.request<PayTimeOrderResponse>(
      `/api/mobile/pay-time/orders/${encodeURIComponent(orderId)}`,
    );
  }

  replacePayTimeSlip(orderId: string, form: FormData) {
    return this.request<PayTimeOrderSlipUpdateResponse>(
      `/api/mobile/pay-time/orders/${encodeURIComponent(orderId)}/slip`,
      { method: "POST", form },
    );
  }
}

export type {
  LessonProgressResponse,
  MobileAuthResponse,
  MobileCourseDetail,
  MobileCourseListItem,
  MobileLessonContext,
  MobileUser,
  PayTimeOrderCreateResponse,
  PayTimeOrderResponse,
  PayTimeOrderSlipUpdateResponse,
  PayTimeStatusResponse,
  PlaybackAuthorizeResponse,
};
