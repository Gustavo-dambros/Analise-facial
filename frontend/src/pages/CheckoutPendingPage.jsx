import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock, Shield, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { getPaymentStatus } from '@/lib/api';
import { getFriendlyErrorMessage } from '@/lib/errorMessages';

const easeOutExpo = [0.16, 1, 0.3, 1];
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60;

export default function CheckoutPendingPage() {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const { user, token, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('pending');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');

  const paymentId = searchParams.get('payment_id') || '';
  const planId = searchParams.get('plan') || '';

  const showWaitingMessage = !paymentId;

  const pollStatus = useCallback(async () => {
    if (!paymentId) return;

    try {
      const result = await getPaymentStatus(paymentId, token);
      setStatus(result.status);
      setAttempts(prev => prev + 1);

      if (result.status === 'approved') {
        if (user && refreshProfile) {
          await refreshProfile(user.id);
        }
        localStorage.setItem('user_subscription', planId || 'plan_monthly');
        localStorage.removeItem('selected_plan');
        navigate('/checkout-success');
      } else if (result.status === 'rejected' || result.status === 'cancelled') {
        setStatus('rejected');
      }
    } catch (err) {
      setAttempts(prev => prev + 1);
      setError(getFriendlyErrorMessage(err));
    }
  }, [paymentId, token, navigate, planId, user, refreshProfile]);

  useEffect(() => {
    if (!paymentId) return;

    pollStatus();
    const interval = setInterval(() => {
      if (attempts < MAX_POLL_ATTEMPTS) {
        pollStatus();
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [paymentId, attempts, pollStatus, navigate]);

const isPending = status === 'pending' || status === 'in_process' || status === 'partial';
  const isRejected = status === 'rejected' || status === 'cancelled';

  const handleBack = () => {
    navigate('/');
  };

  const handleTryAgain = () => {
    navigate('/');
  };

  if (showWaitingMessage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-urbanist">
        <motion.div
          className="w-full max-w-lg"
          initial={prefersReduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOutExpo }}
        >
          <Card className="bg-card-bg border-border overflow-hidden">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-brand-accent/20 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-brand-accent" />
              </div>

              <h1 className="text-2xl font-bold text-text-primary font-playfair mb-2">
                Aguardando Pagamento
              </h1>

              <p className="text-text-secondary text-sm mb-6">
                Estamos verificando o status do seu pagamento. Por favor, aguarde...
              </p>

              <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-brand-accent/10 border border-brand-accent/20 mb-6">
                <Loader2 className="w-4 h-4 text-brand-accent animate-spin" />
                <span className="text-brand-accent text-xs font-semibold">
                  Verificando...
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Status: pending</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-urbanist">
      <motion.div
        className="w-full max-w-lg"
        initial={prefersReduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOutExpo }}
      >
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </button>

        <Card className="bg-card-bg border-border overflow-hidden">
          <CardContent className="p-8 text-center">
            {isRejected ? (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary font-playfair mb-2">
                  Pagamento Não Aprovado
                </h1>
                <p className="text-text-secondary text-sm mb-6">
                  Seu pagamento foi rejeitado. Tente novamente ou utilize outro método.
                </p>
                <Button
                  onClick={handleTryAgain}
                  className="w-full py-6 bg-brand-accent text-background font-bold text-base hover:opacity-90 transition-all duration-300"
                >
                  Tentar Novamente
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-brand-accent/20 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-brand-accent" />
                </div>

                <h1 className="text-2xl font-bold text-text-primary font-playfair mb-2">
                  Aguardando Pagamento
                </h1>

                <p className="text-text-secondary text-sm mb-6">
                  Estamos verificando o status do seu pagamento. Esta tela é atualizada automaticamente.
                </p>

                {error && (
                  <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-6">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-xs font-semibold">
                      {error}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-brand-accent/10 border border-brand-accent/20 mb-6">
                  <Loader2 className="w-4 h-4 text-brand-accent animate-spin" />
                  <span className="text-brand-accent text-xs font-semibold">
                    Tentativa {attempts + 1} de {MAX_POLL_ATTEMPTS}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-background border border-border mb-6">
                  <Shield className="w-4 h-4 text-brand-accent flex-shrink-0" />
                  <span className="text-text-muted text-xs">
                    Após a aprovação, você será redirecionado automaticamente.
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Status atual: {status || 'pending'}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
