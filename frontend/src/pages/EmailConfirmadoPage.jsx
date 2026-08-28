import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function EmailConfirmadoPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let failed = false;

    // O Supabase já confirma o e-mail no clique. O padrão desta tela é
    // "sucesso"; só exibimos erro quando o token realmente falha na verificação
    // (PKCE) ou quando nada é resolvido após um curto intervalo.
    const success = () => {
      if (cancelled || failed) return;
      setStatus('success');
      setTimeout(() => navigate('/login'), 1500);
    };
    const fail = (msg) => {
      if (cancelled) return;
      failed = true;
      setStatus('error');
      setErrorMessage(msg);
    };

    const init = async () => {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (tokenHash && type) {
        // Fluxo PKCE: troca o token_hash por sessão.
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          fail('Link de confirmacao invalido ou expirado.');
          return;
        }
        success();
        return;
      }

      // Fluxo implícito (hash #access_token): sessão já deve estar no storage.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) success();
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'USER_CREATED') success();
      }
    );

    // Fallback: o e-mail já foi confirmado no servidor. Se nada falhou em ~3s,
    // garante a tela de sucesso em vez de travar em "carregando".
    const fallback = setTimeout(() => success(), 3000);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, [navigate, searchParams]);

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
