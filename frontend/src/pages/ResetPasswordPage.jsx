import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { API_BASE } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ResetPasswordPage() {
  const { resetPasswordWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // For the implicit (hash) flow the Supabase client auto-detects the session
  // from the URL fragment. The PKCE flow (token_hash + type) is exchanged
  // explicitly in handleSubmit to avoid reusing the one-time token twice.

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

      if (!password || password.length < 8) {
        setError('A senha deve ter pelo menos 8 caracteres');
        setLoading(false);
        return;
      }

      let result;
      if (tokenHash && type) {
        // PKCE recovery flow: troca o token_hash por sessão de recovery e,
        // depois, sincroniza a senha no banco local chamando o backend
        // autenticado pelo JWT do Supabase (get_current_user aceita o segredo
        // do Supabase). Assim o login local e o Supabase ficam consistentes.
        const supabase = createClient();
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        if (verifyErr) throw verifyErr;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Sessao nao estabelecida.');

        const resp = await fetch(`${API_BASE}/api/v1/auth/alterar-senha`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ nova_senha: password }),
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.detail || 'Falha ao atualizar a senha.');
        }
        result = { success: true, redirect_url: '/password-changed' };
      } else if (token) {
        // Fluxo legado com token JWT do backend.
        result = await resetPasswordWithToken(token, password);
      } else {
        throw new Error('Link invalido ou expirado.');
      }

      if (result && result.success) {
        setSuccess(true);
        setTimeout(() => navigate(result.redirect_url || '/password-changed'), 1000);
      } else {
        setError((result && result.error) || 'Link invalido ou expirado. Solicite um novo link.');
      }
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

  const hasTokenOrHash = Boolean(token || tokenHash || window.location.hash);

  if (!hasTokenOrHash) {
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
                    placeholder="Minimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm-password" className="text-text-secondary text-sm">Confirmar senha</Label>
                  <PasswordInput
                    id="confirm-password"
                    name="confirm-password"
                    placeholder="Repita a senha"
                    required
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
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
