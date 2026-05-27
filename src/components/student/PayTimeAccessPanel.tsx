"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  PayTimeModal,
  type PayTimeStatusResponse,
} from "@/components/student/PayTimeModal";

export type PayTimeAccessPanelProps = {
  lessonId: string;
  accessSource: "ENROLLMENT" | "PAY_TIME";
  payTimeExpiresAt: string | null;
  userName: string;
  userEmail: string;
};

const NEAR_EXPIRY_HOURS = 6;

function diffParts(target: Date) {
  const ms = target.getTime() - Date.now();

  if (ms <= 0) {
    return null;
  }

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

function formatCountdown(target: Date) {
  const parts = diffParts(target);

  if (!parts) {
    return "หมดเวลาแล้ว";
  }

  if (parts.days > 0) {
    return `${parts.days} วัน ${parts.hours} ชั่วโมง`;
  }

  return `${parts.hours} ชั่วโมง ${parts.minutes} นาที ${parts.seconds} วินาที`;
}

export function PayTimeAccessPanel({
  lessonId,
  accessSource,
  payTimeExpiresAt,
  userName,
  userEmail,
}: PayTimeAccessPanelProps) {
  const [status, setStatus] = useState<PayTimeStatusResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  const fetchStatus = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/pay-time/lessons/${encodeURIComponent(lessonId)}/status`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        setStatus(null);
        return;
      }

      const payload = (await response.json()) as PayTimeStatusResponse;
      setStatus(payload);
    } catch (error) {
      console.error(error);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);

    return () => window.clearInterval(interval);
  }, []);

  const payTimeExpiry = useMemo(() => {
    if (!payTimeExpiresAt) {
      return null;
    }

    const date = new Date(payTimeExpiresAt);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [payTimeExpiresAt]);

  const activeExtensionExpiry = useMemo(() => {
    if (!status?.activeExtension) {
      return null;
    }

    const date = new Date(status.activeExtension.expiresAt);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [status]);

  const expiryToShow = payTimeExpiry ?? activeExtensionExpiry;

  const expiringSoon = useMemo(() => {
    if (!expiryToShow) {
      return false;
    }

    return expiryToShow.getTime() - now.getTime() < NEAR_EXPIRY_HOURS * 3600 * 1000;
  }, [expiryToShow, now]);

  const eligible = status?.eligibility === "OK";
  const hasPending = Boolean(status?.pendingOrderId);

  const shouldShowBanner =
    accessSource === "PAY_TIME" || expiringSoon || eligible;

  if (loading && !status) {
    return null;
  }

  if (!shouldShowBanner) {
    return null;
  }

  const headline =
    accessSource === "PAY_TIME"
      ? "คุณกำลังใช้สิทธิ์ Pay Time"
      : expiringSoon
        ? "เวลาดูใกล้หมด"
        : "เปิดให้ซื้อเวลาดูเพิ่ม";

  const description =
    accessSource === "PAY_TIME"
      ? "บทเรียนนี้เปิดผ่านสิทธิ์ Pay Time ที่ซื้อไว้"
      : expiringSoon
        ? "ซื้อเวลาดูเพิ่มเพื่อให้ดูบทเรียนนี้ได้ต่อ"
        : "ขยายเวลาดูบทเรียนนี้ได้ทันที โดยไม่กระทบสิทธิ์คอร์สเดิม";

  return (
    <>
      <Card
        variant={accessSource === "PAY_TIME" || expiringSoon ? "danger" : "soft"}
        padding="md"
        className="mb-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">
              Pay Time
            </p>
            <p className="mt-1 font-heading text-lg font-bold text-ink">
              {headline}
            </p>
            <p className="mt-1 text-sm text-ink-muted">{description}</p>
            {expiryToShow ? (
              <p className="mt-2 text-sm font-semibold text-ink">
                เหลือเวลา: {formatCountdown(expiryToShow)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasPending ? (
              <Button variant="outline" disabled>
                รอตรวจสอบ
              </Button>
            ) : eligible ? (
              <Button onClick={() => setModalOpen(true)}>ซื้อเวลาดูเพิ่ม</Button>
            ) : null}
          </div>
        </div>
      </Card>

      {eligible ? (
        <PayTimeModal
          open={modalOpen}
          lessonId={lessonId}
          defaultName={userName}
          defaultEmail={userEmail}
          status={status}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) {
              void fetchStatus();
            }
          }}
          onSubmitted={() => {
            void fetchStatus();
          }}
        />
      ) : null}
    </>
  );
}
