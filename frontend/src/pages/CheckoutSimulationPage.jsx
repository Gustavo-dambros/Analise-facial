import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import {
  Check, Shield, ArrowLeft, Sparkles, Copy, CheckCircle,
  QrCode, Zap, Loader2, MessageCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { createCaktoPayment, getPaymentStatus } from '@/lib/api';
import { PLANS } from '@/lib/plans';

const easeOutExpo = [0.16, 1, 0.3, 1];

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60; // 5 minutes

export default function CheckoutSimulationPage() {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const { user, refreshProfile } = useAuth();

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
    if (selectedPlan && PLANS[selectedPlan]) {
      setPlanId(selectedPlan);
    } else {
      setPlanId(null);
    }
  }, [navigate]);

  const handleCaktoPayment = async () => {
    setError('');
    setProcessing(true);
    const origin = window.location.origin;
    try {
      // Chave de idempotência por tentativa de checkout: se o POST falhar por
      // rede e o usuário clicar de novo, a Cakto deduplica pela mesma chave
      // (o backend também cancela pagamentos órfãos anteriores do mesmo plano).
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const result = await createCaktoPayment({
        planId: planId,
        successUrl: `${origin}/checkout-success`,
        pendingUrl: `${origin}/checkout-pending`,
        idempotencyKey,
      });
      setPaymentId(result.payment_id);
      setPaymentData(result);
      setPaymentMethod('cakto_pending');
      startPolling(result.payment_id);
    } catch (err) {
      setError(err.message || 'Erro ao criar pagamento Cakto. Verifique a oferta configurada.');
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
        // O token vai no header Authorization via apiFetch/AuthContext.
        const status = await getPaymentStatus(internalPaymentId);
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
          setError('Pagamento recusado pela Cakto. Gere um novo PIX para tentar novamente.');
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
  }, [navigate, planId, refreshProfile, user, paymentData]);

  const handleCopyPix = async () => {
    if (paymentData?.qr_code) {
      await navigator.clipboard.writeText(paymentData.qr_code);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  const handleBack = () => {
    localStorage.removeItem('selected_plan');
    navigate(user ? '/dashboard' : '/');
  };

  if (planId && !PLANS[planId]) return null;

  const plan = planId ? PLANS[planId] : null;
  const handleSelectPlan = (id) => {
    localStorage.setItem('selected_plan', id);
    setPlanId(id);
  };
  const showPaymentScreen = paymentMethod === 'cakto_pending';

  // Payment Confirmation / Waiting Screen
  if (showPaymentScreen && paymentData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-urbanist">
        <motion.div
          className="w-full max-w-lg"
          initial={prefersReduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOutExpo }}
        >
          <div className="flex items-center mb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          </div>

          <Card className="bg-card-bg border-border overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-brand-accent" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-text-primary font-alpino">
                    Pagamento via PIX (Cakto)
                  </h1>
                  <p className="text-text-secondary text-sm">
                    QR Code Pix gerado pela Cakto — copie e cole
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <>
                  {paymentData.qr_code ? (
                    <div className="w-48 h-48 mx-auto bg-white rounded-xl p-3 flex items-center justify-center mb-4">
                      <QRCodeSVG
                        value={paymentData.qr_code}
                        size={128}
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                        includeMargin={true}
                        imageSettings={{
                          src: undefined,
                          height: 0,
                          width: 0,
                          excavate: false,
                        }}
                      />
                    </div>
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
                <p className="text-center text-text-muted text-[10px] mt-2">
                  Problemas? <a href="https://instagram.com/seu_instagram" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">@seu_instagram</a>
                </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Plan selection (quando acessa direto /checkout-simulation sem plano) — mostra os 4
  if (!planId) {
    return (
      <div className="min-h-screen bg-background flex items-start sm:items-center justify-center p-4 font-urbanist py-8">
        <motion.div
          className="w-full max-w-6xl"
          initial={prefersReduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOutExpo }}
        >
          <button onClick={handleBack} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar ao início
          </button>
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary font-alpino flex items-center justify-center gap-2"><Sparkles className="w-5 h-5 text-brand-accent" /> Escolha seu plano</h1>
            <p className="text-text-secondary text-sm mt-2">Toda avaliação cobre 12 atributos, terços, simetria e visagismo. Pagamento em Reais, sem IOF.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.values(PLANS).map((p) => (
              <Card key={p.id} className={`relative rounded-2xl border p-5 flex flex-col ${p.highlight ? 'border-brand-accent/60 bg-brand-accent/5 shadow-[0_0_30px_rgba(212,175,55,0.12)]' : 'border-border bg-card-bg'}`}>
                {p.tag && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-accent text-background text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">{p.tag}</span>}
                <h3 className="text-sm font-semibold text-text-primary">{p.name}</h3>
                <div className="flex items-baseline gap-1 mt-1 mb-3">
                  <span className="text-text-muted text-sm">R$</span>
                  <span className="text-2xl font-black text-text-primary font-playfair">{p.price}</span>
                  <span className="text-text-muted text-xs">/ {p.period}</span>
                  <span className="ml-auto text-[11px] text-text-muted">PIX R$ {p.pixPrice}</span>
                </div>
                <ul className="flex flex-col gap-2 flex-1">
                  {p.benefits.map((b,i) => (
                    <li key={i} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-brand-accent mt-0.5" strokeWidth={2.5}/><span className="text-text-secondary text-xs leading-relaxed">{b}</span></li>
                  ))}
                </ul>
                <Button onClick={() => handleSelectPlan(p.id)} className={`mt-4 w-full rounded-xl font-semibold ${p.highlight ? 'bg-brand-accent text-background hover:opacity-90' : 'border border-brand-accent/50 text-brand-accent hover:bg-brand-accent/10 bg-transparent'}`}>Escolher {p.name}</Button>
              </Card>
            ))}
          </div>
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
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => { localStorage.removeItem('selected_plan'); setPlanId(null); }} className="text-xs text-text-muted hover:text-brand-accent underline">Trocar plano</button>
          <span className="text-xs text-text-muted">Plano: {plan.name}</span>
        </div>

        <Card className="bg-card-bg border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-brand-accent/10 via-transparent to-transparent">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-brand-accent" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-text-primary font-alpino">
                    Finalizar Assinatura
                  </h1>
                  <p className="text-text-secondary text-sm">
                    Pagamento 100% via PIX — liberação automática
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
                    onClick={handleCaktoPayment}
                    disabled={processing}
                    className="flex items-center gap-4 p-5 rounded-xl border-2 border-brand-accent bg-brand-accent/10 hover:bg-brand-accent/15 transition-all duration-300 cursor-pointer disabled:opacity-50 shadow-[0_0_30px_rgba(212,175,55,0.15)]"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-accent flex items-center justify-center flex-shrink-0">
                      <Zap className="w-6 h-6 text-background" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary text-base font-bold">
                          PIX Instantâneo
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-green-500/15 text-green-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> Cakto
                        </span>
                      </div>
                      <span className="text-text-muted text-xs">
                        QR Code e copia e cola — liberação automática em segundos
                      </span>
                    </div>
                    <QrCode className="w-5 h-5 text-brand-accent flex-shrink-0" />
                  </button>
                  {processing && (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <Loader2 className="w-4 h-4 text-brand-accent animate-spin" />
                      <span className="text-brand-accent text-xs">Gerando QR Code...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-accent/5 border border-brand-accent/10 mb-4">
                <Shield className="w-4 h-4 text-brand-accent flex-shrink-0" />
                <span className="text-text-muted text-xs">
                  Pagamento 100% seguro via Cakto. Cobrado em Reais, sem IOF.
                </span>
              </div>

<p className="text-center text-text-muted text-xs">
                  Ao continuar, você concorda com os Termos de Serviço e Política de Privacidade.
                </p>
                <p className="text-center text-text-muted text-xs mt-2">
                  Problemas? Entre em contato: <a href="https://instagram.com/seu_instagram" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline font-medium">@seu_instagram</a>
                </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
