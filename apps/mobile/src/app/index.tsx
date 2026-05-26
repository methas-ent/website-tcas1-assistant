import { ApiError } from "@knowledge/api-client";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text } from "react-native";

import {
  CourseCard,
  EmptyState,
  Header,
  LoadingState,
  Screen,
  SecondaryButton,
  useLearningTheme,
} from "@/components/learning-ui";
import { useAuth } from "@/features/auth/auth-context";
import { usePreferences } from "@/features/preferences/preferences-context";
import type { MobileCourseListItem } from "@knowledge/shared";

export default function MyCoursesScreen() {
  const { api, loading, session, logout, user } = useAuth();
  const { t } = usePreferences();
  const { styles } = useLearningTheme();
  const [courses, setCourses] = useState<MobileCourseListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setError(null);

    try {
      const result = await api.getMyCourses();
      setCourses(result.courses);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await logout();
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : t("loadFailed"),
      );
    }
  }, [api, logout, t]);

  useEffect(() => {
    if (session) {
      void loadCourses();
    }
  }, [loadCourses, session]);

  const refresh = async () => {
    setRefreshing(true);
    await loadCourses();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingState label={t("loadingApp")} />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Screen>
      <Header
        eyebrow={t("appEyebrow")}
        title={t("myCourses")}
        action={<SecondaryButton title={t("logout")} onPress={logout} />}
      />
      <Text style={[styles.mutedText, { marginBottom: 14 }]}>
        {t("greetingPrefix")} {user?.name ?? "Student"} · {t("myCoursesHint")}
      </Text>
      {error ? (
        <EmptyState title={t("loadFailed")} description={error} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(course) => course.id}
          renderItem={({ item }) => <CourseCard course={item} />}
          contentContainerStyle={{ gap: 16, paddingBottom: 28 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
          ListEmptyComponent={
            <EmptyState
              title={t("emptyCoursesTitle")}
              description={t("emptyCoursesDescription")}
            />
          }
        />
      )}
    </Screen>
  );
}
