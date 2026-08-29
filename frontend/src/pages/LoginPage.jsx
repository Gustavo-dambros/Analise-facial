import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (!loggedIn || !user || !user.role) return;
    const selectedPlan = localStorage.getItem('selected_plan');
    if (selectedPlan) {
      navigate('/checkout-simulation');
    } else if (user.role === 'professional' || user.role === 'admin') {
      navigate('/professional/dashboard');
    } else {
      navigate('/dashboard');
    }
  }, [loggedIn, user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData(e.target);
      const email = formData.get('email');
      const password = formData.get('password');

      const result = await login(email, password);

      if (result.success) {
        setLoggedIn(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden bg-card-bg border-border">
          <CardContent className="p-5 sm:p-8">
            <form className="flex flex-col gap-5" onSubmit={handleLogin}>
              <div className="flex flex-col items-center text-center">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Bem-vindo de volta</h1>
                <p className="text-sm text-text-secondary mt-1">Acesse sua conta para continuar</p>
              </div>
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-text-secondary text-sm">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-text-secondary text-sm">Senha</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  required
                />
              </div>
              <div className="text-right -mt-3">
                <Link to="/forgot-password" className="text-xs text-text-muted hover:text-brand-accent transition-colors underline underline-offset-4">
                  Esqueci minha senha?
                </Link>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-brand-accent text-background font-semibold hover:opacity-90 rounded-xl"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Entrando...
                  </span>
                ) : 'Entrar'}
              </Button>

              {loading && (
                <p className="text-xs text-text-muted text-center -mt-2">
                  Isso pode levar alguns instantes — o servidor pode estar inicializando.
                </p>
              )}

              <div className="text-center text-sm text-text-secondary">
                Nao tem uma conta?{' '}
                <Link to="/signup" className="underline underline-offset-4 text-brand-accent hover:text-brand-accent/80">
                  Cadastre-se
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
