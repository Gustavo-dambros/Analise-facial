// Apple UI Design System – Verified: 8pt Grid, SF Typography, Material-Depth, Natural Spring Motion — EDITORIAL LUXE
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check, X, ShieldCheck, Mail, ArrowRight, Crown, Sparkles, Eye, Heart, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/logo.png';

const GENDER_OPTIONS = ['Masculino', 'Feminino', 'Neutro'];
const STYLE_OPTIONS = [
  { id: 'Harmonia Facial', label: 'Harmonia Facial', desc: 'Equilíbrio entre terços e proporções', icon: Compass },
  { id: 'Simetria e Proporcao', label: 'Simetria e Proporção', desc: 'Correção de assimetrias sutis', icon: Eye },
  { id: 'Estilo Pessoal', label: 'Estilo Pessoal', desc: 'Imagem alinhada à sua identidade', icon: Heart },
  { id: 'Pre-Procedure', label: 'Pré-Procedimento', desc: 'Planejamento antes de intervir', icon: Sparkles },
  { id: 'Autoconhecimento', label: 'Autoconhecimento', desc: 'Entender seu rosto com profundidade', icon: Crown },
];

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [styleObjective, setStyleObjective] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsModalTab, setTermsModalTab] = useState('terms');
  const [showConsentError, setShowConsentError] = useState(false);

  useEffect(() => { if (error) window.scrollTo({ top: 0, behavior: 'smooth' }); }, [error]);

  const validatePassword = (pw) => {
    const e = [];
    if (pw.length < 8) e.push('ao menos 8 caracteres');
    if (!/[A-Z]/.test(pw)) e.push('uma letra maiúscula');
    if (!/[a-z]/.test(pw)) e.push('uma letra minúscula');
    if (!/[0-9]/.test(pw)) e.push('um número');
    return e;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(''); setShowConsentError(false);
    if (!acceptedTerms) { setShowConsentError(true); return; }
    setLoading(true); setPasswordError('');
    try {
      const formData = new FormData(e.target);
      const email = formData.get('email');
      const confirmPassword = formData.get('confirm-password');
      const pwErrors = validatePassword(password);
      if (pwErrors.length) { setPasswordError(`A senha deve conter ${pwErrors.join(', ')}.`); setLoading(false); return; }
      if (password !== confirmPassword) { setError('As senhas não coincidem'); setLoading(false); return; }
      const result = await signUp(email, password, fullName);
      if (result.success) {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('profiles').upsert({ id: session.user.id, full_name: fullName, gender: gender || '', age: age ? Number(age) : null, style_objective: styleObjective || '' });
        }
        navigate(`/waiting?email=${encodeURIComponent(email)}`);
      } else setError(result.error);
    } catch { setError('Ocorreu um erro inesperado. Tente novamente.'); } finally { setLoading(false); }
  };

  return (
    <>
    <div className="min-h-screen w-screen bg-[#050507] overflow-x-hidden">
      {/* Top hairline */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />

      {/* Header editorial */}
      <header className="max-w-3xl mx-auto px-6 pt-8 pb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="FaceMax" className="w-7 h-7 rounded-lg" width={28} height={28} />
          <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-white">FACEMAX</span>
          <span className="hidden sm:inline h-4 w-px bg-white/10" />
          <span className="hidden sm:inline text-[10px] tracking-[0.14em] uppercase text-white/40">Maison d’Esthétique</span>
        </Link>
        <Link to="/login" className="text-[12px] text-white/60 hover:text-white apple-transition">Já tem conta? <span className="text-[#D4AF37]">Entrar</span></Link>
      </header>

      {/* Title + Live Admission Card — A */}
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-8">
        <div>
        <div className="border-t border-white/[0.06] pt-8">
          <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-[#D4AF37]">Admissão • Edição limitada</p>
          <h1 className="mt-3 text-[32px] sm:text-[42px] font-semibold leading-[0.95] tracking-tight text-white" style={{ letterSpacing: '-0.03em', fontFamily: 'Playfair Display, serif' }}>
            Crie sua <span className="text-white/40">conta.</span>
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-white/50 max-w-xl" style={{ letterSpacing: '-0.011em' }}>
            Um cadastro refinado para um laudo refinado. Leva 45 segundos. Seus dados permanecem em cofre privado.
          </p>
        </div>

        {error && <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[13px] text-center">{error}</div>}

        {/* Mobile live card — A compact */}
        <div className="lg:hidden mt-6">
          <div className="rounded-2xl bg-[#0A0A0A] border border-white/10 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 text-[12px] font-semibold text-white">{fullName ? fullName.slice(0,2).toUpperCase() : '••'}</div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-white truncate">{fullName || 'Seu nome'} • {styleObjective || 'Objetivo'}</p>
              <p className="text-[11px] text-white/40 truncate">{email || 'seu@email.com'}</p>
            </div>
            {acceptedTerms ? <span className="w-6 h-6 rounded-full bg-[#D4AF37] flex items-center justify-center"><Check className="w-3 h-3 text-black" /></span> : <span className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/10" />}
          </div>
        </div>

        <form onSubmit={handleSignup} noValidate className="mt-8 pb-16">
          {/* 01 — Conta */}
          <section className="py-8 border-t border-white/[0.06]">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37]">01</span>
              <h2 className="text-[13px] font-semibold tracking-[0.14em] uppercase text-white" style={{ letterSpacing: '0.14em' }}>Conta</h2>
              <span className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[11px] text-white/30">Email e acesso</span>
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] tracking-widest uppercase text-white/60">Nome Completo</Label>
                <Input id="full-name" name="full-name" placeholder="Ex: Isabella Moretti" value={fullName} onChange={e => setFullName(e.target.value)} className="h-11 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 apple-focus" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[11px] tracking-widest uppercase text-white/60">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="seu@email.com" required value={email} onChange={e => setEmail(e.target.value)} className="h-11 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 apple-focus" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] tracking-widest uppercase text-white/60">Idade</Label>
                  <Input type="number" min="1" max="120" placeholder="28" value={age} onChange={e => setAge(e.target.value)} className="h-11 rounded-xl bg-white/[0.04] border-white/10 text-white apple-focus" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[11px] tracking-widest uppercase text-white/60">Senha</Label>
                  <PasswordInput id="password" name="password" placeholder="Mínimo 8 caracteres" required minLength={8} value={password} onChange={e => { setPassword(e.target.value); const errs = validatePassword(e.target.value); setPasswordError(errs.length ? `Precisa conter ${errs.join(', ')}.` : ''); }} className="h-11 rounded-xl bg-white/[0.04] border-white/10 text-white apple-focus" />
                  {passwordError && <p className="text-[11px] text-red-400">{passwordError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-[11px] tracking-widest uppercase text-white/60">Confirmar senha</Label>
                  <PasswordInput id="confirm-password" name="confirm-password" placeholder="Repita" required minLength={8} className="h-11 rounded-xl bg-white/[0.04] border-white/10 text-white apple-focus" />
                </div>
              </div>
            </div>
          </section>

          {/* 02 — Perfil */}
          <section className="py-8 border-t border-white/[0.06]">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37]">02</span>
              <h2 className="text-[13px] font-semibold tracking-[0.14em] uppercase text-white">Perfil</h2>
              <span className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[11px] text-white/30">Opcional, mas recomendado</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] tracking-widest uppercase text-white/60">Gênero</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="h-11 rounded-xl bg-white/[0.04] border-white/10 text-white apple-focus"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-white/10">
                    {GENDER_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] tracking-widest uppercase text-white/60">Como nos encontrou?</Label>
                <div className="h-11 rounded-xl bg-white/[0.02] border border-white/5 flex items-center px-4 text-[12px] text-white/30">Indicação • Instagram • Busca</div>
              </div>
            </div>
          </section>

          {/* 03 — Objetivo — cards grandes, caro */}
          <section className="py-8 border-t border-white/[0.06]">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37]">03</span>
              <h2 className="text-[13px] font-semibold tracking-[0.14em] uppercase text-white">Objetivo de Estilo</h2>
              <span className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[11px] text-white/30">Escolha um</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STYLE_OPTIONS.map(opt => {
                const active = styleObjective === opt.id;
                const Icon = opt.icon;
                return (
                  <button key={opt.id} type="button" onClick={() => setStyleObjective(active ? '' : opt.id)} className={`text-left p-4 rounded-2xl border apple-transition apple-focus ${active ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'bg-white/[0.03] border-white/[0.06] hover:border-[#D4AF37]/30 hover:bg-white/[0.05] text-white'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-black/10' : 'bg-white/[0.06] border border-white/10'}`}>
                        <Icon className={`w-4 h-4 ${active ? 'text-black' : 'text-[#D4AF37]'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[13px] font-medium leading-tight ${active ? 'text-black' : 'text-white'}`} style={{ letterSpacing: '-0.011em' }}>{opt.label}</p>
                        <p className={`text-[11px] leading-relaxed mt-1 ${active ? 'text-black/60' : 'text-white/40'}`}>{opt.desc}</p>
                      </div>
                      {active && <Check className="w-4 h-4 text-black ml-auto shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 04 — Consentimento — card destacado, caro */}
          <section className="py-8 border-t border-white/[0.06]">
            <div className="flex items-baseline gap-4 mb-4">
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37]">04</span>
              <h2 className="text-[13px] font-semibold tracking-[0.14em] uppercase text-white">Consentimento</h2>
              <span className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[11px] text-white/30">LGPD Art. 11</span>
            </div>
            <div className={`p-4 rounded-2xl border apple-transition ${showConsentError ? 'bg-red-500/5 border-red-500/20' : acceptedTerms ? 'bg-[#D4AF37]/10 border-[#D4AF37]/20' : 'bg-white/[0.03] border-white/[0.06]'}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={acceptedTerms} onChange={e => { setAcceptedTerms(e.target.checked); setShowConsentError(false); }} className="sr-only peer" />
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 apple-transition ${acceptedTerms ? 'bg-[#D4AF37] border-[#D4AF37]' : showConsentError ? 'border-red-400 bg-red-500/10' : 'border-white/15 bg-white/[0.02]'}`}>
                  {acceptedTerms && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                </div>
                <span className="text-[13px] leading-relaxed text-white/70" style={{ letterSpacing: '-0.011em' }}>
                  Li e concordo com os <button type="button" onClick={(e) => { e.preventDefault(); setTermsModalTab('terms'); setShowTermsModal(true); }} className="text-[#D4AF37] underline underline-offset-4">Termos v1.0</button> e <button type="button" onClick={(e) => { e.preventDefault(); setTermsModalTab('privacy'); setShowTermsModal(true); }} className="text-[#D4AF37] underline underline-offset-4">Privacidade v1.0</button> — consentimento específico para dados biométricos sensíveis, bucket privado e exclusão pós-laudo.
                </span>
              </label>
              {showConsentError && <p className="text-[11px] text-red-400 mt-2 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-400" />Você precisa aceitar para continuar</p>}
            </div>
          </section>

          {/* CTA — 44px, preço implícito de luxo */}
          <div className="pt-4">
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-[#D4AF37] text-black font-semibold text-[13px] apple-button apple-focus shadow-[0_8px_24px_rgba(212,175,55,0.15)] hover:scale-[1.01] active:scale-[0.98] apple-transition">
              {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Criando sua conta...</span> : 'Criar conta — entrar na maison'}
            </Button>
            <p className="text-center text-[11px] text-white/30 mt-3">Sem cartão agora • Cancele quando quiser • Suporte humano</p>
            <p className="text-center text-[13px] text-white/50 mt-6">Já tem conta? <Link to="/login" className="font-medium text-[#D4AF37] hover:text-[#D4AF37]/80 underline underline-offset-4">Entrar</Link></p>
          </div>
        </form>
        </div>

        {/* Live Admission Card — A — sticky, updates as you type */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <div className="rounded-[20px] bg-[#0A0A0A] border border-white/10 overflow-hidden apple-card shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
              <div className="h-1 w-full bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/50 to-transparent" />
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.18em] uppercase text-white/40">FACEMAX • Maison d’Esthétique</span>
                  <span className="text-[10px] tracking-widest uppercase text-[#D4AF37]">Est. 2024</span>
                </div>
                <p className="text-[11px] tracking-[0.14em] uppercase text-white/20 mt-1">No. ADM-2026-{(email||'----').slice(0,4).toUpperCase() || '----'}</p>

                <div className="mt-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                    <span className="text-[14px] font-semibold text-white" style={{ letterSpacing: '-0.02em' }}>{fullName ? fullName.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : '••'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <AnimatePresence mode="wait">
                      <motion.p key={fullName||'empty'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25, ease: [0.25,0.1,0.25,1] }} className="text-[14px] font-medium text-white truncate" style={{ letterSpacing: '-0.011em' }}>{fullName || 'Seu nome aqui'}</motion.p>
                    </AnimatePresence>
                    <p className="text-[11px] text-white/40 truncate">{email || 'seu@email.com'}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                    <p className="tracking-widest uppercase text-white/30">Objetivo</p>
                    <p className="text-[13px] font-medium text-white mt-1 truncate">{styleObjective || '—'}</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                    <p className="tracking-widest uppercase text-white/30">Perfil</p>
                    <p className="text-[13px] font-medium text-white mt-1 truncate">{gender || '—'} {age ? `• ${age}` : ''}</p>
                  </div>
                </div>

                <div className="mt-4 h-px bg-white/[0.06]" />

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] tracking-widest uppercase text-white/30">Admissão</span>
                  <AnimatePresence>
                    {acceptedTerms ? (
                      <motion.div key="seal" initial={{ scale: 0.8, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.4, ease: [0.4,0,0.2,1.4] }} className="w-12 h-12 rounded-full bg-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_4px_12px_rgba(212,175,55,0.3)] flex items-center justify-center">
                        <Check className="w-6 h-6 text-black" strokeWidth={3} />
                      </motion.div>
                    ) : (
                      <motion.span key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/40">Aguardando consentimento</motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <p className="text-[10px] text-white/20 mt-3 text-center tracking-wide">Cartão de membro • Atualiza ao digitar</p>
              </div>
            </div>
            <p className="text-[11px] text-white/30 text-center mt-3">Edição limitada • URL assinada • Exclusão pós-laudo</p>
          </div>
        </div>
      </div>
    </div>

    {showTermsModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[20px] p-4">
        <div className="w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-[20px] overflow-hidden apple-card">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-[15px] font-semibold text-white" style={{ letterSpacing: '-0.022em' }}>Documentos Legais</h2>
            </div>
            <button onClick={() => setShowTermsModal(false)} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.08]"><X className="w-4 h-4 text-white/60" /></button>
          </div>
          <div className="flex border-b border-white/10">
            <button onClick={() => setTermsModalTab('terms')} className={`flex-1 h-11 text-[13px] font-medium ${termsModalTab === 'terms' ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-white/40 hover:text-white'}`}>Termos</button>
            <button onClick={() => setTermsModalTab('privacy')} className={`flex-1 h-11 text-[13px] font-medium ${termsModalTab === 'privacy' ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-white/40 hover:text-white'}`}>Privacidade</button>
          </div>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {termsModalTab === 'terms' ? (
              <div className="space-y-4 text-[13px] leading-relaxed text-white/60">
                <h3 className="text-[15px] font-semibold text-white">Termos de Uso</h3>
                <p>Ao utilizar o FaceMax, você concorda:</p>
                <div><h4 className="font-semibold text-white mb-1">1. Serviço</h4><p>Análises faciais e corporais por profissionais. Destinado a maiores de 18 anos.</p></div>
                <div><h4 className="font-semibold text-white mb-1">2. Fotos (Art. 11 LGPD)</h4><p>Dados sensíveis em bucket privado com URL assinada, excluídas pós-laudo, salvo consentimento.</p></div>
                <div><h4 className="font-semibold text-white mb-1">3. Responsabilidades</h4><p>Você cuida da conta; recomendações são estéticas, não médicas.</p></div>
                <div><h4 className="font-semibold text-white mb-1">4. Propriedade</h4><p>Conteúdo protegido por direitos autorais.</p></div>
              </div>
            ) : (
              <div className="space-y-4 text-[13px] leading-relaxed text-white/60">
                <h3 className="text-[15px] font-semibold text-white">Política de Privacidade</h3>
                <p>Sua privacidade importa. Coletamos nome, e-mail, idade, gênero, objetivo, fotos e uso.</p>
                <div><h4 className="font-semibold text-white mb-1">2. Fotos (sensível)</h4><p>Bucket privado, URL assinada, exclusão pós-laudo; revogável em /dashboard/profile.</p></div>
                <div><h4 className="font-semibold text-white mb-1">3. LGPD</h4><ul className="list-disc list-inside space-y-1"><li>Acesso</li><li>Correção</li><li>Eliminação</li><li>Revogação</li></ul></div>
                <div><h4 className="font-semibold text-white mb-1">4. Segurança</h4><p>HTTPS, acesso restrito, sem base64 no banco.</p></div>
                <div><h4 className="font-semibold text-white mb-1">5. DPO e Retenção</h4><p>dpo@facemax.pro — fotos até 30 dias pós-laudo ou exclusão da conta.</p></div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-white/10">
            <button onClick={() => setShowTermsModal(false)} className="w-full h-11 rounded-full bg-[#D4AF37] text-black font-semibold text-[13px] apple-button">Entendi</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
