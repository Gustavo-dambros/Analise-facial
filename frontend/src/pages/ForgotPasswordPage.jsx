import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData(e.target);
      const email = formData.get('email');

      const result = await resetPassword(email);

      // O backend sempre responde 200 (mensagem genérica); erro real só em 5xx.
      // Segue a diretriz: sempre informar "e-mail enviado", salvo erro do servidor.
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-sm">
          <Card className="overflow-hidden bg-card-bg border-border">
            <CardContent className="p-5 sm:p-8">
              <div className="flex flex-col items-center text-center gap-4">
                <CheckCircle2 className="w-12 h-12 text-green-400" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary">E-mail enviado!</h1>
                  <p className="text-sm text-text-secondary mt-2">
                    Enviamos o link de redefinição para o seu e-mail. Verifique também a pasta de spam.
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full h-11 bg-brand-accent text-background font-semibold hover:opacity-90 rounded-xl"
                >
                  Voltar para o login
                </Button>
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
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="flex flex-col items-center text-center">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Esqueci minha senha</h1>
                <p className="text-sm text-text-secondary mt-1">
                  Informe seu e-mail para receber o link de redefinição
                </p>
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-brand-accent text-background font-semibold hover:opacity-90 rounded-xl"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </span>
                ) : 'Enviar link de redefinição'}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para o login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}