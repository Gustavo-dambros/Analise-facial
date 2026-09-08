// Apple UI Design System – Verified: 8pt Grid, SF Typography adapted Dark Gold, Material-Depth, Spring Motion
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion, useInView } from 'framer-motion';
import { useRef, useEffect } from 'react';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { ScanFace, BarChart3, Lightbulb, ShieldCheck, Camera, Users, BookOpen, Sparkles, Check, Lock, Crown, Zap, Award, Globe, ArrowRight, Eye } from 'lucide-react';
import { FaInstagram, FaTwitter, FaLinkedin, FaGithub } from 'react-icons/fa';
import logo from '@/assets/logo.png';
import { PLANS } from '@/lib/plans';
import { Seo, jsonLdOrganization, jsonLdSoftwareApp } from '@/lib/seo';

function SelectPlanButton({ planId, children, className }) {
  const navigate = useNavigate();
  const handleClick = () => {
    localStorage.setItem('selected_plan', planId);
    const hasSession = !!localStorage.getItem('sb-lchmfruaaukeqorfmwvg-auth-token');
    navigate(hasSession ? '/checkout-simulation' : '/signup');
  };
  return <button type="button" onClick={handleClick} className={`${className} apple-transition apple-focus active:scale-[0.96] hover:scale-[1.01]`}>{children}</button>;
}

export default function LandingPage() {
  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 80]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const reportRef = useRef(null);
  const reportInView = useInView(reportRef, { once: true, amount: 0.3 });
  const score = useAnimatedNumber(reportInView ? 85 : 0, 1200, 300);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="relative min-h-screen w-screen bg-[#050507] text-white overflow-x-hidden" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Urbanist, sans-serif' }}>
      <Seo title="Home" description="Avaliação facial especializada por profissionais reais. Simetria, terços faciais e visagismo." canonical="/" type="website" jsonLd={[jsonLdOrganization, jsonLdSoftwareApp]} />

      {/* Ato 0 — Nav vidro escuro 8pt */}
      <nav className="fixed top-0 inset-x-0 z-50 h-11 flex items-center border-b border-white/[0.06]" style={{ background: 'rgba(10,10,10,0.72)', backdropFilter: 'blur(20px) saturate(180%)' }}>
        <div className="max-w-6xl mx-auto w-full px-6 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="FaceMax" className="w-7 h-7 rounded-lg" width={28} height={28} />
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white" style={{ letterSpacing: '0.14em' }}>FACEMAX</span>
            <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white/60 tracking-widest uppercase">Elite da Estética</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-[12px] font-medium">
            <a href="#como-funciona" className="text-white/60 hover:text-white apple-transition">Método</a>
            <a href="#relatorio" className="text-white/60 hover:text-white apple-transition">Prova</a>
            <a href="#pricing" className="text-white/60 hover:text-white apple-transition">Planos</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:inline-flex h-8 px-4 rounded-full text-[12px] font-medium text-white/70 hover:text-white hover:bg-white/[0.06] apple-transition">Entrar</Link>
            <Link to="/login" className="inline-flex h-8 sm:h-9 px-5 rounded-full bg-[#D4AF37] text-black text-[12px] font-semibold apple-button shadow-[0_4px_12px_rgba(0,0,0,0.15)]">Começar</Link>
          </div>
        </div>
      </nav>

      {/* Ato 1 — Provocação tipográfica */}
      <section className="relative w-full pt-11">
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-24">
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-3xl">
            <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-[#D4AF37] mb-4">Pioneirismo Nacional — Desde 2024</p>
            <h1 className="text-[40px] sm:text-[56px] md:text-[72px] font-semibold leading-[0.9] tracking-tight" style={{ letterSpacing: '-0.04em', lineHeight: 0.9 }}>
              <span className="block text-white">Seu rosto</span>
              <span className="block text-white/40">está te</span>
              <span className="block text-[#D4AF37]">favorecendo?</span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-white/60 max-w-xl" style={{ letterSpacing: '-0.011em' }}>
              Não é autoestima genérica. É medida. Três fotos, um especialista, um veredito visual que você entende em segundos.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/login" className="inline-flex h-11 px-6 rounded-full bg-[#D4AF37] text-black font-semibold text-[13px] apple-button">Começar Agora — É Grátis</Link>
              <a href="#como-funciona" className="inline-flex h-11 px-6 rounded-full border border-white/10 text-white text-[13px] font-medium apple-transition hover:bg-white/[0.04]">Ver método em 30s</a>
            </div>
            <p className="mt-3 text-[11px] text-white/30">Sem IA • Sem cartão • Fotos excluídas após laudo</p>
          </motion.div>

          {/* Prova em números — quebra de simetria, não card centralizado */}
          <motion.div className="mt-12 grid grid-cols-3 gap-3 max-w-xl pb-16" initial={prefersReduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: [0.25,0.1,0.25,1] }}>
            {[{ k: '12', l: 'atributos avaliados' }, { k: '48h', l: 'prazo padrão' }, { k: '4.9', l: 'avaliação média' }].map(s => (
              <div key={s.k} className="rounded-[16px] bg-white/[0.04] border border-white/[0.06] p-4">
                <p className="text-xl font-semibold text-white" style={{ letterSpacing: '-0.022em' }}>{s.k}</p>
                <p className="text-[11px] text-white/40 leading-tight">{s.l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Ato 2 — Método como linha do tempo horizontal */}
      <section id="como-funciona" className="w-full border-y border-white/[0.06] bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
            <h2 className="text-[22px] font-semibold tracking-tight text-white" style={{ letterSpacing: '-0.022em' }}>Método em 3 atos</h2>
            <p className="text-[12px] tracking-widest uppercase text-white/30">Captura • Olhar clínico • Protocolo</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: '01', t: 'Envio', d: 'Frente + perfis a 90°, luz natural, fundo neutro. Guia visual te impede de errar.' },
              { n: '02', t: 'Leitura', d: 'Especialista marca terços, simetria e eixos. Nada automático, nada genérico.' },
              { n: '03', t: 'Veredito', d: 'Notas 0–10, gráficos e visagismo acionável. Você sai com plano, não com elogio.' },
            ].map((s, i) => (
              <motion.div key={s.n} className="relative rounded-[20px] bg-white/[0.03] border border-white/[0.06] p-6 overflow-hidden" initial={prefersReduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 + i * 0.05, ease: [0.25,0.1,0.25,1] }}>
                <span className="text-[48px] font-semibold leading-none text-white/[0.06]" style={{ letterSpacing: '-0.04em' }}>{s.n}</span>
                <h3 className="mt-2 text-[15px] font-semibold text-white" style={{ letterSpacing: '-0.011em' }}>{s.t}</h3>
                <p className="text-[13px] leading-relaxed text-white/50 mt-1.5">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ato 3 — Prova viva: relatório que monta no scroll */}
      <section id="relatorio" className="w-full bg-[#050507] py-16">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[#D4AF37]">Prova viva</p>
            <h2 className="mt-2 text-[28px] md:text-[36px] font-semibold leading-tight text-white" style={{ letterSpacing: '-0.022em' }}>O relatório não é mock.<br />É o seu.</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/60" style={{ letterSpacing: '-0.011em' }}>Cada traço vira número, cada número vira instrução. Simetria, terços e recomendações que um humano assina.</p>
            <ul className="mt-6 space-y-2">
              {['Simetria em escala 0–100', 'Terços com soma 100% auditável', 'Dica de especialista acionável'].map(t => (
                <li key={t} className="flex items-center gap-2 text-[13px] text-white/70"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />{t}</li>
              ))}
            </ul>
            <Link to="/login" className="mt-6 inline-flex h-11 px-6 rounded-full bg-white text-black font-semibold text-[13px] apple-button">Gerar o meu</Link>
          </div>

          <motion.div ref={reportRef} className="rounded-[20px] bg-[#0A0A0A] border border-white/[0.06] overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.5)]" initial={prefersReduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.25,0.1,0.25,1] }}>
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold text-white">Pontuação de Harmonia</p>
                <p className="text-[11px] text-white/40">Laudo assinado por especialista</p>
              </div>
              <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">Relatório</span>
            </div>
            <div className="p-6">
              <div className="flex justify-center">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                    <motion.circle cx="60" cy="60" r="52" fill="none" stroke="#D4AF37" strokeWidth="10" strokeLinecap="round" strokeDasharray="327" initial={{ strokeDashoffset: 327 }} animate={reportInView ? { strokeDashoffset: 49 } : {}} transition={{ duration: 1.2, ease: [0.25,0.1,0.25,1], delay: 0.2 }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-semibold text-white">{Math.round(score)}</span>
                    <span className="text-[10px] tracking-widest uppercase text-white/40">Harmonia</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {[{ l: 'Terço Superior', v: 33 }, { l: 'Terço Médio', v: 33 }, { l: 'Terço Inferior', v: 34 }].map(i => (
                  <div key={i.l} className="space-y-1">
                    <div className="flex justify-between text-[11px]"><span className="text-white/50">{i.l}</span><span className="text-white font-medium">{i.v}%</span></div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"><motion.div className="h-full bg-[#D4AF37] rounded-full" initial={{ width: 0 }} animate={{ width: `${i.v}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2, ease: [0.25,0.1,0.25,1] }} /></div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-3 rounded-xl bg-[#D4AF37]/[0.06] border border-[#D4AF37]/15 flex gap-3">
                <Sparkles className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
                <p className="text-[12px] leading-relaxed text-white/60"><span className="text-[#D4AF37] font-medium">Dica do especialista:</span> terços equilibrados — volume lateral realça ainda mais.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Ato 4 — Diferenciais em lista editorial, não cards clichês */}
      <section className="w-full bg-[#0A0A0A] border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-[11px] font-semibold tracking-widest uppercase text-[#D4AF37]">Por que FaceMax</p>
              <h2 className="mt-2 text-[24px] font-semibold text-white" style={{ letterSpacing: '-0.022em' }}>Sem template.<br />Sem genérico.</h2>
            </div>
            <div className="space-y-6">
              {[
                { t: 'Olho humano, sem automação', d: 'Cada foto é lida por gente. O especialista assina o laudo com nome.' },
                { t: 'Visagismo que age', d: 'Corte, barba e óculos recomendados para o seu rosto, não tendências.' },
                { t: 'Privacidade de verdade', d: 'Bucket privado, URL assinada, exclusão pós-laudo. Seus dados não treinam nada.' },
              ].map((f, i) => (
                <motion.div key={f.t} className="flex gap-4" initial={prefersReduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
                  <span className="text-[11px] font-semibold tracking-widest text-[#D4AF37] mt-1">0{i+1}</span>
                  <div>
                    <p className="text-[14px] font-semibold text-white" style={{ letterSpacing: '-0.011em' }}>{f.t}</p>
                    <p className="text-[13px] text-white/50 leading-relaxed mt-1">{f.d}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ato 5 — Preço como tabela comparativa, não 3 cards clonados */}
      <section id="pricing" className="w-full bg-[#050507] py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.022em' }}>Escolha seu ritmo</h2>
            <p className="text-[12px] text-white/30 tracking-widest uppercase">Reais • Sem IOF • Cancele quando quiser</p>
          </div>

          <div className="mt-6 overflow-x-auto rounded-[20px] border border-white/[0.06] bg-white/[0.02]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="p-4 text-[11px] font-semibold tracking-widest uppercase text-white/40">Recurso</th>
                  <th className="p-4 text-center text-[12px] font-semibold text-white/60">Regular<br /><span className="text-white font-semibold">R$ 24,90/mês</span></th>
                  <th className="p-4 text-center bg-[#D4AF37] text-black rounded-t-[20px]">
                    <span className="text-[10px] font-bold tracking-widest uppercase">Mais Vendido</span><br />
                    <span className="text-[13px] font-semibold">Contínua — R$ 179/ano</span>
                  </th>
                  <th className="p-4 text-center text-[12px] font-semibold text-white/60">Elite<br /><span className="text-white font-semibold">R$ 49,90/mês</span></th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {[
                  ['Avaliações/mês', '1', '2', '4'],
                  ['Prazo', '5 dias', '48h', '12h'],
                  ['Visagismo', '✓', '✓ + evolução', '✓ completo + cores'],
                  ['Relatório', 'Essencial', 'Estendido', 'Estendido+'],
                ].map(row => (
                  <tr key={row[0]} className="border-b border-white/[0.04]">
                    <td className="p-4 text-white/70">{row[0]}</td>
                    <td className="p-4 text-center text-white/60">{row[1]}</td>
                    <td className="p-4 text-center bg-[#D4AF37]/10 text-white font-medium">{row[2]}</td>
                    <td className="p-4 text-center text-white/60">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <SelectPlanButton planId="plan_monthly" className="h-11 rounded-full border border-white/10 text-white text-[13px] font-medium hover:bg-white/[0.04]">Assinar Regular</SelectPlanButton>
            <SelectPlanButton planId="plan_annual" className="h-11 rounded-full bg-[#D4AF37] text-black font-semibold text-[13px]">Assinar Contínua</SelectPlanButton>
            <SelectPlanButton planId="plan_black" className="h-11 rounded-full bg-white text-black font-semibold text-[13px]">Assinar Elite</SelectPlanButton>
          </div>
          <p className="mt-3 text-center text-[11px] text-white/30 flex items-center justify-center gap-1.5"><Lock className="w-3 h-3" /> Transações seguras via Mercado Pago</p>
        </div>
      </section>

      {/* Ato 6 — Fechamento */}
      <section className="w-full bg-[#0A0A0A] py-16 border-y border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-[28px] md:text-[40px] font-semibold leading-tight text-white" style={{ letterSpacing: '-0.022em' }}>Pronto para o <span className="text-[#D4AF37]">veredito?</span></h2>
          <p className="text-[15px] text-white/60 mt-3">Milhares já viram o rosto com outros olhos. Comece sem cartão.</p>
          <Link to="/login" className="mt-6 inline-flex h-11 px-6 rounded-full bg-[#D4AF37] text-black font-semibold text-[13px] apple-button">Criar Conta Grátis <ArrowRight className="w-4 h-4 ml-1" /></Link>
        </div>
      </section>

      <footer className="w-full bg-[#050507] border-t border-white/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-4 text-center">
          <div className="flex gap-3">
            {[FaInstagram, FaTwitter, FaLinkedin, FaGithub].map((Icon,i) => (
              <a key={i} href="#" className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-[#D4AF37] apple-transition"><Icon className="w-4 h-4" /></a>
            ))}
          </div>
          <p className="text-[12px] text-white/40 max-w-md" style={{ letterSpacing: '-0.011em' }}>Avaliação facial por profissionais reais para revelar seu potencial visual único.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-white/30">
            <a href="/privacidade" className="hover:text-[#D4AF37] underline underline-offset-4">Privacidade</a><span>•</span><a href="/termos" className="hover:text-[#D4AF37] underline underline-offset-4">Termos</a><span>•</span><a href="mailto:dpo@facemax.pro">dpo@facemax.pro</a>
          </div>
          <p className="text-[11px] text-white/20">{new Date().getFullYear()} — FaceMax — Elite da Estética</p>
        </div>
      </footer>
    </div>
  );
}
