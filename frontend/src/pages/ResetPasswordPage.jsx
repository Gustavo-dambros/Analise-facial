import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

const supabase = createClient();

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // processing -> validando o token do link; ready -> pode alterar; invalid -> sem token
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const processed = useRef(false);

  useEffect(() => {
    const handle = async () => {
      if (processed.current) return;
      processed.current = true;

      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      try {
        if (code) {
          // Fluxo PKCE (padrao do @supabase/supabase-js 2.x): troca o ?code por sessao.
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
        } else if (tokenHash && type) {
          // Fluxo OTP: troca token_hash+type por sessao de recovery.
          const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (vErr) throw vErr;
        } else if (window.location.hash) {
          // Fluxo implicito (#access_token): o cliente ja estabeleceu a sessao no init.
        } else {
          // Nenhum token de verificacao presente no link.
          throw new Error('no-verification-token');
        }
        setStatus('ready');
      } catch (err) {
        console.error('[reset-password] falha ao validar token:', err);
        setStatus('invalid');
      }
    };
    handle();
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status !== 'ready') {
      setError('Link invalido ou expirado. Solicite um novo link de recuperacao.');
      return;
    }
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

      if (!password || password.length < 8) {
        setError('A senha deve ter pelo menos 8 caracteres');
        setLoading(false);
        return;
      }

      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;

      setSuccess(true);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      const msg = err?.message || '';
      if (/session|expired|invalid|token/i.test(msg)) {
        setError('Link invalido ou expirado. Solicite um novo link de recuperacao.');
      } else {
        setError(msg || 'Ocorreu um erro inesperado. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-sm">
          <Card className="overflow-hidden bg-card-bg border-border">
            <CardContent className="p-5 sm:p-8">
              <div className="flex flex-col items-center text-center gap-4">
                <AlertTriangle className="w-12 h-12 text-red-400" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Link invalido</h1>
                  <p className="text-sm text-text-secondary mt-2">
                    Este link de redefinicao e invalido ou expirou. Solicite um novo link para continuar.
                  </p>
                </div>
                <Link
                  to="/forgot-password"
                  className="underline underline-offset-4 text-brand-accent hover:text-brand-accent/80 text-sm"
                >
                  Solicitar novo link
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden bg-card-bg border-border">
          <CardContent className="p-5 sm:p-8">
            {success ? (
              <div className="flex flex-col items-center text-center gap-4">
                <CheckCircle2 className="w-12 h-12 text-green-400" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Senha alterada!</h1>
                  <p className="text-sm text-text-secondary mt-2">
                    Sua senha foi redefinida com sucesso. Redirecionando...
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full h-11 bg-brand-accent text-background font-semibold hover:opacity-90 rounded-xl"
                >
                  Ir para o login
                </Button>
              </div>
            ) : (
              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Redefinir senha</h1>
                  <p className="text-sm text-text-secondary mt-1">
                    Escolha uma nova senha para sua conta
                  </p>
                </div>

                {status === 'processing' && (
                  <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validando link de recuperacao...
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-text-secondary text-sm">Nova senha</Label>
                  <PasswordInput
                    id="password"
                    name="password"
                    placeholder="Minimo 8 caracteres"
                    required
                    minLength={8}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm-password" className="text-text-secondary text-sm">Confirmar senha</Label>
                  <PasswordInput
                    id="confirm-password"
                    name="confirm-password"
                    placeholder="Repita a senha"
                    required
                    minLength={8}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || status === 'processing'}
                  className="w-full h-11 bg-brand-accent text-background font-semibold hover:opacity-90 rounded-xl"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Alterando senha...
                    </span>
                  ) : 'Alterar senha'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
