import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail, resendConfirmation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, XCircle, MailCheck } from 'lucide-react';

export default function VerificarEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(token ? 'loading' : 'error');
  const [errorMessage, setErrorMessage] = useState('');

  // Reenvio de e-mail (estado de erro)
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState('');

  const requestedRef = useRef(false);

  useEffect(() => {
    if (!token || requestedRef.current) return;
    requestedRef.current = true;

    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setErrorMessage(err.message);
        setStatus('error');
      });
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendError('');
    setResendLoading(true);

    try {
      await resendConfirmation(resendEmail.trim());
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
                    E-mail verificado com sucesso!
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

            {status === 'error' && !resendSent && (
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

                {!resendError && errorMessage && (
                  <p className="text-xs text-red-400/80 w-full">{errorMessage}</p>
                )}
                {resendError && (
                  <p className="text-xs text-red-400 w-full">{resendError}</p>
                )}

                {!resendError && (
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
                )}

                <Link
                  to="/login"
                  className="underline underline-offset-4 text-brand-accent hover:text-brand-accent/80 text-sm"
                >
                  Voltar para o Login
                </Link>
              </div>
            )}

            {status === 'error' && resendSent && (
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
