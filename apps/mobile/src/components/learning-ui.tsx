import type {
  MobileChapterDetail,
  MobileCourseListItem,
  MobileLessonListItem,
} from "@knowledge/shared";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import boldSymbolWeight from "expo-symbols/androidWeights/bold";
import { router } from "expo-router";
import { useEffect, useRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL } from "@/config";
import { usePreferences } from "@/features/preferences/preferences-context";

const font = {
  regular: "Prompt_400Regular",
  medium: "Prompt_500Medium",
  semibold: "Prompt_600SemiBold",
  bold: "Prompt_700Bold",
  extraBold: "Prompt_800ExtraBold",
};

const palettes = {
  light: {
    brand: "#1d6fe8",
    brandDark: "#0f3f95",
    brandSoft: "#eaf3ff",
    ink: "#0f172a",
    muted: "#64748b",
    border: "#dbe6f5",
    surface: "#ffffff",
    surfaceAlt: "#f8fbff",
    background: "#f5f8fc",
    success: "#0f9f6e",
    danger: "#dc2626",
    glow: "#0f3f95",
    heroStart: "#0f3f95",
    heroEnd: "#1d6fe8",
    chipBg: "#eaf3ff",
    chipText: "#0f3f95",
  },
  dark: {
    brand: "#38bdf8",
    brandDark: "#7dd3fc",
    brandSoft: "#0d2a4c",
    ink: "#eaf6ff",
    muted: "#91a7c6",
    border: "#16446e",
    surface: "#0b1728",
    surfaceAlt: "#0f2138",
    background: "#06101f",
    success: "#34d399",
    danger: "#fb7185",
    glow: "#38bdf8",
    heroStart: "#06101f",
    heroEnd: "#0f3f95",
    chipBg: "rgba(56, 189, 248, 0.14)",
    chipText: "#bae6fd",
  },
};

type Palette = (typeof palettes)["light"];

function resolvePublicUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${API_BASE_URL.replace(/\/+$/, "")}${value.startsWith("/") ? "" : "/"}${value}`;
}

export function useLearningTheme() {
  const { themeMode } = usePreferences();
  const palette = palettes[themeMode];

  return {
    isDark: themeMode === "dark",
    palette,
    styles: createStyles(palette, themeMode === "dark"),
  };
}

export function Screen({
  children,
  padded = true,
}: {
  children: ReactNode;
  padded?: boolean;
}) {
  const { themeMode } = usePreferences();
  const { styles } = useLearningTheme();
  const fadeOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fadeOpacity.setValue(0.72);
    Animated.timing(fadeOpacity, {
      duration: 560,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [fadeOpacity, themeMode]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.screen, padded && styles.screenPadded]}>
        <Animated.View style={[styles.themeFade, { opacity: fadeOpacity }]}>
          <PreferenceControls />
          {children}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function ThemeModeIcon({
  color,
  mode,
}: {
  color: string;
  mode: "light" | "dark";
}) {
  const fallback = mode === "dark" ? "☾" : "☀";

  return (
    <SymbolView
      fallback={<Text style={{ color, fontFamily: font.extraBold, fontSize: 17 }}>{fallback}</Text>}
      name={
        mode === "dark"
          ? { ios: "moon.stars.fill", android: "dark_mode", web: "dark_mode" }
          : { ios: "sun.max.fill", android: "light_mode", web: "light_mode" }
      }
      size={18}
      tintColor={color}
      weight={{ ios: "bold", android: boldSymbolWeight }}
    />
  );
}

export function PreferenceControls() {
  const { language, themeMode, toggleLanguage, toggleThemeMode } = usePreferences();
  const { palette, styles } = useLearningTheme();
  const themeToggleLabel =
    themeMode === "dark" ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด";

  return (
    <View style={styles.preferenceBar}>
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>KA</Text>
      </View>
      <View style={styles.toggleGroup}>
        <Pressable
          accessibilityLabel={language === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
          accessibilityRole="button"
          onPress={toggleLanguage}
          style={({ pressed }) => [
            styles.toggleButton,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.toggleText}>{language === "th" ? "TH" : "EN"}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={themeToggleLabel}
          accessibilityRole="button"
          accessibilityState={{ selected: themeMode === "dark" }}
          onPress={toggleThemeMode}
          style={({ pressed }) => [
            styles.toggleButton,
            themeMode === "dark" && styles.toggleButtonActive,
            pressed && styles.pressed,
          ]}>
          <ThemeModeIcon color={palette.brandDark} mode={themeMode} />
        </Pressable>
      </View>
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const { t } = usePreferences();
  const { palette, styles } = useLearningTheme();

  return (
    <Screen>
      <View style={styles.centerState}>
        <ActivityIndicator color={palette.brand} />
        <Text style={styles.mutedText}>{label ?? t("loadingData")}</Text>
      </View>
    </Screen>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { styles } = useLearningTheme();

  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { styles } = useLearningTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <Text style={styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  const { styles } = useLearningTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const { styles } = useLearningTheme();
  const percent = Math.max(0, Math.min(100, value));

  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${percent}%` }]} />
    </View>
  );
}

export function Header({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  const { styles } = useLearningTheme();

  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function CourseCard({ course }: { course: MobileCourseListItem }) {
  const { language, t } = usePreferences();
  const { styles } = useLearningTheme();
  const goToCourse = () =>
    router.push({
      pathname: "/courses/[courseId]",
      params: { courseId: course.id },
    });
  const goToLesson = () => {
    if (!course.continueLessonId) {
      goToCourse();
      return;
    }

    router.push({
      pathname: "/lessons/[lessonId]",
      params: { lessonId: course.continueLessonId },
    });
  };
  const dateLocale = language === "th" ? "th-TH" : "en-US";

  return (
    <Pressable
      onPress={goToCourse}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.courseCover}>
        {course.coverImageUrl ? (
          <Image
            alt={`${course.title} cover`}
            source={{ uri: resolvePublicUrl(course.coverImageUrl) }}
            style={styles.coverImage}
          />
        ) : (
          <View style={styles.coverFallback}>
            <Text style={styles.coverFallbackText}>KA</Text>
          </View>
        )}
        <View style={styles.courseBadge}>
          <Text style={styles.courseBadgeText}>{course.subject}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{course.title}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {course.description}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {course.lessonCount} {t("lessons")}
          </Text>
          <Text style={styles.metaText}>{course.level}</Text>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {t("progress")} {course.progressPercent}%
          </Text>
          {course.expiresAt ? (
            <Text style={styles.expiryText}>
              {t("expires")} {new Date(course.expiresAt).toLocaleDateString(dateLocale)}
            </Text>
          ) : null}
        </View>
        <ProgressBar value={course.progressPercent} />
        <PrimaryButton title={t("continue")} onPress={goToLesson} style={styles.cardButton} />
      </View>
    </Pressable>
  );
}

export function LessonRow({
  lesson,
  onPress,
}: {
  lesson: MobileLessonListItem;
  onPress: () => void;
}) {
  const { t } = usePreferences();
  const { styles } = useLearningTheme();

  return (
    <Pressable
      disabled={lesson.locked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.lessonRow,
        lesson.completed && styles.lessonCompleted,
        lesson.locked && styles.lessonLocked,
        pressed && !lesson.locked && styles.pressed,
      ]}>
      <View style={styles.lessonNumber}>
        <Text style={styles.lessonNumberText}>{lesson.epNumber}</Text>
      </View>
      <View style={styles.lessonText}>
        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        <Text style={styles.lessonMeta}>{lesson.durationLabel}</Text>
      </View>
      <Text style={lesson.completed ? styles.doneText : styles.openText}>
        {lesson.completed ? t("completed") : lesson.locked ? t("locked") : t("open")}
      </Text>
    </Pressable>
  );
}

export function ChapterBlock({
  chapter,
  expanded,
  onToggle,
}: {
  chapter: MobileChapterDetail;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = usePreferences();
  const { styles } = useLearningTheme();

  return (
    <View style={styles.chapterBlock}>
      <Pressable onPress={onToggle} style={styles.chapterHeader}>
        <View style={styles.chapterHeading}>
          <Text style={styles.chapterTitle}>{chapter.title}</Text>
          <Text style={styles.lessonMeta}>
            {chapter.completedLessonCount}/{chapter.lessonCount} {t("lessons")}
          </Text>
        </View>
        <Text style={styles.chevron}>{expanded ? "−" : "+"}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.lessonList}>
          {chapter.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              onPress={() =>
                router.push({
                  pathname: "/lessons/[lessonId]",
                  params: { lessonId: lesson.id },
                })
              }
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(palette: Palette, isDark: boolean) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    themeFade: {
      flex: 1,
    },
    screenPadded: {
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    preferenceBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 18,
    },
    brandMark: {
      alignItems: "center",
      justifyContent: "center",
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: isDark ? "#071b32" : palette.surface,
      shadowColor: palette.glow,
      shadowOpacity: isDark ? 0.32 : 0.12,
      shadowRadius: isDark ? 18 : 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: isDark ? 8 : 3,
    },
    brandMarkText: {
      color: palette.brand,
      fontFamily: font.extraBold,
      fontSize: 15,
    },
    toggleGroup: {
      flexDirection: "row",
      gap: 8,
    },
    toggleButton: {
      minWidth: 46,
      minHeight: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: isDark ? "rgba(13, 42, 76, 0.78)" : palette.surface,
      paddingHorizontal: 12,
      paddingVertical: 9,
      shadowColor: palette.glow,
      shadowOpacity: isDark ? 0.26 : 0.08,
      shadowRadius: isDark ? 16 : 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: isDark ? 6 : 2,
    },
    toggleButtonActive: {
      borderColor: palette.brand,
      backgroundColor: isDark ? "rgba(56, 189, 248, 0.2)" : palette.brandSoft,
    },
    toggleText: {
      color: palette.brandDark,
      fontFamily: font.extraBold,
      fontSize: 12,
    },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    mutedText: {
      color: palette.muted,
      fontFamily: font.regular,
      fontSize: 14,
      lineHeight: 22,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 18,
    },
    headerText: {
      flex: 1,
    },
    eyebrow: {
      color: palette.brand,
      fontFamily: font.extraBold,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    title: {
      color: palette.ink,
      fontFamily: font.extraBold,
      fontSize: 28,
      lineHeight: 36,
    },
    card: {
      overflow: "hidden",
      borderRadius: 22,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      shadowColor: palette.glow,
      shadowOpacity: isDark ? 0.3 : 0.09,
      shadowRadius: isDark ? 24 : 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: isDark ? 9 : 3,
    },
    cardBody: {
      gap: 10,
      padding: 16,
    },
    courseCover: {
      height: 158,
      backgroundColor: palette.brandSoft,
    },
    coverImage: {
      height: "100%",
      width: "100%",
    },
    coverFallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#071b32" : palette.brand,
    },
    coverFallbackText: {
      color: "#ffffff",
      fontFamily: font.extraBold,
      fontSize: 34,
    },
    courseBadge: {
      position: "absolute",
      left: 12,
      bottom: 12,
      borderRadius: 999,
      backgroundColor: isDark ? "rgba(6, 16, 31, 0.82)" : "rgba(15, 63, 149, 0.88)",
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    courseBadgeText: {
      color: "#ffffff",
      fontFamily: font.extraBold,
      fontSize: 12,
    },
    cardTitle: {
      color: palette.ink,
      fontFamily: font.extraBold,
      fontSize: 19,
      lineHeight: 27,
    },
    cardDescription: {
      color: palette.muted,
      fontFamily: font.regular,
      fontSize: 14,
      lineHeight: 22,
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    metaText: {
      borderRadius: 999,
      backgroundColor: palette.chipBg,
      color: palette.chipText,
      overflow: "hidden",
      paddingHorizontal: 10,
      paddingVertical: 5,
      fontFamily: font.bold,
      fontSize: 12,
    },
    progressRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    progressText: {
      color: palette.ink,
      fontFamily: font.bold,
      fontSize: 13,
    },
    expiryText: {
      color: palette.muted,
      fontFamily: font.regular,
      fontSize: 12,
    },
    progressTrack: {
      height: 9,
      overflow: "hidden",
      borderRadius: 999,
      backgroundColor: isDark ? "#132b45" : "#d8e7fb",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: palette.brand,
    },
    primaryButton: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: palette.brand,
      paddingHorizontal: 16,
      paddingVertical: 12,
      shadowColor: palette.glow,
      shadowOpacity: isDark ? 0.36 : 0.18,
      shadowRadius: isDark ? 18 : 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: isDark ? 8 : 3,
    },
    primaryButtonText: {
      color: isDark ? "#04101f" : "#ffffff",
      fontFamily: font.extraBold,
      fontSize: 15,
    },
    secondaryButton: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    secondaryButtonText: {
      color: palette.brandDark,
      fontFamily: font.extraBold,
      fontSize: 14,
    },
    cardButton: {
      marginTop: 2,
    },
    disabledButton: {
      opacity: 0.55,
    },
    pressed: {
      opacity: 0.76,
      transform: [{ scale: 0.99 }],
    },
    emptyCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      padding: 18,
      gap: 8,
      shadowColor: palette.glow,
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: isDark ? 18 : 10,
      shadowOffset: { width: 0, height: 8 },
      elevation: isDark ? 5 : 1,
    },
    emptyTitle: {
      color: palette.ink,
      fontFamily: font.extraBold,
      fontSize: 18,
    },
    emptyDescription: {
      color: palette.muted,
      fontFamily: font.regular,
      fontSize: 14,
      lineHeight: 22,
    },
    chapterBlock: {
      overflow: "hidden",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      shadowColor: palette.glow,
      shadowOpacity: isDark ? 0.22 : 0.06,
      shadowRadius: isDark ? 18 : 10,
      shadowOffset: { width: 0, height: 8 },
      elevation: isDark ? 6 : 1,
    },
    chapterHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 15,
    },
    chapterHeading: {
      flex: 1,
      gap: 2,
    },
    chapterTitle: {
      color: palette.ink,
      fontFamily: font.extraBold,
      fontSize: 16,
      lineHeight: 24,
    },
    chevron: {
      color: palette.brand,
      fontFamily: font.extraBold,
      fontSize: 26,
    },
    lessonList: {
      borderTopWidth: 1,
      borderTopColor: palette.border,
      padding: 9,
      gap: 8,
    },
    lessonRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 16,
      backgroundColor: palette.surfaceAlt,
      padding: 10,
    },
    lessonCompleted: {
      backgroundColor: isDark ? "rgba(52, 211, 153, 0.12)" : "#eefdf6",
    },
    lessonLocked: {
      opacity: 0.55,
    },
    lessonNumber: {
      alignItems: "center",
      justifyContent: "center",
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: palette.brand,
    },
    lessonNumberText: {
      color: isDark ? "#04101f" : "#ffffff",
      fontFamily: font.extraBold,
    },
    lessonText: {
      flex: 1,
      gap: 2,
    },
    lessonTitle: {
      color: palette.ink,
      fontFamily: font.bold,
      fontSize: 14,
      lineHeight: 21,
    },
    lessonMeta: {
      color: palette.muted,
      fontFamily: font.regular,
      fontSize: 12,
    },
    doneText: {
      color: palette.success,
      fontFamily: font.extraBold,
      fontSize: 12,
    },
    openText: {
      color: palette.brand,
      fontFamily: font.extraBold,
      fontSize: 12,
    },
  });
}
