import { ApiError } from "@knowledge/api-client";
import type { MobileCourseDetail } from "@knowledge/shared";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  ChapterBlock,
  EmptyState,
  Header,
  LoadingState,
  ProgressBar,
  Screen,
  SecondaryButton,
  useLearningTheme,
} from "@/components/learning-ui";
import { useAuth } from "@/features/auth/auth-context";
import { usePreferences } from "@/features/preferences/preferences-context";

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { api, loading, session, logout } = useAuth();
  const { t } = usePreferences();
  const { palette, isDark } = useLearningTheme();
  const styles = createCourseStyles(palette, isDark);
  const [course, setCourse] = useState<MobileCourseDetail | null>(null);
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedCourseId = useMemo(
    () => (Array.isArray(courseId) ? courseId[0] : courseId),
    [courseId],
  );

  const loadCourse = useCallback(async () => {
    if (!normalizedCourseId) {
      return;
    }

    setError(null);

    try {
      const result = await api.getCourse(normalizedCourseId);
      setCourse(result.course);
      setExpandedChapterId(result.course.chapters[0]?.id ?? null);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await logout();
        return;
      }

      setError(
        requestError instanceof ApiError && requestError.status === 403
          ? t("courseForbidden")
          : requestError instanceof Error
            ? requestError.message
            : t("loadFailed"),
      );
    }
  }, [api, logout, normalizedCourseId, t]);

  useEffect(() => {
    if (session) {
      void loadCourse();
    }
  }, [loadCourse, session]);

  if (loading) {
    return <LoadingState />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (error) {
    return (
      <Screen>
        <Header
          eyebrow="Course"
          title={t("accessDenied")}
          action={<SecondaryButton title={t("back")} onPress={() => router.back()} />}
        />
        <EmptyState title={t("accessDenied")} description={error} />
      </Screen>
    );
  }

  if (!course) {
    return <LoadingState label={t("loadingCourse")} />;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Header
          eyebrow={course.courseCode}
          title={course.title}
          action={<SecondaryButton title={t("back")} onPress={() => router.back()} />}
        />
        <View style={styles.heroCard}>
          <Text style={styles.subject}>{course.subject}</Text>
          <Text style={styles.description}>{course.description}</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>{t("learned")} {course.progressPercent}%</Text>
            <Text style={styles.progressLabel}>
              {course.completedLessonCount}/{course.lessonCount} {t("lessons")}
            </Text>
          </View>
          <ProgressBar value={course.progressPercent} />
        </View>
        <View style={styles.chapterList}>
          {course.chapters.length === 0 ? (
            <EmptyState
              title={t("noLessonsTitle")}
              description={t("noLessonsDescription")}
            />
          ) : (
            course.chapters.map((chapter) => (
              <ChapterBlock
                key={chapter.id}
                chapter={chapter}
                expanded={expandedChapterId === chapter.id}
                onToggle={() =>
                  setExpandedChapterId((current) =>
                    current === chapter.id ? null : chapter.id,
                  )
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function createCourseStyles(
  palette: ReturnType<typeof useLearningTheme>["palette"],
  isDark: boolean,
) {
  return StyleSheet.create({
    content: {
      gap: 16,
      paddingHorizontal: 18,
      paddingVertical: 14,
      paddingBottom: 32,
    },
    heroCard: {
      gap: 12,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: isDark ? "#1e5c8d" : "rgba(255,255,255,0.16)",
      backgroundColor: isDark ? "#071b32" : palette.heroStart,
      padding: 18,
      shadowColor: palette.glow,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: isDark ? 0.38 : 0.2,
      shadowRadius: isDark ? 28 : 18,
      elevation: isDark ? 12 : 4,
    },
    subject: {
      alignSelf: "flex-start",
      borderRadius: 999,
      backgroundColor: isDark ? "rgba(56,189,248,0.16)" : "rgba(255,255,255,0.16)",
      color: "#ffffff",
      overflow: "hidden",
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 12,
    },
    description: {
      color: isDark ? "#c7e9ff" : "#dbeafe",
      fontFamily: "Prompt_400Regular",
      fontSize: 15,
      lineHeight: 24,
    },
    progressRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    progressLabel: {
      color: "#ffffff",
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 13,
    },
    chapterList: {
      gap: 12,
    },
  });
}
