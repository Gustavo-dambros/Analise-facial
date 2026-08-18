import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, Shield, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const easeOutExpo = [0.16, 1, 0.3, 1];

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const { user, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Refresh user profile to pick up the plan/role update from the webhook
      try {
        if (user && refreshProfile) {
          await refreshProfile(user.id);
        }
      } catch (err) {
        // Ignore profile refresh errors - the webhook will have updated it
        console.error('Profile refresh error:', err);
      }
      setLoading(false);

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    };

    init();
  }, [navigate, user, refreshProfile]);

  const planId = searchParams.get('plan') || localStorage.getItem('user_subscription') || '';
  const paymentMethod = searchParams.get('method') || localStorage.getItem('payment_method') || 'PIX';

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
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>

            <h1 className="text-2xl font-bold text-text-primary font-playfair mb-2">
              Pagamento Aprovado!
            </h1>

            <p className="text-text-secondary text-sm mb-6">
              Seu pagamento via {paymentMethod} foi confirmado com sucesso.
              {planId && (
                <span className="block mt-2 text-text-primary font-semibold">
                  Plano: {planId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              )}
            </p>

            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-brand-accent/10 border border-brand-accent/20 mb-6">
              <Shield className="w-4 h-4 text-brand-accent" />
              <span className="text-brand-accent text-xs font-semibold">
                Acesso liberado. Redirecionando para o painel...
              </span>
            </div>

            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full py-6 bg-brand-accent text-background font-bold text-base hover:opacity-90 transition-all duration-300"
            >
              Ir para o Painel Agora
            </Button>

            {loading && (
              <p className="text-text-muted text-xs mt-4">
                Atualizando status da sua conta...
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
