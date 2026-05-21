export const CART_STORAGE_KEY = "vdo-cart-package-ids";

export function readCartPackageIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeCartPackageIds(packageIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(Array.from(new Set(packageIds))),
  );
  window.dispatchEvent(new Event("vdo-cart-updated"));
}

export function addCartPackage(packageId: string) {
  writeCartPackageIds([...readCartPackageIds(), packageId]);
}

export function removeCartPackage(packageId: string) {
  writeCartPackageIds(readCartPackageIds().filter((id) => id !== packageId));
}

export function clearCartPackages() {
  writeCartPackageIds([]);
}
