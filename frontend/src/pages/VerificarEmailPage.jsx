import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, XCircle, MailCheck } from 'lucide-react';

const supabase = createClient();

export default function VerificarEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState('');

  const handleResend = async (e) => {
    e.preventDefault();
    setResendError('');
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: resendEmail.trim(),
      });
      if (error) throw new Error(error.message);
      setResendSent(true);
    } catch (err) {
      setResendError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden bg-card-bg border-border">
          <CardContent className="p-5 sm:p-8">
            {!resendSent ? (
              <div className="flex flex-col items-center text-center gap-4">
                <XCircle className="w-14 h-14 text-red-400" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                    Link inválido ou expirado
                  </h1>
                  <p className="text-sm text-text-secondary mt-2">
                    Não foi possível confirmar seu e-mail. Solicite um novo link de verificação.
                  </p>
                </div>

                {resendError && (
                  <p className="text-xs text-red-400 w-full">{resendError}</p>
                )}

                <form className="w-full flex flex-col gap-3" onSubmit={handleResend}>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    disabled={resendLoading}
                    className="w-full h-11 bg-brand-accent text-background font-semibold hover:opacity-90 rounded-xl"
                  >
                    {resendLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Reenviando...
                      </span>
                    ) : 'Reenviar e-mail'}
                  </Button>
                </form>

                <Link
                  to="/login"
                  className="underline underline-offset-4 text-brand-accent hover:text-brand-accent/80 text-sm"
                >
                  Voltar para o Login
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-4">
                <MailCheck className="w-14 h-14 text-green-400" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                    E-mail reenviado!
                  </h1>
                  <p className="text-sm text-text-secondary mt-2">
                    Se o e-mail informado estiver cadastrado e não verificado, você receberá um
                    novo link. Verifique a caixa de entrada e o spam.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="underline underline-offset-4 text-brand-accent hover:text-brand-accent/80 text-sm"
                >
                  Voltar para o Login
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
