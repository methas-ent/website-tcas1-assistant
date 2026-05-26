import {
  Prompt_400Regular,
  Prompt_500Medium,
  Prompt_600SemiBold,
  Prompt_700Bold,
  Prompt_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/prompt";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { LoadingState } from "@/components/learning-ui";
import { AuthProvider } from "@/features/auth/auth-context";
import { PreferencesProvider, usePreferences } from "@/features/preferences/preferences-context";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Prompt_400Regular,
    Prompt_500Medium,
    Prompt_600SemiBold,
    Prompt_700Bold,
    Prompt_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <PreferencesProvider>
        <LoadingState label="Loading Knowledge Academy" />
      </PreferencesProvider>
    );
  }

  return (
    <PreferencesProvider>
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </PreferencesProvider>
  );
}

function RootStack() {
  const { themeMode } = usePreferences();
  const backgroundColor = themeMode === "dark" ? "#07111f" : "#f5f8fc";

  return (
    <>
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor },
          headerShown: false,
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="courses/[courseId]" />
        <Stack.Screen name="lessons/[lessonId]" />
      </Stack>
    </>
  );
}
