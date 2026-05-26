import { KnowledgeApiClient } from "@knowledge/api-client";
import type { MobileUser } from "@knowledge/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { API_BASE_URL } from "@/config";
import {
  clearStoredSession,
  readStoredSession,
  saveStoredSession,
  type StoredSession,
} from "./session-storage";

type AuthContextValue = {
  api: KnowledgeApiClient;
  loading: boolean;
  session: StoredSession | null;
  user: MobileUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<StoredSession | null>(null);
  const sessionRef = useRef<StoredSession | null>(null);

  const api = useMemo(
    () =>
      new KnowledgeApiClient({
        baseUrl: API_BASE_URL,
        getSessionToken: () => sessionRef.current?.sessionToken ?? null,
      }),
    [],
  );

  const setActiveSession = useCallback((nextSession: StoredSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const storedSession = await readStoredSession();

      if (mounted) {
        setActiveSession(storedSession);
        setLoading(false);
      }
    }

    void hydrate();

    return () => {
      mounted = false;
    };
  }, [setActiveSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.login(email, password);
      const nextSession: StoredSession = {
        sessionToken: result.sessionToken,
        expiresAt: result.expiresAt,
        user: result.user,
      };

      await saveStoredSession(nextSession);
      setActiveSession(nextSession);
    },
    [api, setActiveSession],
  );

  const logout = useCallback(async () => {
    try {
      if (sessionRef.current) {
        await api.logout();
      }
    } finally {
      await clearStoredSession();
      setActiveSession(null);
    }
  }, [api, setActiveSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      api,
      loading,
      session,
      user: session?.user ?? null,
      login,
      logout,
    }),
    [api, loading, login, logout, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
