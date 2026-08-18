import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import {
  Check, CreditCard, Shield, ArrowLeft, Sparkles, Copy, CheckCircle,
  QrCode, Zap, AlertTriangle, Clock, RefreshCw, Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { createPayment, getPaymentStatus } from '@/lib/api';

const PLANS = {
  plan_monthly: {
    name: 'Acesso Regular',
    price: '24,90',
    priceRaw: 24.90,
    pixPrice: '29,90',
    pixPriceRaw: 29.90,
    period: 'mês',
    benefits: [
      '1 Avaliação completa de Visagismo por mês',
      'Relatório de Terços Faciais e Simetria',
      'Fila padrão (5 dias úteis)',
    ],
  },
  plan_annual: {
    name: 'Evolução Contínua',
    price: '179,00',
    priceRaw: 179.00,
    pixPrice: '184,00',
    pixPriceRaw: 184.00,
    period: 'ano',
    tag: 'Mais Vendido — Economize R$ 120',
    benefits: [
      '2 Avaliações completas por mês',
      'Painel de Evolução Temporal',
      'Fila Prioritária (48 horas)',
      'Economia de R$ 120',
    ],
  },
  plan_black: {
    name: 'Elite Estética',
    price: '49,90',
    priceRaw: 49.90,
    pixPrice: '54,90',
    pixPriceRaw: 54.90,
    period: 'mês',
    benefits: [
      '4 Avaliações por mês (acompanhamento semanal)',
      'Diagnóstico de Contraste Pessoal e Cores',
      'Relatório Estendido de Traços',
      'Fila Expressa Ultra-VIP (12 horas)',
    ],
  },
};

const easeOutExpo = [0.16, 1, 0.3, 1];

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60; // 5 minutes

export default function CheckoutSimulationPage() {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const { user, token, refreshProfile } = useAuth();

  const [planId, setPlanId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const selectedPlan = localStorage.getItem('selected_plan');
    if (!selectedPlan || !PLANS[selectedPlan]) {
      navigate('/');
      return;
    }
    setPlanId(selectedPlan);
  }, [navigate]);

  const handlePixPayment = async () => {
    setError('');
    setProcessing(true);

    const plan = PLANS[planId];
    const amount = plan.pixPriceRaw;
    const origin = window.location.origin;

    try {
      const result = await createPayment(
        {
          planId: planId,
          amount: amount,
          paymentMethod: 'pix',
          successUrl: `${origin}/checkout-success`,
          pendingUrl: `${origin}/checkout-pending`,
        },
        token,
      );

      setPaymentId(result.payment_id);
      setPaymentData(result);
      setPaymentMethod('pix_pending');

      // Start polling for payment status
      startPolling(result.payment_id);
    } catch (err) {
      setError(err.message || 'Erro ao criar pagamento. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    setError('');
    setProcessing(true);

    const plan = PLANS[planId];
    const amount = plan.priceRaw;
    const origin = window.location.origin;

    try {
      const result = await createPayment(
        {
          planId: planId,
          amount: amount,
          paymentMethod: 'credit_card',
          successUrl: `${origin}/checkout-success`,
          pendingUrl: `${origin}/checkout-pending`,
        },
        token,
      );

      // Redirect to Mercado Pago Checkout Pro
      if (result.init_point) {
        window.location.href = result.init_point;
      } else {
        setPaymentId(result.payment_id);
        setPaymentData(result);
        setPaymentMethod('card_pending');
        startPolling(result.payment_id);
      }
    } catch (err) {
      setError(err.message || 'Erro ao criar checkout. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const startPolling = useCallback((internalPaymentId) => {
    setPolling(true);
    let attempts = 0;

    const poll = async () => {
      attempts++;
      try {
        const status = await getPaymentStatus(internalPaymentId, token);
        if (status.status === 'approved') {
          setPolling(false);
          localStorage.setItem('user_subscription', planId);
          localStorage.setItem('payment_method', paymentData?.payment_method || 'pix');
          localStorage.removeItem('selected_plan');
          if (refreshProfile) {
            await refreshProfile(user?.id);
          }
          navigate('/dashboard');
          return;
        }
        if (status.status === 'rejected' || status.status === 'cancelled') {
          setPolling(false);
          setError('Pagamento foi rejeitado. Tente outro método.');
          return;
        }
        if (attempts < MAX_POLL_ATTEMPTS) {
          setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          setPolling(false);
          setError('Tempo limite excedido. Verifique o status do pagamento na sua conta.');
        }
      } catch (err) {
        if (attempts < MAX_POLL_ATTEMPTS) {
          setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          setPolling(false);
          setError('Nao foi possivel verificar o status do pagamento.');
        }
      }
    };

    poll();
  }, [token, navigate, planId, refreshProfile, user, paymentData]);

  const handleCopyPix = async () => {
    if (paymentData?.qr_code) {
      await navigator.clipboard.writeText(paymentData.qr_code);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  const handleBack = () => {
    localStorage.removeItem('selected_plan');
    navigate('/');
  };

  const handleBackToMethods = () => {
    setPaymentMethod(null);
    setPaymentId(null);
    setPaymentData(null);
    setError('');
  };

  if (!planId || !PLANS[planId]) return null;

  const plan = PLANS[planId];
  const showPaymentScreen = paymentMethod === 'pix_pending' || paymentMethod === 'card_pending';
  const showMethodSelection = !paymentMethod || (paymentMethod === 'pix' || paymentMethod === 'card');

  // Payment Confirmation / Waiting Screen
  if (showPaymentScreen && paymentData) {
    const isPix = paymentData.payment_method === 'pix';

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-urbanist">
        <motion.div
          className="w-full max-w-lg"
          initial={prefersReduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOutExpo }}
        >
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <button
              onClick={handleBackToMethods}
              className="text-brand-accent text-xs hover:underline"
            >
              Trocar método
            </button>
          </div>

          <Card className="bg-card-bg border-border overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center">
                  {isPix ? (
                    <QrCode className="w-5 h-5 text-brand-accent" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-brand-accent" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-text-primary font-alpino">
                    {isPix ? 'Pagamento via PIX' : 'Redirecionando...'}
                  </h1>
                  <p className="text-text-secondary text-sm">
                    {isPix
                      ? 'Escaneie o QR Code ou copie e cole o código'
                      : 'Você será redirecionado ao checkout do Mercado Pago'}
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {isPix && (
                <>
                  {paymentData.qr_code_base64 ? (
                    <img
                      src={paymentData.qr_code_base64}
                      alt="QR Code PIX"
                      className="w-48 h-48 mx-auto rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-48 h-48 mx-auto bg-white rounded-xl p-3 flex items-center justify-center mb-4">
                      <div className="flex items-center justify-center">
                        <QrCode className="w-16 h-16 text-black" />
                      </div>
                    </div>
                  )}

                  <p className="text-text-secondary text-xs text-center mb-4">
                    Escaneie o QR Code ou copie o código abaixo
                  </p>

                  <div className="relative mb-6">
                    <div className="p-3 rounded-lg bg-background border border-border break-all">
                      <p className="text-text-muted text-[10px] font-mono leading-relaxed pr-10">
                        {paymentData.qr_code || 'Carregando código PIX...'}
                      </p>
                    </div>
                    <button
                      onClick={handleCopyPix}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-brand-accent/10 transition-colors"
                    >
                      {pixCopied ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-brand-accent" />
                      )}
                    </button>
                  </div>

                  {paymentData.ticket_url && (
                    <p className="text-text-muted text-[10px] text-center mb-4">
                      <a
                        href={paymentData.ticket_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-accent hover:underline"
                      >
                        Abrir link de pagamento
                      </a>
                    </p>
                  )}
                </>
              )}

              {polling && (
                <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-brand-accent/10 border border-brand-accent/20 mb-4">
                  <Loader2 className="w-4 h-4 text-brand-accent animate-spin" />
                  <span className="text-brand-accent text-sm font-semibold">
                    Aguardando confirmação do pagamento...
                  </span>
                </div>
              )}

              <p className="text-text-muted text-[10px] text-center">
                Após a confirmação, sua assinatura será ativada automaticamente.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Payment Method Selection Screen
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
          <CardContent className="p-0">
            <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-brand-accent/10 via-transparent to-transparent">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-brand-accent" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-text-primary font-alpino">
                    Finalizar Assinatura
                  </h1>
                  <p className="text-text-secondary text-sm">
                    Resumo do seu plano selecionado
                  </p>
                </div>
              </div>
              <p className="text-brand-accent text-[10px] font-bold uppercase tracking-wider mt-2 ml-[52px]">
                O Único site de looksmaxxing que cobra em Reais. Sem IOF.
              </p>
            </div>

            <div className="px-8 py-6">
              <div className="flex items-baseline justify-between mb-6 pb-6 border-b border-border">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary font-playfair">
                    {plan.name}
                  </h2>
                  <p className="text-text-secondary text-sm">
                    Plano {plan.period === 'ano' ? 'anual' : 'mensal'}
                  </p>
                  {plan.tag && (
                    <p className="text-brand-accent text-xs font-bold mt-1">
                      {plan.tag}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-text-muted text-sm">R$ </span>
                  <span className="text-3xl font-black text-text-primary font-playfair">
                    {plan.price}
                  </span>
                  <span className="text-text-muted text-xs block">/ {plan.period}</span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wider">
                  O que está incluído
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {plan.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check
                        className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5"
                        strokeWidth={2.5}
                      />
                      <span className="text-text-secondary text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wider">
                  Método de Pagamento
                </h3>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleCardPayment}
                    disabled={processing}
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-brand-accent/40 bg-brand-accent/5 hover:border-brand-accent hover:bg-brand-accent/10 transition-all duration-300 cursor-pointer disabled:opacity-50"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-accent/20 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-6 h-6 text-brand-accent" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary text-sm font-bold">
                          Cartão de Crédito
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-brand-accent text-background px-2 py-0.5 rounded-full">
                          Recomendado
                        </span>
                      </div>
                      <span className="text-text-muted text-xs">
                        Assinatura com renovação automática. Acesso contínuo.
                      </span>
                    </div>
                    <RefreshCw className="w-4 h-4 text-brand-accent flex-shrink-0" />
                  </button>

                  <button
                    onClick={handlePixPayment}
                    disabled={processing}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background hover:border-brand-accent/30 transition-all duration-300 cursor-pointer disabled:opacity-50"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      <QrCode className="w-6 h-6 text-text-secondary" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary text-sm font-semibold">
                          PIX (Avulso)
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> 30 dias
                        </span>
                      </div>
                      <span className="text-text-muted text-xs">
                        Acesso temporário de 30 dias. +R$ 5,00 de taxa.
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-background mb-4">
                <Shield className="w-4 h-4 text-brand-accent flex-shrink-0" />
                <span className="text-text-muted text-xs">
                  Pagamento 100% seguro via Mercado Pago. Cobrado em Reais sem IOF.
                </span>
              </div>

              <p className="text-center text-text-muted text-xs">
                Ao continuar, você concorda com os Termos de Serviço e Política de Privacidade.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
