import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function ResetPasswordPage() {
  const { resetPasswordWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Se não houver token nos searchParams, tentar ler do hash fragment (Supabase flow)
    if (!token) {
      const hash = window.location.hash.substring(1);
      if (hash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const supabase = createClient();
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }).then(({ error }) => {
            if (error) {
              setError(error.message);
              setLoading(false);
            } else {
              // Now the session is set, get the user to check if we have the recovery type
              supabase.auth.getUser().then(({ data: { user }, error }) => {
                if (!error && user) {
                  navigate('/password-changed');
                }
              });
            }
          });
        }
      }
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData(e.target);
      const password = formData.get('password');
      const confirmPassword = formData.get('confirm-password');

      if (password !== confirmPassword) {
        setError('As senhas nao coincidem');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres');
        setLoading(false);
        return;
      }

      // Try resetPasswordWithToken first (backward compatibility), 
      // then fall back to Supabase client method
      let result;
      try {
        result = await resetPasswordWithToken(token, password);
      } catch {
        // Fallback: use Supabase client directly if resetPasswordWithToken fails
        const supabase = createClient();
        result = await supabase.auth.updateUser({
          password: password,
        });
      }

      if (result.success || (!result.error && !result.message)) {
        navigate(result.redirect_url || '/password-changed');
      } else {
        setError(result.error || 'Link invalido ou expirado. Solicite um novo link.');
      }
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };