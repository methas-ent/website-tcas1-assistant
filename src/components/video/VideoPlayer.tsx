"use client";

import { useEffect, useMemo, useState } from "react";

type VideoPlayerProps = {
  lessonId: string;
  title: string;
  userLabel?: string;
};

type PlaybackState =
  | { status: "loading" }
  | {
      status: "ready";
      playbackUrl: string;
      expiresAt: string;
      sessionId: string;
      mimeType: string;
    }
  | { status: "error"; message: string };

async function requestPlaybackAccess(lessonId: string) {
  const response = await fetch("/api/playback/authorize", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lessonId }),
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        playbackUrl?: string;
        expiresAt?: string;
        sessionId?: string;
        mimeType?: string;
        message?: string;
      }
    | null;

  if (!response.ok || !payload?.playbackUrl || !payload.expiresAt || !payload.sessionId) {
    throw new Error(payload?.message ?? "ไม่สามารถรับสิทธิ์เล่นวิดีโอได้");
  }

  return {
    playbackUrl: payload.playbackUrl,
    expiresAt: payload.expiresAt,
    sessionId: payload.sessionId,
    mimeType: payload.mimeType ?? "video/mp4",
  };
}

async function signalPlaybackSession(
  sessionId: string,
  action: "heartbeat" | "end",
) {
  await fetch(`/api/playback/session/${encodeURIComponent(sessionId)}/${action}`, {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined);
}

export function VideoPlayer({ lessonId, title, userLabel }: VideoPlayerProps) {
  const [now, setNow] = useState(() => new Date());
  const [playback, setPlayback] = useState<PlaybackState>({ status: "loading" });
  const sessionCode = useMemo(() => lessonId.slice(-6).toUpperCase(), [lessonId]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setPlayback({ status: "loading" });
    requestPlaybackAccess(lessonId)
      .then((result) => {
        if (!cancelled) {
          setPlayback({ status: "ready", ...result });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setPlayback({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "ไม่สามารถรับสิทธิ์เล่นวิดีโอได้",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  useEffect(() => {
    if (playback.status !== "ready") {
      return;
    }

    const sessionId = playback.sessionId;
    const expiresAtMs = Date.parse(playback.expiresAt);
    const heartbeat = window.setInterval(() => {
      void signalPlaybackSession(sessionId, "heartbeat");
    }, 30_000);
    const expire = window.setTimeout(
      () => {
        setPlayback((currentPlayback) =>
          currentPlayback.status === "ready" &&
          currentPlayback.sessionId === sessionId
            ? {
                status: "error",
                message:
                  "Playback token หมดอายุแล้ว กรุณารีเฟรชหน้าเพื่อขอสิทธิ์ใหม่",
              }
            : currentPlayback,
        );
      },
      Math.max(expiresAtMs - Date.now() + 1000, 0),
    );

    return () => {
      window.clearInterval(heartbeat);
      window.clearTimeout(expire);
      void signalPlaybackSession(sessionId, "end");
    };
  }, [playback]);

  return (
    <section className="overflow-hidden rounded-2xl border border-primary-100 bg-ink text-white shadow-card">
      <div className="relative aspect-video bg-gradient-to-br from-ink via-primary-900 to-primary-700">
        {playback.status === "ready" ? (
          <video
            key={playback.playbackUrl}
            aria-label={title}
            className="h-full w-full bg-black"
            controls
            controlsList="nodownload"
            disablePictureInPicture
            onContextMenu={(event) => event.preventDefault()}
            preload="metadata"
          >
            <source src={playback.playbackUrl} type={playback.mimeType} />
            เบราว์เซอร์นี้ไม่รองรับการเล่นวิดีโอ
          </video>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(142,174,255,0.24),transparent_24%)]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-primary-100">
                Secure Playback
              </span>
              <h2 className="mt-4 max-w-2xl text-2xl font-bold sm:text-3xl">
                {title}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
                {playback.status === "loading"
                  ? "กำลังตรวจสอบสิทธิ์และสร้าง playback token อายุสั้น"
                  : playback.message}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-primary-700 shadow-lg">
                  <span className="text-2xl" aria-hidden="true">
                    {playback.status === "loading" ? "…" : "!"}
                  </span>
                  <span className="sr-only">
                    {playback.status === "loading" ? "กำลังโหลด" : "เล่นไม่ได้"}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
        {playback.status === "ready" ? (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[12%] top-[18%] rounded-full border border-white/20 bg-ink/40 px-4 py-2 text-xs font-semibold text-white/70 backdrop-blur">
              {userLabel ?? "authorized user"} · {sessionCode}
            </div>
            <div className="absolute bottom-[14%] right-[10%] rounded-full border border-white/20 bg-ink/40 px-4 py-2 text-xs font-semibold text-white/70 backdrop-blur">
              {now.toLocaleString("th-TH", {
                dateStyle: "medium",
                timeStyle: "medium",
              })}
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-ink px-4 py-3 text-sm text-white/70">
        <span>ห้ามบันทึกหน้าจอ แชร์ลิงก์ หรือเผยแพร่วิดีโอต่อ</span>
        <span>
          {playback.status === "ready"
            ? `Token หมดอายุ ${new Date(playback.expiresAt).toLocaleTimeString(
                "th-TH",
              )}`
            : "ไม่ฝัง raw video URL หรือ storage key ในหน้าเว็บ"}
        </span>
      </div>
    </section>
  );
}
