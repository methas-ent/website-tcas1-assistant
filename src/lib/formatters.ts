export function formatPrice(cents: number, currency = "THB") {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatCompactDuration(seconds: number) {
  if (!seconds) {
    return "ดูได้ตามเวลาเรียน";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours} ชม. ${minutes} นาที` : `${hours} ชม.`;
  }

  return `${minutes} นาที`;
}
