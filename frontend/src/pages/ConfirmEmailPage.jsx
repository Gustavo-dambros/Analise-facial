import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, MailCheck } from 'lucide-react';

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const supabase = createClient();

    // Supabase puts the tokens in the URL hash fragment after redirect
    // We need to exchange the code for a session
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (accessToken && refreshToken) {
      // Exchange the auth code for a session
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          setErrorMessage(error.message);
          setStatus('error');
        } else {
          setStatus('success');
        }
      });
    } else if (type === 'signup') {
      // If we only have type=signup without tokens, the session might already be set
      // Try to get the user
      supabase.auth.getUser().then(({ data: { user }, error }) => {
        if (user && !error) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage('Não foi possível confirmar o e-mail. Tente novamente.');
        }
      });
    } else {
      setStatus('error');
      setErrorMessage('Link de confirmação inválido ou expirado.');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden bg-card-bg border-border">
          <CardContent className="p-5 sm:p-8">
            {status === 'loading' && (
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
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center text-center gap-4">
                <CheckCircle2 className="w-14 h-14 text-green-400" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                    E-mail confirmado com sucesso!
                  </h1>
                  <p className="text-sm text-text-secondary mt-2">
                    Sua conta foi ativada. Agora você já pode acessar a plataforma.
                  </p>
                </div>
                <Link to="/login" className="w-full">
                  <Button className="w-full h-11 bg-brand-accent text-background font-semibold hover:opacity-90 rounded-xl">
                    Ir para o Login
                  </Button>
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center text-center gap-4">
                <XCircle className="w-14 h-14 text-red-400" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                    Link inválido ou expirado
                  </h1>
                  <p className="text-sm text-text-secondary mt-2">
                    {errorMessage || 'Não foi possível confirmar seu e-mail. Solicite um novo link de verificação.'}
                  </p>
                </div>
                <Link
                  to="/signup"
                  className="underline underline-offset-4 text-brand-accent hover:text-brand-accent/80 text-sm"
                >
                  Cadastrar novamente
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}