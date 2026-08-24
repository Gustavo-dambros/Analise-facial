import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, login, logout as apiLogout, getProfile, isAuthenticated, getToken, forgotPassword, resetPassword as apiResetPassword, changePassword as apiChangePassword } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const supabase = createClient();

  const fetchProfile = useCallback(async (token) => {
    try {
      const profileData = await getProfile();
      setProfile(profileData);
      return profileData;
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setProfile(null);
      throw err;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Tenta restaurar sessão do localStorage
    const savedToken = getToken();
    if (savedToken) {
      setToken(savedToken);
      // Valida o token buscando o perfil
      fetchProfile(savedToken)
        .then(() => {
          if (mounted) setLoading(false);
        })
        .catch(() => {
          if (mounted) {
            // Token inválido — limpa
            apiLogout();
            setUser(null);
            setProfile(null);
            setToken(null);
            setLoading(false);
          }
        });
    } else {
      if (mounted) setLoading(false);
    }
  }, [fetchProfile]);

  const signUp = useCallback(async (email, password, fullName) => {
    try {
      const result = await register(email, password, fullName);
      
      // O backend retorna: { message, requires_verification }
      // Se requires_verification é true, não há session ainda
      if (result.requires_verification) {
        return { success: true, message: result.message || 'Confirme seu email para ativar a conta.' };
      }
      
      // Se não precisa verificação, faz login automático
      const loginResult = await login(email, password);
      setToken(loginResult.access_token);
      await fetchProfile(loginResult.access_token);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [fetchProfile]);

  const signIn = useCallback(async (email, password) => {
    try {
      const result = await login(email, password);
      setToken(result.access_token);
      await fetchProfile(result.access_token);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    apiLogout();
    setUser(null);
    setProfile(null);
    setToken(null);
    // Também faz logout do Supabase (para limpar sessão de storage se houver)
    await supabase.auth.signOut();
    navigate('/login');
  }, [navigate]);

  const resetPassword = useCallback(async (email) => {
    try {
      const result = await forgotPassword(email);
      return { success: true, redirect_url: result.redirect_url };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const resetPasswordWithToken = useCallback(async (token, newPassword) => {
    try {
      const result = await apiResetPassword(token, newPassword);
      return { success: true, redirect_url: result.redirect_url };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    try {
      const result = await apiChangePassword(newPassword);
      return { success: true, redirect_url: result.redirect_url };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const mergedUser = user && profile
    ? {
        id: user.id,
        email: user.email,
        full_name: profile.full_name,
        role: profile.role,
        plan_type: profile.plan,
        subscription_status: profile.status,
      }
    : user
      ? { id: user.id, email: user.email }
      : null;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user: mergedUser,
        profile,
        token,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        resetPasswordWithToken,
        updatePassword,
        login: signIn,
        register: signUp,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}