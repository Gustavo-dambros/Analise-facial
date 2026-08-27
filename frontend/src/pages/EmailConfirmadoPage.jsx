import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function EmailConfirmadoPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // The Supabase browser client auto-detects the session from the URL hash
    // (redirect_to flow) and fires SIGNED_IN. We just need to confirm the
    // e-mail was verified and then send the user to login.
    const afterCheck = (user) => {
      if (cancelled) return;
      if (user?.email_confirmed_at) {
        setStatus('success');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setStatus('error');
        setErrorMessage('Nao foi possivel confirmar o e-mail. Tente novamente.');
      }
    };

    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage('Link de confirmacao invalido ou expirado.');
        }
        return;
      }
      afterCheck(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'USER_CREATED') {
          afterCheck(session?.user);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-sm">
          <Card className="overflow-hidden bg-card-bg border-border">
            <CardContent className="p-5 sm:p-8">
              <div className="flex flex-col items-center text-center gap-4">
                <Loader2 className="w-12 h-12 text-brand-accent animate-spin" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                    Verificando seu e-mail...
                  </h1>
                  <p className="text-sm text-text-secondary mt-2">
                    Aguarde enquanto confirmamos seus dados.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-sm">
          <Card className="overflow-hidden bg-card-bg border-border">
            <CardContent className="p-5 sm:p-8">
              <div className="flex flex-col items-center text-center gap-4">
                <CheckCircle2 className="w-14 h-14 text-green-400" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                    E-mail confirmado com sucesso!
                  </h1>
                  <p className="text-sm text-text-secondary mt-2">
                    Sua conta foi ativada. Redirecionando para o login...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden bg-card-bg border-border">
          <CardContent className="p-5 sm:p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <XCircle className="w-14 h-14 text-red-400" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                  Link invalido ou expirado
                </h1>
                <p className="text-sm text-text-secondary mt-2">
                  {errorMessage || 'Não foi possível confirmar seu e-mail. Solicite um novo link de verificação.'}
                </p>
              </div>
              <Link to="/signup" className="underline underline-offset-4 text-brand-accent hover:text-brand-accent/80 text-sm">
                Cadastrar novamente
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
