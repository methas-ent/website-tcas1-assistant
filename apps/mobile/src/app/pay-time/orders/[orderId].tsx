import { ApiError } from "@knowledge/api-client";
import type { PayTimeOrderResponse } from "@knowledge/shared";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

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

const POLL_INTERVAL_MS = 30_000;

type OrderRecord = PayTimeOrderResponse["order"];

function statusLabel(status: string, t: ReturnType<typeof usePreferences>["t"]) {
  switch (status) {
    case "APPROVED":
      return t("payTimeApproved");
    case "REJECTED":
      return t("payTimeRejected");
    default:
      return t("payTimePending");
  }
}

function formatPriceThb(priceCents: number) {
  return (priceCents / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRemaining(target: Date) {
  const ms = target.getTime() - Date.now();

  if (ms <= 0) {
    return "—";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days} วัน ${hours} ชม.`;
  }

  return `${hours} ชม. ${minutes} นาที`;
}

export default function PayTimeOrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { api, loading, session, logout } = useAuth();
  const { t } = usePreferences();
  const { palette } = useLearningTheme();
  const styles = createStyles(palette);

  const normalizedOrderId = useMemo(
    () => (Array.isArray(orderId) ? orderId[0] : orderId),
    [orderId],
  );

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = useCallback(
    async (silent = false) => {
      if (!normalizedOrderId) {
        return;
      }

      if (!silent) {
        setRefreshing(true);
      }

      try {
        const response = await api.getPayTimeOrder(normalizedOrderId);
        setOrder(response.order);
        setError(null);
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) {
          await logout();
          return;
        }

        setError(cause instanceof Error ? cause.message : t("loadFailed"));
      } finally {
        if (!silent) {
          setRefreshing(false);
        }
      }
    },
    [api, logout, normalizedOrderId, t],
  );

  useEffect(() => {
    if (session) {
      void fetchOrder(false);
    }
  }, [fetchOrder, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const interval = setInterval(() => {
      void fetchOrder(true);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchOrder, session]);

  if (loading) {
    return <LoadingState />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!order && !error) {
    return <LoadingState />;
  }

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOrder(false)}
            tintColor={palette.brand}
          />
        }
      >
        <Header
          eyebrow="Pay Time"
          title={t("payTimeStatusHeading")}
          action={
            <SecondaryButton
              title={t("back")}
              onPress={() => goBackOrReplace()}
            />
          }
        />

        {error ? (
          <EmptyState title={t("loadFailed")} description={error} />
        ) : null}

        {order ? (
          <View style={styles.card}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{statusLabel(order.status, t)}</Text>
            </View>
            <Text style={styles.cardTitle}>{order.title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t("payTimePriceLabel")}</Text>
              <Text style={styles.metaValue}>
                {formatPriceThb(order.priceCents)} {order.currency}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t("payTimeHoursLabel")}</Text>
              <Text style={styles.metaValue}>{order.hours}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>เลขที่คำสั่งซื้อ</Text>
              <Text style={styles.metaValue}>{order.id}</Text>
            </View>

            {order.status === "APPROVED" && order.extension ? (
              <View style={styles.approvedBox}>
                <Text style={styles.approvedLabel}>{t("payTimeRemaining")}</Text>
                <Text style={styles.approvedValue}>
                  {formatRemaining(new Date(order.extension.expiresAt))}
                </Text>
                <PrimaryButton
                  title={t("payTimeBackToLesson")}
                  onPress={() =>
                    router.replace({
                      pathname: "/lessons/[lessonId]",
                      params: { lessonId: order.lessonId },
                    })
                  }
                />
              </View>
            ) : null}

            <SecondaryButton
              title={t("payTimeRefresh")}
              onPress={() => fetchOrder(false)}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function createStyles(palette: ReturnType<typeof useLearningTheme>["palette"]) {
  return StyleSheet.create({
    content: {
      gap: 16,
      paddingHorizontal: 18,
      paddingVertical: 14,
      paddingBottom: 36,
    },
    card: {
      gap: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      padding: 18,
    },
    statusBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: palette.brandSoft,
    },
    statusText: {
      color: palette.brandDark,
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 12,
    },
    cardTitle: {
      color: palette.ink,
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 18,
    },
    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    metaLabel: {
      color: palette.muted,
      fontFamily: "Prompt_500Medium",
      fontSize: 13,
    },
    metaValue: {
      color: palette.ink,
      fontFamily: "Prompt_700Bold",
      fontSize: 14,
    },
    approvedBox: {
      gap: 8,
      padding: 14,
      borderRadius: 16,
      backgroundColor: palette.brandSoft,
    },
    approvedLabel: {
      color: palette.muted,
      fontFamily: "Prompt_500Medium",
      fontSize: 13,
    },
    approvedValue: {
      color: palette.brandDark,
      fontFamily: "Prompt_800ExtraBold",
      fontSize: 22,
    },
  });
}
