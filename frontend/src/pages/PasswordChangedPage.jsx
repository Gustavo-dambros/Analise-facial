import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function PasswordChangedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, checked, error
  const [email, setEmail] = useState('');

  useEffect(() => {
    const supabase = createClient();

    // Check current user session
    const checkSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          setStatus('error');
          return;
        }
        if (user) {
          setStatus('checked');
        } else {
          setStatus('loading');
        }
      } catch (err) {
        setStatus('error');
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'USER_CREATED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setStatus('checked');
            navigate('/login');
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (status === 'checked') {
    // User is signed in, navigate to login
    navigate('/login');
    return null;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-sm">
          <Card className="overflow-hidden bg-card-bg border-border">
            <CardContent className="p-5 sm:p-8">
              <div className="flex flex-col items-center text-center gap-4">
                <XCircle className="w-14 h-14 text-red-400" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                    Erro ao processar senha
                  </h1>
                  <p className="text-sm text-text-secondary mt-2">
                    Ocorreu um erro ao alterar sua senha. Tente novamente.
                  </p>
                </div>
                <Link
                  to="/forgot-password"
                  className="underline underline-offset-4 text-brand-accent hover:text-brand-accent/80 text-sm"
                >
                  Solicitar novo link de senha
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading/Success state - shown initially
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden bg-card-bg border-border">
          <CardContent className="p-5 sm:p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <CheckCircle2 className="w-14 h-14 text-green-400" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                  Senha alterada com sucesso!
                </h1>
                <p className="text-sm text-text-secondary mt-2">
                  Sua senha foi atualizada. Você agora pode fazer login.
                </p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                className="w-full h-11 bg-brand-accent text-background font-semibold hover:opacity-90 rounded-xl"
              >
                Ir para Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}