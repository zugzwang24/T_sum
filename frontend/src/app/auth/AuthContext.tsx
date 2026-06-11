import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  clearStoredToken,
  getMe,
  getStoredToken,
  login as loginRequest,
  register as registerRequest,
  setStoredToken,
  type AuthUser,
} from "../lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (params: { email: string; password: string }) => Promise<void>;
  register: (params: { email: string; password: string; name?: string }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState(Boolean(getStoredToken()));

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!getStoredToken()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await getMe();
      setUser(result.user);
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (params: { email: string; password: string }) => {
    const result = await loginRequest(params);
    setStoredToken(result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (params: { email: string; password: string; name?: string }) => {
    const result = await registerRequest(params);
    setStoredToken(result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      logout,
      refreshMe,
    }),
    [user, token, isLoading, login, register, logout, refreshMe]
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
