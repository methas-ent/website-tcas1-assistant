import * as SecureStore from "expo-secure-store";
import type { MobileUser } from "@knowledge/shared";
import { Platform } from "react-native";

const SESSION_KEY = "knowledge.mobile.session";

export type StoredSession = {
  sessionToken: string;
  expiresAt: string;
  user: MobileUser;
};

function webStorage() {
  if (Platform.OS !== "web") {
    return null;
  }

  if (typeof window === "undefined") {
    return "unavailable";
  }

  try {
    return window.localStorage;
  } catch {
    return "unavailable";
  }
}

async function getSessionValue() {
  const storage = webStorage();

  if (storage === "unavailable") {
    return null;
  }

  if (storage) {
    try {
      return storage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  }

  return SecureStore.getItemAsync(SESSION_KEY);
}

async function setSessionValue(value: string) {
  const storage = webStorage();

  if (storage === "unavailable") {
    return;
  }

  if (storage) {
    try {
      storage.setItem(SESSION_KEY, value);
    } catch {
      // Browser storage can be blocked in private/sandboxed contexts.
    }
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, value);
}

async function deleteSessionValue() {
  const storage = webStorage();

  if (storage === "unavailable") {
    return;
  }

  if (storage) {
    try {
      storage.removeItem(SESSION_KEY);
    } catch {
      // Browser storage can be blocked in private/sandboxed contexts.
    }
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function readStoredSession() {
  const raw = await getSessionValue();

  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as StoredSession;

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await clearStoredSession();
      return null;
    }

    return session;
  } catch {
    await clearStoredSession();
    return null;
  }
}

export async function saveStoredSession(session: StoredSession) {
  await setSessionValue(JSON.stringify(session));
}

export async function clearStoredSession() {
  await deleteSessionValue();
}
