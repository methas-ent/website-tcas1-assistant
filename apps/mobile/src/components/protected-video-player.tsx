import type { PlaybackAuthorizeResponse } from "@knowledge/shared";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useLearningTheme } from "@/components/learning-ui";
import { useAuth } from "@/features/auth/auth-context";
import { usePreferences } from "@/features/preferences/preferences-context";
import { useSecureScreen } from "@/hooks/useSecureScreen";

type ProtectedVideoPlayerProps = {
  playback: PlaybackAuthorizeResponse | null;
  lessonId: string;
};

const SCREEN_CAPTURE_KEY = "knowledge-lesson-player";
const CAPTURE_WARNING_MS = 6_000;
const WEB_SHORTCUT_SHIELD_MS = 2_500;

type WebEventTargetLike = {
  addEventListener?: (
    type: string,
    listener: (event: unknown) => void,
    options?: unknown,
  ) => void;
  removeEventListener?: (
    type: string,
    listener: (event: unknown) => void,
    options?: unknown,
  ) => void;
};

type WebDocumentLike = WebEventTargetLike & {
  hidden?: boolean;
  visibilityState?: string;
};

type WebWindowLike = WebEventTargetLike & {
  document?: WebDocumentLike;
};

type WebRuntimeLike = typeof globalThis & {
  document?: WebDocumentLike;
  window?: WebWindowLike;
};

type WebKeyboardEventLike = {
  altKey?: boolean;
  code?: string;
  ctrlKey?: boolean;
  key?: string;
  metaKey?: boolean;
  preventDefault?: () => void;
  shiftKey?: boolean;
};

function getWebRuntime() {
  return globalThis as WebRuntimeLike;
}

function getWebWindow() {
  if (Platform.OS !== "web") {
    return null;
  }

  return getWebRuntime().window ?? null;
}

function getWebDocument() {
  if (Platform.OS !== "web") {
    return null;
  }

  const runtime = getWebRuntime();
  return runtime.document ?? runtime.window?.document ?? null;
}

function isDocumentHidden(documentLike: WebDocumentLike | null) {
  return documentLike?.hidden === true || documentLike?.visibilityState === "hidden";
}

function addWebListener(
  target: WebEventTargetLike | null,
  type: string,
  listener: (event: unknown) => void,
  options?: unknown,
) {
  try {
    target?.addEventListener?.(type, listener, options);
  } catch {
    // Browser and embedded WebView event support varies; this is deterrence only.
  }

  return () => {
    try {
      target?.removeEventListener?.(type, listener, options);
    } catch {
      // Ignore cleanup differences across web runtimes.
    }
  };
}

function isWebKeyboardEvent(event: unknown): event is WebKeyboardEventLike {
  return typeof event === "object" && event !== null;
}

function isLikelyScreenCaptureShortcut(event: unknown) {
  if (!isWebKeyboardEvent(event)) {
    return false;
  }

  const key = event.key?.toLowerCase();
  const code = event.code?.toLowerCase();

  if (key === "printscreen" || key === "snapshot" || code === "printscreen") {
    return true;
  }

  const isNumberCaptureKey = key === "3" || key === "4" || key === "5";
  if (event.metaKey && event.shiftKey && isNumberCaptureKey) {
    return true;
  }

  return Boolean(event.ctrlKey && event.shiftKey && key === "s");
}

function isLikelyPrintShortcut(event: unknown) {
  if (!isWebKeyboardEvent(event)) {
    return false;
  }

  return Boolean((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === "p");
}

function useWebPrivacyDeterrents(
  enabled: boolean,
  onWarning: () => void,
  onShieldChange: (visible: boolean) => void,
) {
  useEffect(() => {
    if (!enabled || Platform.OS !== "web") {
      return;
    }

    const webWindow = getWebWindow();
    const webDocument = getWebDocument();

    if (!webWindow && !webDocument) {
      return;
    }

    let windowBlurred = false;
    let printing = false;
    let shortcutShield = false;
    let shortcutTimer: ReturnType<typeof setTimeout> | null = null;

    const updateShield = () => {
      onShieldChange(
        windowBlurred || printing || shortcutShield || isDocumentHidden(webDocument),
      );
    };

    const showShortcutShield = () => {
      shortcutShield = true;
      updateShield();

      if (shortcutTimer) {
        clearTimeout(shortcutTimer);
      }

      shortcutTimer = setTimeout(() => {
        shortcutShield = false;
        shortcutTimer = null;
        updateShield();
      }, WEB_SHORTCUT_SHIELD_MS);
    };

    const handleBlur = () => {
      windowBlurred = true;
      updateShield();
    };

    const handleFocus = () => {
      windowBlurred = false;
      updateShield();
    };

    const handleVisibilityChange = () => {
      if (isDocumentHidden(webDocument)) {
        onWarning();
      }
      updateShield();
    };

    const handleBeforePrint = () => {
      printing = true;
      onWarning();
      updateShield();
    };

    const handleAfterPrint = () => {
      printing = false;
      updateShield();
    };

    const handleKeyDown = (event: unknown) => {
      if (!isLikelyScreenCaptureShortcut(event) && !isLikelyPrintShortcut(event)) {
        return;
      }

      // Web shortcut handling is friction only; browsers cannot reliably block OS capture tools.
      if (isWebKeyboardEvent(event)) {
        try {
          event.preventDefault?.();
        } catch {
          // Some synthetic/webview events do not allow cancellation.
        }
      }

      onWarning();
      showShortcutShield();
    };

    const removeListeners = [
      addWebListener(webWindow, "blur", handleBlur),
      addWebListener(webWindow, "focus", handleFocus),
      addWebListener(webWindow, "beforeprint", handleBeforePrint),
      addWebListener(webWindow, "afterprint", handleAfterPrint),
      addWebListener(webDocument, "visibilitychange", handleVisibilityChange),
      addWebListener(webWindow ?? webDocument, "keydown", handleKeyDown, {
        capture: true,
      }),
    ];

    updateShield();

    return () => {
      if (shortcutTimer) {
        clearTimeout(shortcutTimer);
      }

      removeListeners.forEach((removeListener) => {
        removeListener();
      });
      onShieldChange(false);
    };
  }, [enabled, onShieldChange, onWarning]);
}

export function ProtectedVideoPlayer({
  playback,
  lessonId,
}: ProtectedVideoPlayerProps) {
  const { api, session, user } = useAuth();
  const { language, t } = usePreferences();
  const { palette, isDark } = useLearningTheme();
  const styles = createVideoStyles(palette, isDark);
  const [captureWarning, setCaptureWarning] = useState(false);
  const [privacyShieldVisible, setPrivacyShieldVisible] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const player = useVideoPlayer(null);
  const captureWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showCaptureWarning = useCallback(() => {
    if (captureWarningTimerRef.current) {
      clearTimeout(captureWarningTimerRef.current);
    }

    setCaptureWarning(true);

    captureWarningTimerRef.current = setTimeout(() => {
      setCaptureWarning(false);
      captureWarningTimerRef.current = null;
    }, CAPTURE_WARNING_MS);
  }, []);
  const setPrivacyShield = useCallback((visible: boolean) => {
    setPrivacyShieldVisible(visible);
  }, []);

  useSecureScreen({
    enableAppSwitcherShield: true,
    onScreenshot: showCaptureWarning,
    tag: SCREEN_CAPTURE_KEY,
  });
  useWebPrivacyDeterrents(Boolean(playback), showCaptureWarning, setPrivacyShield);

  useEffect(() => {
    return () => {
      if (captureWarningTimerRef.current) {
        clearTimeout(captureWarningTimerRef.current);
      }
    };
  }, []);

  const source = useMemo<VideoSource | null>(() => {
    if (!playback || !session) {
      return null;
    }

    if (Platform.OS === "web") {
      return {
        uri: api.resolveUrl(playback.playbackUrl),
        contentType: "progressive",
        metadata: {
          title: playback.lessonTitle,
          artist: "Knowledge Academy",
        },
        useCaching: false,
      };
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
      {privacyShieldVisible ? (
        <View pointerEvents="none" style={styles.privacyShield}>
          <Text style={styles.privacyShieldTitle}>{t("privacyShieldTitle")}</Text>
          <Text style={styles.privacyShieldText}>{t("privacyShieldDescription")}</Text>
        </View>
      ) : null}
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
    privacyShield: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 3,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(2, 6, 23, 0.92)",
      padding: 18,
      gap: 8,
    },
    privacyShieldTitle: {
      color: "#ffffff",
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 18,
      textAlign: "center",
    },
    privacyShieldText: {
      color: "#cbd5e1",
      fontFamily: "Prompt_500Medium",
      fontSize: 13,
      lineHeight: 21,
      maxWidth: 360,
      textAlign: "center",
    },
    warning: {
      zIndex: 4,
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
