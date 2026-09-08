// Apple UI Design System – Verified: 8pt Grid, SF Typography, Material-Depth, Natural Spring Motion
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, ShieldCheck, Sparkles, ArrowRight, Eye, Lock } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState('idle');
  const formRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!loggedIn || !user || !user.role) return;
    const selectedPlan = localStorage.getItem('selected_plan');
    if (selectedPlan) navigate('/checkout-simulation');
    else if (user.role === 'professional' || user.role === 'admin') navigate('/professional/dashboard');
    else navigate('/dashboard');
  }, [loggedIn, user, navigate]);

  useEffect(() => {
    if (loading || (loggedIn && !user?.role)) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      return () => clearInterval(timerRef.current);
    } else {
      clearInterval(timerRef.current);
      setElapsed(0);
    }
  }, [loading, loggedIn, user]);

  const isOverlay = loading || (loggedIn && !user?.role);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setPhase('authenticating');
    try {
      const formData = new FormData(e.target);
      const result = await login(formData.get('email'), formData.get('password'));
      if (result.success) {
        setPhase('loading-profile');
        setLoggedIn(true);
      } else {
        setPhase('idle');
        const msg = result.error || '';
        if (/conectar|rede|servidor|Failed to fetch|Network/i.test(msg)) setError('Não foi possível conectar ao servidor. Tente novamente em alguns instantes.');
        else setError(msg);
      }
    } catch (err) {
      const msg = err?.message || '';
      if (/conectar|rede|servidor|Failed to fetch|Network/i.test(msg)) setError('Não foi possível conectar ao servidor. Tente novamente em alguns instantes.');
      else setError('Ocorreu um erro inesperado. Tente novamente.');
      setPhase('idle');
    } finally {
      setLoading(false);
      if (!loggedIn) setPhase('idle');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#050507] flex flex-col lg:flex-row overflow-hidden">
      {/* Branding — editorial, 8pt, SF tracking */}
      <div className="hidden lg:flex flex-1 relative bg-[#0A0A0A] border-r border-white/[0.06] p-8 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 30% 20%, #D4AF37 0%, transparent 50%)` }} />
        <Link to="/" className="relative flex items-center gap-3">
          <img src={logo} alt="FaceMax" className="w-8 h-8 rounded-lg" width={32} height={32} />
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white">FACEMAX</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white/60">Elite da Estética</span>
        </Link>

        <div className="relative max-w-md">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37]">Acesso profissional</p>
          <h1 className="mt-3 text-4xl font-semibold leading-[0.95] tracking-tight text-white" style={{ letterSpacing: '-0.03em' }}>
            Bem-vindo de<br /><span className="text-white/40">volta.</span>
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-white/50" style={{ letterSpacing: '-0.011em' }}>
            Entre para ver seu veredito, acompanhar sua evolução e planejar o próximo passo com seu especialista.
          </p>
          <div className="mt-6 space-y-3">
            {[
              { icon: ShieldCheck, t: 'Privacidade total', d: 'Bucket privado, URL assinada, exclusão pós-laudo' },
              { icon: Eye, t: 'Olho humano', d: 'Nenhuma automação — laudo assinado' },
              { icon: Sparkles, t: 'Visagismo acionável', d: 'Corte, barba e óculos para seu rosto' },
            ].map(item => (
              <div key={item.t} className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white" style={{ letterSpacing: '-0.011em' }}>{item.t}</p>
                  <p className="text-[11px] text-white/40 leading-relaxed">{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-white/20">© {new Date().getFullYear()} FaceMax — Elite da Estética • <a href="/privacidade" className="hover:text-white/40 underline underline-offset-4">Privacidade</a> • <a href="/termos" className="hover:text-white/40 underline underline-offset-4">Termos</a></p>
      </div>

      {/* Form — glass, 8pt, 44px */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-[#050507] relative">
        {isOverlay && (
          <div className="absolute inset-0 z-10 bg-[#050507]/80 backdrop-blur-[20px] flex flex-col items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4 max-w-sm w-full text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-white" style={{ letterSpacing: '-0.022em' }}>{phase === 'loading-profile' ? 'Carregando seu perfil...' : 'Entrando na sua conta...'}</h2>
                <p className="text-[13px] text-white/60 mt-1">{elapsed < 8 ? 'Aguarde um momento.' : 'Servidor inicializando — isso pode levar alguns instantes.'}</p>
                {elapsed >= 8 && <p className="text-[11px] text-white/30 mt-1">Aguarde {elapsed}s — não feche a página.</p>}
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full bg-[#D4AF37] transition-all duration-1000" style={{ width: `${Math.min(95, 20 + elapsed * 6)}%` }} />
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <Link to="/" className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <img src={logo} alt="FaceMax" className="w-7 h-7 rounded-lg" />
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white">FACEMAX</span>
          </Link>

          <Card className="overflow-hidden bg-white/[0.04] border-white/[0.06] backdrop-blur-[20px] rounded-[20px] shadow-[0_16px_40px_rgba(0,0,0,0.5)] apple-card">
            <CardContent className="p-6 sm:p-8">
              <form ref={formRef} onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>
                <div className="text-center sm:text-left">
                  <h1 className="text-[22px] font-semibold tracking-tight text-white" style={{ letterSpacing: '-0.022em', lineHeight: 1.2 }}>Bem-vindo de volta</h1>
                  <p className="text-[13px] text-white/50 mt-1" style={{ letterSpacing: '-0.011em' }}>Acesse sua conta para continuar</p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-[13px] text-red-300 text-center leading-relaxed">{error}</p>
                    <button type="button" onClick={() => formRef.current?.requestSubmit()} className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-full bg-red-500/10 hover:bg-red-500/15 text-red-300 text-xs font-medium apple-transition">
                      <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                    </button>
                    <p className="text-[11px] text-white/30 text-center mt-1.5">Se persistir, aguarde alguns instantes.</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[13px] font-medium text-white/80" style={{ letterSpacing: '-0.011em' }}>Email</Label>
                    <Input id="email" name="email" type="email" placeholder="seu@email.com" required disabled={isOverlay} className="h-11 rounded-xl bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 apple-focus" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-[13px] font-medium text-white/80">Senha</Label>
                      <Link to="/forgot-password" className="text-[11px] text-white/40 hover:text-[#D4AF37] underline underline-offset-4 apple-transition">Esqueci</Link>
                    </div>
                    <PasswordInput id="password" name="password" required disabled={isOverlay} className="h-11 rounded-xl bg-white/[0.06] border-white/10 text-white apple-focus" />
                  </div>
                </div>

                <Button type="submit" disabled={loading || isOverlay} className="w-full h-11 rounded-full bg-[#D4AF37] text-black font-semibold text-[13px] apple-button apple-focus shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:scale-[1.01] active:scale-[0.98] apple-transition">
                  {loading || isOverlay ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</span> : <span className="inline-flex items-center gap-1.5">Entrar <ArrowRight className="w-3.5 h-3.5" /></span>}
                </Button>

                <div className="flex items-center gap-2 text-[11px] text-white/30 justify-center">
                  <Lock className="w-3 h-3" /> Conexão criptografada • LGPD
                </div>

                <p className="text-center text-[13px] text-white/50">
                  Não tem conta? <Link to="/signup" className="font-medium text-[#D4AF37] hover:text-[#D4AF37]/80 underline underline-offset-4">Cadastre-se</Link>
                </p>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-[11px] text-white/20 mt-4">Ao entrar você concorda com <a href="/termos" className="underline">Termos</a> e <a href="/privacidade" className="underline">Privacidade</a></p>
        </div>
      </main>
    </div>
  );
}
