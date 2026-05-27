export const CART_STORAGE_KEY = "vdo-cart-items-v2";
export const LEGACY_CART_STORAGE_KEY = "vdo-cart-package-ids";

export type CartItemType = "package" | "course";

export type CartItem = {
  type: CartItemType;
  id: string;
};

function isCartItemType(value: unknown): value is CartItemType {
  return value === "package" || value === "course";
}

function sanitizeItems(values: unknown[]): CartItem[] {
  const seen = new Set<string>();
  const result: CartItem[] = [];

  for (const value of values) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const record = value as Record<string, unknown>;
    const type = record.type;
    const id = record.id;

    if (!isCartItemType(type) || typeof id !== "string" || !id) {
      continue;
    }

    const key = `${type}:${id}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({ type, id });
  }

  return result;
}

function migrateLegacyIfNeeded(): CartItem[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_CART_STORAGE_KEY);

    if (!legacyRaw) {
      return null;
    }

    const parsed = JSON.parse(legacyRaw);
    const items: CartItem[] = Array.isArray(parsed)
      ? sanitizeItems(
          parsed.map((value) =>
            typeof value === "string"
              ? { type: "package" as CartItemType, id: value }
              : value,
          ),
        )
      : [];

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);

    return items;
  } catch {
    try {
      window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
    } catch {
      // ignore
    }

    return null;
  }
}

export function readCartItems(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);

    if (raw === null) {
      const migrated = migrateLegacyIfNeeded();
      return migrated ?? [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sanitizeItems(parsed) : [];
  } catch {
    return [];
  }
}

export function writeCartItems(items: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  const sanitized = sanitizeItems(items);
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(sanitized));
  window.dispatchEvent(new Event("vdo-cart-updated"));
}

export function addCartItem(item: CartItem) {
  writeCartItems([...readCartItems(), item]);
}

export function addCartPackage(packageId: string) {
  addCartItem({ type: "package", id: packageId });
}

export function addCartCourse(courseId: string) {
  addCartItem({ type: "course", id: courseId });
}

export function removeCartItem(item: CartItem) {
  writeCartItems(
    readCartItems().filter(
      (entry) => !(entry.type === item.type && entry.id === item.id),
    ),
  );
}

export function removeCartPackage(packageId: string) {
  removeCartItem({ type: "package", id: packageId });
}

export function removeCartCourse(courseId: string) {
  removeCartItem({ type: "course", id: courseId });
}

export function clearCartItems() {
  writeCartItems([]);
}

/** @deprecated use clearCartItems */
export function clearCartPackages() {
  clearCartItems();
}

/** @deprecated use readCartItems and filter by type === "package" */
export function readCartPackageIds(): string[] {
  return readCartItems()
    .filter((item) => item.type === "package")
    .map((item) => item.id);
}

/** @deprecated use writeCartItems with mixed payload */
export function writeCartPackageIds(packageIds: string[]) {
  const existing = readCartItems().filter((item) => item.type !== "package");
  const next: CartItem[] = [
    ...existing,
    ...Array.from(new Set(packageIds)).map((id) => ({
      type: "package" as CartItemType,
      id,
    })),
  ];
  writeCartItems(next);
}
