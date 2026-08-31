import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, setAccessToken } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { translateAuthError } from '@/lib/authErrors';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // perfil do app (role, plan, full_name...)
  const [session, setSession] = useState(null); // sessao do Supabase Auth
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const supabase = createClient();
  const isMounted = useRef(true);

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
    isMounted.current = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted.current) return;
      setSession(data.session);
      if (data.session) {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/professional/login') {
          // ✅ Primeiro seta o token, depois busca o perfil (garante ordem)
          setAccessToken(data.session.access_token);
          queueMicrotask(async () => {
            if (!isMounted.current) return;
            try {
              await fetchProfile();
            } catch {
              setUser(null);
            }
          });
        }
      }
      if (isMounted.current) setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted.current) return;
        setSession(newSession);
        if (newSession?.access_token) {
          // ✅ Primeiro seta o token via queueMicrotask, depois busca o perfil
          setAccessToken(newSession.access_token);
          queueMicrotask(async () => {
            if (!isMounted.current) return;
            try {
              await fetchProfile();
            } catch {
              // Profile failed — clear stale token
              setAccessToken(null);
              if (isMounted.current) setUser(null);
            }
          });
        } else {
          if (isMounted.current) setUser(null);
        }
        if (newSession && event !== 'SIGNED_OUT') {
          // Profile already fetched inside the try block above
        } else {
          if (isMounted.current) setUser(null);
        }
      }
    );

    return () => {
      isMounted.current = false;
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
        if (isMounted.current) {
          // Wait for profile to load successfully before setting the token
          try {
            await fetchProfile();
            setAccessToken(data.session.access_token);
          } catch {
            // Profile failed — clear stale token
            setAccessToken(null);
          }
        }
        return { success: true };
      }
      return { success: true, message: 'Confirme seu e-mail para ativar a conta.' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [fetchProfile]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // Guard Clause: Se houver erro OU sessão não vier, lança exceção e ABORTA
    // Isso impede que fetchProfile() seja chamado com token nulo/inválido
    if (error || !data.session) {
      throw new Error(`Autenticação falhou: ${error?.message || 'Credenciais inválidas'}`);
    }

    // ✅ A partir daqui, o runtime GARANTE a presença da session e do token
    if (isMounted.current) {
      setAccessToken(data.session.access_token);
    }
    return { success: true };
  }, []);

  const signOut = useCallback(async () => {
    if (isMounted.current) {
      setAccessToken(null);
    }
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
      // Verifica a sessao antes de alterar (updateUser exige sessao ativa).
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData?.session) {
        const err = new Error('Auth session missing!');
        err.code = 'SESSION_EXPIRED';
        throw err;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true, redirect_url: '/password-changed' };
    } catch (error) {
      const isSessionError =
        error?.code === 'SESSION_EXPIRED' ||
        /session|token|expired|unauthenticated/i.test(error?.message || '');
      return {
        success: false,
        error: translateAuthError(error?.message || ''),
        code: isSessionError ? 'SESSION_EXPIRED' : undefined,
      };
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
    profile: user,
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
