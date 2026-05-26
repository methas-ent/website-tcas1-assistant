import { ApiError } from "@knowledge/api-client";
import { Redirect } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton, Screen, useLearningTheme } from "@/components/learning-ui";
import { useAuth } from "@/features/auth/auth-context";
import { usePreferences } from "@/features/preferences/preferences-context";

export default function LoginScreen() {
  const { login, loading, session } = useAuth();
  const { t } = usePreferences();
  const { palette, styles: uiStyles, isDark } = useLearningTheme();
  const styles = createLoginStyles(palette, isDark);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await login(email, password);
    } catch (loginError) {
      if (loginError instanceof ApiError && loginError.code === "INVALID_CREDENTIALS") {
        setError(t("invalidCredentials"));
      } else {
        setError(
          loginError instanceof Error
            ? loginError.message
            : t("loginFailed"),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && session) {
    return <Redirect href="/" />;
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}>
        <View style={styles.hero}>
          <Text style={styles.brand}>Knowledge Academy</Text>
          <Text style={styles.title}>{t("loginTitle")}</Text>
          <Text style={styles.description}>
            {t("loginDescription")}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t("email")}</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="student@example.com"
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={email}
          />
          <Text style={styles.label}>{t("password")}</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={palette.muted}
            secureTextEntry
            style={styles.input}
            value={password}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            disabled={submitting || !email.trim() || !password}
            onPress={submit}
            title={submitting ? t("loggingIn") : t("login")}
          />
          <Pressable disabled style={styles.noteButton}>
            <Text style={uiStyles.mutedText}>{t("checkoutOnWeb")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function createLoginStyles(
  palette: ReturnType<typeof useLearningTheme>["palette"],
  isDark: boolean,
) {
  return StyleSheet.create({
    keyboard: {
      flex: 1,
      justifyContent: "center",
      gap: 28,
    },
    hero: {
      gap: 10,
    },
    brand: {
      color: palette.brand,
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 13,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    title: {
      color: palette.ink,
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 34,
      lineHeight: 44,
    },
    description: {
      color: palette.muted,
      fontFamily: "Prompt_400Regular",
      fontSize: 15,
      lineHeight: 24,
    },
    form: {
      gap: 12,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      padding: 18,
      shadowColor: palette.glow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.32 : 0.1,
      shadowRadius: isDark ? 26 : 20,
      elevation: isDark ? 10 : 3,
    },
    label: {
      color: palette.ink,
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 13,
    },
    input: {
      minHeight: 50,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
      color: palette.ink,
      paddingHorizontal: 14,
      fontFamily: "Prompt_500Medium",
      fontSize: 15,
    },
    error: {
      color: palette.danger,
      fontFamily: "Prompt_600SemiBold",
      fontSize: 13,
      lineHeight: 20,
    },
    noteButton: {
      alignItems: "center",
      paddingTop: 4,
    },
  });
}
