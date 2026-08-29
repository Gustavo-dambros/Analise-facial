import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // perfil do app (role, plan, full_name...)
  const [session, setSession] = useState(null); // sessao do Supabase Auth
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    try {
      const profileData = await getProfile();
      setUser(profileData);
      return profileData;
    } catch (err) {
      console.error('Falha ao carregar perfil:', err);
      setUser(null);
      throw err;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        try {
          await fetchProfile();
        } catch {
          setUser(null);
        }
      }
      if (mounted) setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        if (newSession && event !== 'SIGNED_OUT') {
          try {
            await fetchProfile();
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = useCallback(async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw new Error(error.message);

      if (data.session) {
        await fetchProfile();
        return { success: true };
      }
      return { success: true, message: 'Confirme seu e-mail para ativar a conta.' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [fetchProfile]);

  const signIn = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      await fetchProfile();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    navigate('/login');
  }, [navigate]);

  const resetPassword = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
    } catch (error) {
      // Nao expor se o e-mail existe ou nao (evita enumeracao).
    }
    return { success: true };
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      return { success: true, redirect_url: '/dashboard/profile' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const resendConfirmation = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw new Error(error.message);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const value = {
    isAuthenticated: !!session,
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    resendConfirmation,
    refreshProfile: fetchProfile,
    login: signIn,
    register: signUp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
