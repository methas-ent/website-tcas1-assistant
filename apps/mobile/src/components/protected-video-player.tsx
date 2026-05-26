import type { PlaybackAuthorizeResponse } from "@knowledge/shared";
import * as ScreenCapture from "expo-screen-capture";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useLearningTheme } from "@/components/learning-ui";
import { useAuth } from "@/features/auth/auth-context";
import { usePreferences } from "@/features/preferences/preferences-context";

type ProtectedVideoPlayerProps = {
  playback: PlaybackAuthorizeResponse | null;
  lessonId: string;
};

export function ProtectedVideoPlayer({
  playback,
  lessonId,
}: ProtectedVideoPlayerProps) {
  const { api, session, user } = useAuth();
  const { language, t } = usePreferences();
  const { palette, isDark } = useLearningTheme();
  const styles = createVideoStyles(palette, isDark);
  const [captureWarning, setCaptureWarning] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const player = useVideoPlayer(null);

  ScreenCapture.usePreventScreenCapture("knowledge-lesson-player");
  ScreenCapture.useScreenshotListener(() => {
    setCaptureWarning(true);
  });

  const source = useMemo<VideoSource | null>(() => {
    if (!playback || !session) {
      return null;
    }

    return {
      uri: api.resolveUrl(playback.playbackUrl),
      contentType: "progressive",
      headers: {
        Authorization: `Bearer ${session.sessionToken}`,
      },
      metadata: {
        title: playback.lessonTitle,
        artist: "Knowledge Academy",
      },
      useCaching: false,
    };
  }, [api, playback, session]);

  useEffect(() => {
    if (!source) {
      return;
    }

    setPlayerError(null);

    void player
      .replaceAsync(source)
      .then(() => {
        player.play();
      })
      .catch((error: unknown) => {
        setPlayerError(error instanceof Error ? error.message : "Video unavailable");
      });
  }, [player, source]);

  useEffect(() => {
    if (!playback?.sessionId) {
      return;
    }

    const heartbeat = setInterval(() => {
      void api.heartbeatPlaybackSession(playback.sessionId).catch(() => {
        // A failed heartbeat should not crash playback; the next token/stream request
        // still revalidates the active session server-side.
      });
    }, 30_000);

    return () => {
      clearInterval(heartbeat);
      void api.endPlaybackSession(playback.sessionId).catch(() => {});
    };
  }, [api, playback?.sessionId]);

  const watermark = `${user?.name ?? "Student"} • ${user?.email ?? ""} • ${lessonId}`;
  const dateLocale = language === "th" ? "th-TH" : "en-US";

  if (!playback) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>{t("noVideoTitle")}</Text>
        <Text style={styles.placeholderText}>{t("noVideoDescription")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        fullscreenOptions={{ enable: true }}
      />
      <View pointerEvents="none" style={styles.watermarkTop}>
        <Text style={styles.watermarkText}>{watermark}</Text>
      </View>
      <View pointerEvents="none" style={styles.watermarkBottom}>
        <Text style={styles.watermarkText}>{new Date().toLocaleString(dateLocale)}</Text>
      </View>
      {captureWarning ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>{t("screenshotWarning")}</Text>
        </View>
      ) : null}
      {playerError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{playerError}</Text>
        </View>
      ) : null}
    </View>
  );
}

function createVideoStyles(
  palette: ReturnType<typeof useLearningTheme>["palette"],
  isDark: boolean,
) {
  return StyleSheet.create({
    shell: {
      overflow: "hidden",
      borderRadius: 22,
      borderWidth: 1,
      borderColor: isDark ? "#1e5c8d" : "#0f172a",
      backgroundColor: "#020617",
      minHeight: 220,
      shadowColor: palette.glow,
      shadowOpacity: isDark ? 0.42 : 0.18,
      shadowRadius: isDark ? 28 : 16,
      shadowOffset: { width: 0, height: 12 },
      elevation: isDark ? 12 : 4,
    },
    video: {
      aspectRatio: 16 / 9,
      width: "100%",
      backgroundColor: "#020617",
    },
    placeholder: {
      minHeight: 220,
      justifyContent: "center",
      borderRadius: 22,
      borderWidth: 1,
      borderColor: isDark ? "#1e5c8d" : palette.border,
      backgroundColor: isDark ? "#071b32" : "#0f172a",
      padding: 18,
      gap: 8,
      shadowColor: palette.glow,
      shadowOpacity: isDark ? 0.32 : 0.12,
      shadowRadius: isDark ? 24 : 14,
      shadowOffset: { width: 0, height: 10 },
      elevation: isDark ? 9 : 3,
    },
    placeholderTitle: {
      color: "#ffffff",
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 18,
    },
    placeholderText: {
      color: isDark ? "#bae6fd" : "#cbd5e1",
      fontFamily: "Prompt_400Regular",
      fontSize: 14,
      lineHeight: 22,
    },
    watermarkTop: {
      position: "absolute",
      top: 10,
      left: 10,
      borderRadius: 999,
      backgroundColor: "rgba(2, 6, 23, 0.62)",
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    watermarkBottom: {
      position: "absolute",
      right: 10,
      bottom: 10,
      borderRadius: 999,
      backgroundColor: "rgba(2, 6, 23, 0.62)",
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    watermarkText: {
      color: "rgba(255, 255, 255, 0.84)",
      fontFamily: "Prompt_600SemiBold",
      fontSize: 11,
    },
    warning: {
      backgroundColor: isDark ? "#422006" : "#fef3c7",
      padding: 10,
    },
    warningText: {
      color: isDark ? "#fde68a" : "#92400e",
      fontFamily: "Prompt_700Bold",
      fontSize: 12,
    },
    errorBox: {
      backgroundColor: isDark ? "#450a0a" : "#fee2e2",
      padding: 10,
    },
    errorText: {
      color: isDark ? "#fecaca" : "#991b1b",
      fontFamily: "Prompt_700Bold",
      fontSize: 12,
    },
  });
}
