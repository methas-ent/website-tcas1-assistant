import { ApiError } from "@knowledge/api-client";
import type { PayTimeStatusResponse } from "@knowledge/shared";
import * as ImagePicker from "expo-image-picker";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  EmptyState,
  Header,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
  useLearningTheme,
} from "@/components/learning-ui";
import { useAuth } from "@/features/auth/auth-context";
import { usePreferences } from "@/features/preferences/preferences-context";
import { goBackOrReplace } from "@/lib/navigation";

type PickedSlip = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

function formatPriceThb(priceCents: number) {
  return (priceCents / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PayTimeCheckoutScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { api, loading, session, user, logout } = useAuth();
  const { t } = usePreferences();
  const { palette, isDark } = useLearningTheme();
  const styles = createStyles(palette, isDark);

  const normalizedLessonId = useMemo(
    () => (Array.isArray(lessonId) ? lessonId[0] : lessonId),
    [lessonId],
  );

  const [status, setStatus] = useState<PayTimeStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [customerName, setCustomerName] = useState(user?.name ?? "");
  const [customerEmail, setCustomerEmail] = useState(user?.email ?? "");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [slip, setSlip] = useState<PickedSlip | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCustomerName(user?.name ?? "");
    setCustomerEmail(user?.email ?? "");
  }, [user?.email, user?.name]);

  const loadStatus = useCallback(async () => {
    if (!normalizedLessonId) {
      return;
    }

    setLoadingStatus(true);
    setStatusError(null);

    try {
      const result = await api.getPayTimeStatus(normalizedLessonId);
      setStatus(result);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        await logout();
        return;
      }

      setStatusError(
        cause instanceof Error ? cause.message : t("payTimeNotEligible"),
      );
    } finally {
      setLoadingStatus(false);
    }
  }, [api, logout, normalizedLessonId, t]);

  useEffect(() => {
    if (session) {
      void loadStatus();
    }
  }, [loadStatus, session]);

  const pickSlip = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(t("payTimeErrorPermission"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const fileName =
      asset.fileName ?? asset.uri.split("/").pop() ?? `slip-${Date.now()}.jpg`;
    const mimeType =
      asset.mimeType ?? (fileName.toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/jpeg");

    setSlip({
      uri: asset.uri,
      name: fileName,
      mimeType,
      size: asset.fileSize,
    });
    setError(null);
  };

  const submitOrder = async () => {
    if (!normalizedLessonId) {
      return;
    }

    if (!slip) {
      setError(t("payTimeErrorMissingSlip"));
      return;
    }

    if (!customerName.trim() || !customerEmail.trim()) {
      setError(t("payTimeErrorMissingSlip"));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("customerName", customerName.trim());
      form.append("customerEmail", customerEmail.trim());

      if (customerPhone.trim()) {
        form.append("customerPhone", customerPhone.trim());
      }

      if (note.trim()) {
        form.append("note", note.trim());
      }

      // React Native FormData supports the URI form object literal shape.
      form.append("paymentSlip", {
        uri: slip.uri,
        name: slip.name,
        type: slip.mimeType,
      } as unknown as Blob);

      const result = await api.createPayTimeOrder(normalizedLessonId, form);

      router.replace({
        pathname: "/pay-time/orders/[orderId]",
        params: { orderId: result.orderId },
      });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        await logout();
        return;
      }

      setError(cause instanceof Error ? cause.message : t("loadFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (loadingStatus && !status) {
    return <LoadingState />;
  }

  if (statusError || !status) {
    return (
      <Screen>
        <Header
          eyebrow="Pay Time"
          title={t("payTimeTitle")}
          action={
            <SecondaryButton
              title={t("back")}
              onPress={() => goBackOrReplace()}
            />
          }
        />
        <EmptyState
          title={t("payTimeNotEligible")}
          description={statusError ?? t("payTimeNotEligible")}
        />
      </Screen>
    );
  }

  if (status.eligibility !== "OK") {
    return (
      <Screen>
        <Header
          eyebrow="Pay Time"
          title={t("payTimeTitle")}
          action={
            <SecondaryButton
              title={t("back")}
              onPress={() => goBackOrReplace()}
            />
          }
        />
        <EmptyState
          title={t("payTimeNotEligible")}
          description={t("payTimeNotEligible")}
        />
      </Screen>
    );
  }

  if (status.pendingOrderId) {
    return (
      <Screen>
        <Header
          eyebrow="Pay Time"
          title={t("payTimeTitle")}
          action={
            <SecondaryButton
              title={t("back")}
              onPress={() => goBackOrReplace()}
            />
          }
        />
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t("payTimeStatusHeading")}</Text>
          <Text style={styles.summaryValue}>{t("payTimePending")}</Text>
          <PrimaryButton
            title={t("payTimeStatusHeading")}
            onPress={() =>
              router.push({
                pathname: "/pay-time/orders/[orderId]",
                params: { orderId: status.pendingOrderId! },
              })
            }
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Header
          eyebrow="Pay Time"
          title={t("payTimeTitle")}
          action={
            <SecondaryButton
              title={t("back")}
              onPress={() => goBackOrReplace()}
            />
          }
        />

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <View style={styles.priceCell}>
              <Text style={styles.priceCellLabel}>{t("payTimePriceLabel")}</Text>
              <Text style={styles.priceCellValue}>
                {formatPriceThb(status.priceCents)} {status.currency}
              </Text>
            </View>
            <View style={styles.priceCell}>
              <Text style={styles.priceCellLabel}>{t("payTimeHoursLabel")}</Text>
              <Text style={styles.priceCellValue}>{status.hours}</Text>
            </View>
          </View>
          {status.description ? (
            <Text style={styles.priceDescription}>{status.description}</Text>
          ) : null}
        </View>

        <View style={styles.bankCard}>
          <Text style={styles.bankTitle}>QR / โอนเงิน</Text>
          <Text style={styles.bankMeta}>{t("payTimeBankInfo")}</Text>
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrPlaceholderText}>QR Code (ตัวอย่าง)</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>{t("email")}</Text>
          <TextInput
            value={customerEmail}
            onChangeText={setCustomerEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={palette.muted}
          />
          <Text style={styles.fieldLabel}>ชื่อผู้สั่งซื้อ</Text>
          <TextInput
            value={customerName}
            onChangeText={setCustomerName}
            style={styles.input}
            placeholderTextColor={palette.muted}
          />
          <Text style={styles.fieldLabel}>เบอร์โทร (ไม่บังคับ)</Text>
          <TextInput
            value={customerPhone}
            onChangeText={setCustomerPhone}
            style={styles.input}
            keyboardType="phone-pad"
            placeholderTextColor={palette.muted}
          />
          <Text style={styles.fieldLabel}>หมายเหตุ (ไม่บังคับ)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            style={styles.input}
            placeholderTextColor={palette.muted}
          />

          <SecondaryButton title={t("payTimePickSlip")} onPress={pickSlip} />
          {slip ? (
            <Image
              accessibilityIgnoresInvertColors
              alt="slip preview"
              source={{ uri: slip.uri }}
              style={styles.slipPreview}
              resizeMode="cover"
            />
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            title={submitting ? t("payTimeSubmitting") : t("payTimeSubmit")}
            onPress={submitOrder}
            disabled={submitting}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function createStyles(
  palette: ReturnType<typeof useLearningTheme>["palette"],
  isDark: boolean,
) {
  return StyleSheet.create({
    content: {
      gap: 16,
      paddingHorizontal: 18,
      paddingVertical: 14,
      paddingBottom: 36,
    },
    priceCard: {
      gap: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      padding: 16,
    },
    priceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    priceCell: {
      flex: 1,
      gap: 4,
    },
    priceCellLabel: {
      color: palette.muted,
      fontFamily: "Prompt_500Medium",
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    priceCellValue: {
      color: palette.ink,
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 22,
    },
    priceDescription: {
      color: palette.muted,
      fontFamily: "Prompt_400Regular",
      fontSize: 13,
      lineHeight: 20,
    },
    bankCard: {
      gap: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      padding: 16,
    },
    bankTitle: {
      color: palette.ink,
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 16,
    },
    bankMeta: {
      color: palette.muted,
      fontFamily: "Prompt_400Regular",
      fontSize: 13,
    },
    qrPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: palette.border,
      backgroundColor: isDark ? "rgba(56, 189, 248, 0.08)" : "#f5faff",
      paddingVertical: 36,
    },
    qrPlaceholderText: {
      color: palette.muted,
      fontFamily: "Prompt_500Medium",
      fontSize: 13,
    },
    formCard: {
      gap: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      padding: 16,
    },
    fieldLabel: {
      color: palette.ink,
      fontFamily: "Prompt_700Bold",
      fontSize: 13,
    },
    input: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: isDark ? "rgba(56, 189, 248, 0.05)" : "#fafdff",
      color: palette.ink,
      fontFamily: "Prompt_500Medium",
      fontSize: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    slipPreview: {
      width: "100%",
      height: 180,
      borderRadius: 16,
      backgroundColor: palette.border,
    },
    errorText: {
      color: palette.danger,
      fontFamily: "Prompt_700Bold",
      fontSize: 13,
    },
    summaryCard: {
      gap: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      padding: 18,
      margin: 18,
    },
    summaryLabel: {
      color: palette.muted,
      fontFamily: "Prompt_500Medium",
      fontSize: 13,
    },
    summaryValue: {
      color: palette.ink,
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 20,
    },
  });
}
