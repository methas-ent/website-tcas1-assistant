import { ApiError } from "@knowledge/api-client";
import type { MobileLessonContext, PlaybackAuthorizeResponse } from "@knowledge/shared";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  Header,
  LessonRow,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
  useLearningTheme,
} from "@/components/learning-ui";
import { ProtectedContentNotice } from "@/components/ProtectedContentNotice";
import { ProtectedVideoPlayer } from "@/components/protected-video-player";
import { useAuth } from "@/features/auth/auth-context";
import { usePreferences } from "@/features/preferences/preferences-context";
import { goBackOrReplace } from "@/lib/navigation";

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { api, loading, session, logout } = useAuth();
  const { t } = usePreferences();
  const { palette, isDark } = useLearningTheme();
  const styles = createLessonStyles(palette, isDark);
  const [lessonContext, setLessonContext] = useState<MobileLessonContext | null>(
    null,
  );
  const [playback, setPlayback] = useState<PlaybackAuthorizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completeMessage, setCompleteMessage] = useState<string | null>(null);

  const normalizedLessonId = useMemo(
    () => (Array.isArray(lessonId) ? lessonId[0] : lessonId),
    [lessonId],
  );

  const loadLesson = useCallback(async () => {
    if (!normalizedLessonId) {
      return;
    }

    setError(null);
    setPlayback(null);

    try {
      const [lessonResult, playbackResult] = await Promise.all([
        api.getLesson(normalizedLessonId),
        api.authorizePlayback(normalizedLessonId).catch((requestError) => {
          if (requestError instanceof ApiError && requestError.code === "NO_VIDEO") {
            return null;
          }

          throw requestError;
        }),
      ]);

      setLessonContext(lessonResult);
      setPlayback(playbackResult);
      void api.updateProgress({
        lessonId: normalizedLessonId,
        progressSeconds: lessonResult.lesson.progressSeconds,
      });
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await logout();
        return;
      }

      setError(
        requestError instanceof ApiError && requestError.status === 403
          ? t("lessonForbidden")
          : requestError instanceof Error
            ? requestError.message
            : t("lessonOpenFailed"),
      );
    }
  }, [api, logout, normalizedLessonId, t]);

  useEffect(() => {
    if (session) {
      void loadLesson();
    }
  }, [loadLesson, session]);

  const markComplete = async () => {
    if (!lessonContext || !normalizedLessonId) {
      return;
    }

    await api.updateProgress({
      lessonId: normalizedLessonId,
      completed: true,
      progressSeconds: lessonContext.lesson.durationSeconds ?? 0,
    });
    setCompleteMessage(t("completeSaved"));
  };

  const goBackToCourse = () => {
    if (lessonContext?.course.id) {
      goBackOrReplace({
        pathname: "/courses/[courseId]",
        params: { courseId: lessonContext.course.id },
      });
      return;
    }

    goBackOrReplace();
  };

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
          eyebrow="Lesson"
          title={t("accessDenied")}
          action={<SecondaryButton title={t("back")} onPress={goBackToCourse} />}
        />
        <EmptyState title={t("accessDenied")} description={error} />
      </Screen>
    );
  }

  if (!lessonContext || !normalizedLessonId) {
    return <LoadingState label={t("loadingLesson")} />;
  }

  const chapterLessons =
    lessonContext.chapters.find(
      (chapter) => chapter.id === lessonContext.chapter.id,
    )?.lessons ?? [];

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Header
          eyebrow={lessonContext.course.title}
          title={lessonContext.lesson.title}
          action={<SecondaryButton title={t("back")} onPress={goBackToCourse} />}
        />
        <ProtectedContentNotice />
        <ProtectedVideoPlayer playback={playback} lessonId={normalizedLessonId} />
        <View style={styles.infoCard}>
          <Text style={styles.chapterTitle}>{lessonContext.chapter.title}</Text>
          <Text style={styles.lessonMeta}>
            {lessonContext.lesson.durationLabel} • {t("protectedRoute")}
          </Text>
          {completeMessage ? (
            <Text style={styles.successText}>{completeMessage}</Text>
          ) : null}
          <PrimaryButton title={t("markComplete")} onPress={markComplete} />
        </View>
        <View style={styles.navRow}>
          <SecondaryButton
            title={t("previousLesson")}
            onPress={() => {
              if (lessonContext.previousLessonId) {
                router.replace({
                  pathname: "/lessons/[lessonId]",
                  params: { lessonId: lessonContext.previousLessonId },
                });
              }
            }}
          />
          <SecondaryButton
            title={t("nextLesson")}
            onPress={() => {
              if (lessonContext.nextLessonId) {
                router.replace({
                  pathname: "/lessons/[lessonId]",
                  params: { lessonId: lessonContext.nextLessonId },
                });
              }
            }}
          />
        </View>
        <View style={styles.lessonList}>
          <Text style={styles.sectionTitle}>{t("chapterLessons")}</Text>
          {chapterLessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              onPress={() =>
                router.replace({
                  pathname: "/lessons/[lessonId]",
                  params: { lessonId: lesson.id },
                })
              }
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function createLessonStyles(
  palette: ReturnType<typeof useLearningTheme>["palette"],
  isDark: boolean,
) {
  return StyleSheet.create({
    content: {
      gap: 16,
      paddingHorizontal: 18,
      paddingVertical: 14,
      paddingBottom: 34,
    },
    infoCard: {
      gap: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      padding: 16,
      shadowColor: palette.glow,
      shadowOpacity: isDark ? 0.24 : 0.06,
      shadowRadius: isDark ? 18 : 10,
      shadowOffset: { width: 0, height: 8 },
      elevation: isDark ? 7 : 1,
    },
    chapterTitle: {
      color: palette.ink,
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 17,
      lineHeight: 25,
    },
    lessonMeta: {
      color: palette.muted,
      fontFamily: "Prompt_400Regular",
      fontSize: 13,
      lineHeight: 20,
    },
    successText: {
      color: palette.success,
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 13,
    },
    navRow: {
      flexDirection: "row",
      gap: 10,
    },
    lessonList: {
      gap: 10,
    },
    sectionTitle: {
      color: palette.ink,
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 17,
    },
  });
}
