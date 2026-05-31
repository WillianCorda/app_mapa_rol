import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiBase, parseJsonResponse } from '@/lib/api';

type User = { id: string; username: string } | null;
type Campaign = { id: string; name: string; gmUserId: string; createdAt: string } | null;

type AuthContextType = {
  user: User;
  campaign: Campaign;
  loading: boolean;
  login: (username: string) => Promise<void>;
  register: (username: string) => Promise<void>;
  loadUsers: () => Promise<{ id: string; username: string }[]>;
  deleteUser: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  setCampaign: (campaign: Campaign) => Promise<void>;
  createCampaign: (name: string) => Promise<Campaign>;
  loadCampaigns: () => Promise<Campaign[]>;
  deleteCampaign: (id: string) => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [campaign, setCampaignState] = useState<Campaign>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/session`);
      const data = await parseJsonResponse<{ user?: User; campaign?: Campaign }>(res);
      setUser(data.user || null);
      setCampaignState(data.campaign || null);
    } catch {
      setUser(null);
      setCampaignState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (username: string) => {
    const res = await fetch(`${getApiBase()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await parseJsonResponse<{ message?: string }>(res);
    if (!res.ok) throw new Error(data.message || 'Error al iniciar sesión');
    await refreshSession();
  }, [refreshSession]);

  const register = useCallback(async (username: string) => {
    const res = await fetch(`${getApiBase()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await parseJsonResponse<{ message?: string }>(res);
    if (!res.ok) throw new Error(data.message || 'Error al registrarse');
    await refreshSession();
  }, [refreshSession]);

  const loadUsers = useCallback(async (): Promise<{ id: string; username: string }[]> => {
    const res = await fetch(`${getApiBase()}/api/users`);
    if (!res.ok) return [];
    return parseJsonResponse<{ id: string; username: string }[]>(res);
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    const res = await fetch(`${getApiBase()}/api/users/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    });
    if (!res.ok) {
      const data = await parseJsonResponse<{ message?: string }>(res).catch(() => ({})) as { message?: string };
      throw new Error(data.message || 'Error al eliminar usuario');
    }
    const currentId = user?.id ?? (user as { _id?: string } | null)?._id;
    if (currentId === id) {
      setUser(null);
      setCampaignState(null);
    }
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${getApiBase()}/api/auth/logout`, { method: 'POST' });
    } catch (_) {}
    setUser(null);
    setCampaignState(null);
  }, []);

  const setCampaign = useCallback(async (camp: Campaign) => {
    const res = await fetch(`${getApiBase()}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: camp?.id ?? null }),
    });
    if (!res.ok) throw new Error('Error al cambiar partida');
    const data = await parseJsonResponse<{ campaign?: Campaign }>(res);
    setCampaignState(data.campaign || null);
  }, []);

  const createCampaign = useCallback(async (name: string): Promise<Campaign> => {
    const res = await fetch(`${getApiBase()}/api/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() || 'Nueva partida' }),
    });
    const data = await parseJsonResponse<Campaign & { message?: string }>(res);
    if (!res.ok) throw new Error(data.message || 'Error al crear partida');
    setCampaignState(data);
    return data;
  }, []);

  const loadCampaigns = useCallback(async (): Promise<Campaign[]> => {
    const res = await fetch(`${getApiBase()}/api/campaigns`);
    if (!res.ok) return [];
    const list = await parseJsonResponse<Campaign[]>(res);
    return list;
  }, []);

  const deleteCampaign = useCallback(async (id: string) => {
    const res = await fetch(`${getApiBase()}/api/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await parseJsonResponse<{ message?: string }>(res).catch(() => ({})) as { message?: string };
      throw new Error(data.message || 'Error al eliminar partida');
    }
    if (campaign && (campaign.id === id || (campaign as { _id?: string })._id === id)) setCampaignState(null);
  }, [campaign]);

  return (
    <AuthContext.Provider
      value={{
        user,
        campaign,
        loading,
        login,
        register,
        loadUsers,
        deleteUser,
        logout,
        setCampaign,
        createCampaign,
        loadCampaigns,
        deleteCampaign,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
