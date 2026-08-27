import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Lock, Mail, Loader2, AlertTriangle } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';

const ALLOWED_ROLES = ['professional', 'admin'];

export default function ProfessionalLoginPage() {
  const { signIn, user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (ALLOWED_ROLES.includes(user.role)) {
      navigate('/professional/dashboard', { replace: true });
    } else {
      signOut();
      setError('Acesso restrito. Esta area e exclusiva para profissionais credenciados.');
    }
  }, [isAuthenticated, user, navigate, signOut]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData(e.target);
      const email = formData.get('email');
      const password = formData.get('password');

      const result = await signIn(email, password);

      if (!result.success) {
        setError(result.error);
      }
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-brand-accent" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">FaceMax Professional</h1>
          <p className="text-sm text-text-secondary mt-1">Acesso exclusivo para especialistas</p>
        </div>

        <div className="bg-card-bg border border-border rounded-2xl p-5 sm:p-8">
          <form className="flex flex-col gap-4" onSubmit={handleLogin}>
            {error && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                Email profissional
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="especialista@facemax.com.br"
                required
                className="flex h-10 w-full rounded-xl border border-neutral-800 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40 focus-visible:border-brand-accent/30 transition-colors"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                Senha
              </label>
              <PasswordInput
                id="password"
                name="password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-brand-accent text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Autenticando...
                </>
              ) : (
                'Entrar como Especialista'
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-center text-xs text-text-muted">
              Area restrita.{' '}
              <Link to="/login" className="text-brand-accent hover:text-brand-accent/80 transition-colors underline underline-offset-2">
                Acesso comum
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-text-muted mt-5">
          Precisa de credenciais?{' '}
          <a href="mailto:admin@facemax.com.br" className="text-brand-accent/70 hover:text-brand-accent transition-colors">
            Contate o administrador
          </a>
        </p>
      </div>
    </div>
  );
}
