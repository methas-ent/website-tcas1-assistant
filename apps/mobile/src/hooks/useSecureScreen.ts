import { useFocusEffect } from "expo-router";
import * as ScreenCapture from "expo-screen-capture";
import { useCallback } from "react";
import { Platform } from "react-native";

const DEFAULT_TAG = "default";
const APP_SWITCHER_BLUR_INTENSITY = 0.8;

type ScreenshotSubscriptionLike = { remove: () => void } | null;

type UseSecureScreenOptions = {
  onScreenshot?: () => void;
  enableAppSwitcherShield?: boolean;
  tag?: string;
};

function isWeb() {
  return Platform.OS === "web";
}

function logWarn(prefix: string, error: unknown) {
  // Best-effort screen-capture APIs; surface as a warning so devs can diagnose
  // platform/device gaps without crashing the screen.
  // eslint-disable-next-line no-console
  console.warn(prefix, error);
}

function callEnableAppSwitcherShield() {
  // The Expo SDK declares this function unconditionally, but some hosts (older
  // SDKs, expo-go preview builds) may not expose it at runtime. Probe defensively.
  const enableFn = (
    ScreenCapture as unknown as {
      enableAppSwitcherProtectionAsync?: (
        blurIntensity?: number,
      ) => Promise<void>;
    }
  ).enableAppSwitcherProtectionAsync;

  if (typeof enableFn !== "function") {
    return;
  }

  void enableFn(APP_SWITCHER_BLUR_INTENSITY).catch((error: unknown) => {
    logWarn("[useSecureScreen] enableAppSwitcherProtectionAsync failed", error);
  });
}

function callDisableAppSwitcherShield() {
  const disableFn = (
    ScreenCapture as unknown as {
      disableAppSwitcherProtectionAsync?: () => Promise<void>;
    }
  ).disableAppSwitcherProtectionAsync;

  if (typeof disableFn !== "function") {
    return;
  }

  void disableFn().catch((error: unknown) => {
    logWarn("[useSecureScreen] disableAppSwitcherProtectionAsync failed", error);
  });
}

export async function secureScreenOn(tag: string = DEFAULT_TAG): Promise<void> {
  if (isWeb()) {
    return;
  }

  try {
    await ScreenCapture.preventScreenCaptureAsync(tag);
  } catch (error) {
    logWarn("[secureScreenOn] preventScreenCaptureAsync failed", error);
  }
}

export async function secureScreenOff(tag: string = DEFAULT_TAG): Promise<void> {
  if (isWeb()) {
    return;
  }

  try {
    await ScreenCapture.allowScreenCaptureAsync(tag);
  } catch (error) {
    logWarn("[secureScreenOff] allowScreenCaptureAsync failed", error);
  }
}

export function useSecureScreen(options?: UseSecureScreenOptions): void {
  const onScreenshot = options?.onScreenshot;
  const enableAppSwitcherShield = options?.enableAppSwitcherShield ?? true;
  const tag = options?.tag ?? DEFAULT_TAG;

  // useFocusEffect callback must return a cleanup. Keep it stable with useCallback
  // so React Navigation doesn't re-run unnecessarily.
  const focusEffectCallback = useCallback(() => {
    if (isWeb()) {
      return () => {
        // No-op cleanup for web.
      };
    }

    let cancelled = false;
    let subscription: ScreenshotSubscriptionLike = null;

    void ScreenCapture.preventScreenCaptureAsync(tag).catch((error: unknown) => {
      logWarn("[useSecureScreen] preventScreenCaptureAsync failed", error);
    });

    if (enableAppSwitcherShield) {
      callEnableAppSwitcherShield();
    }

    if (onScreenshot) {
      try {
        subscription = ScreenCapture.addScreenshotListener(() => {
          if (!cancelled) {
            onScreenshot();
          }
        });
      } catch (error) {
        logWarn("[useSecureScreen] addScreenshotListener failed", error);
        subscription = null;
      }
    }

    return () => {
      cancelled = true;

      if (subscription) {
        try {
          subscription.remove();
        } catch (error) {
          logWarn("[useSecureScreen] subscription.remove failed", error);
        }
      }

      if (enableAppSwitcherShield) {
        callDisableAppSwitcherShield();
      }

      void ScreenCapture.allowScreenCaptureAsync(tag).catch((error: unknown) => {
        logWarn("[useSecureScreen] allowScreenCaptureAsync failed", error);
      });
    };
  }, [enableAppSwitcherShield, onScreenshot, tag]);

  useFocusEffect(focusEffectCallback);
}
