import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion, useInView } from 'framer-motion';
import { useRef, useEffect } from 'react';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { ScanFace, BarChart3, Lightbulb, ShieldCheck, Camera, Users, BookOpen, Sparkles, TrendingUp, Check, Lock, Crown, Zap, Award, Globe } from 'lucide-react';
import { FaInstagram, FaTwitter, FaLinkedin, FaGithub } from 'react-icons/fa';
import GradientText from '@/components/ui/GradientText';
import CardNav from '@/components/ui/CardNav';
import GlassSurface from '@/components/ui/GlassSurface';
import logo from '@/assets/logo.png';
import heroBg from '@/assets/background_ladinpage.png';
import heroMobileBg from '@/assets/hero-mobile.jpg';
import {
  ScrollFadeUp,
  ScrollStaggerContainer,
  ScrollStaggerItem,
} from '@/components/ui/page-transition';
import { PLANS } from '@/lib/plans';
import { Seo, jsonLdOrganization, jsonLdSoftwareApp } from '@/lib/seo';

const navItems = [
  {
    label: "Sobre",
    bgColor: "#000000",
    textColor: "#fff",
    links: [
      { label: "Como Funciona", href: "#como-funciona", ariaLabel: "Como Funciona" },
      { label: "Relatório", href: "#relatorio", ariaLabel: "Ver Relatório" }
    ]
  },
  {
    label: "Planos",
    bgColor: "#000000",
    textColor: "#fff",
    links: [
      { label: "Mensal", href: "#pricing", ariaLabel: "Plano Mensal" },
      { label: "Anual", href: "#pricing", ariaLabel: "Plano Anual" },
      { label: "Black", href: "#pricing", ariaLabel: "Plano Black" }
    ]
  },
  {
    label: " Contato",
    bgColor: "#000000",
    textColor: "#fff",
    links: [
      { label: "Suporte", href: "mailto:suporte@facemax.com.br", ariaLabel: "Suporte" },
      { label: "Instagram", href: "#instagram", ariaLabel: "Instagram" }
    ]
  }
];

const features = [
  {
    icon: ScanFace,
    title: "Análise de Elite",
    description: "IA proprietária que mapeia mais de 468 pontos faciais com precisão milimétrica, complementada pelo olhar clínico de um especialista real.",
    hueA: 43,
    hueB: 50,
  },
  {
    icon: BarChart3,
    title: "Relatório Premium",
    description: "Dashboard interativo com terços faciais, simetria, harmonia e eixos estéticos traçados diretamente nas suas fotos.",
    hueA: 35,
    hueB: 45,
  },
  {
    icon: Lightbulb,
    title: "Visagismo Profissional",
    description: "Recomendações exclusivas de corte, barba e armações escritas por especialistas em estética facial.",
    hueA: 40,
    hueB: 55,
  },
  {
    icon: ShieldCheck,
    title: "Privacidade Absoluta",
    description: "Suas fotos são processadas localmente e nunca saem do nosso servidor. Seu rosto é só seu.",
    hueA: 30,
    hueB: 42,
  },
];

const steps = [
  {
    number: "01",
    title: "Envio de Fotos",
    description: "Envie 3 fotos simples: uma de frente e duas de perfil. Nossa IA captura cada detalhe com precisão cirúrgica.",
    icon: Camera,
  },
  {
    number: "02",
    title: "Avaliação Humana",
    description: "Um especialista em estética facial analisa sua simetria, estrutura e características únicas com olhar clínico.",
    icon: Users,
  },
  {
    number: "03",
    title: "Protocolo Personalizado",
    description: "Receba seu relatório completo com notas, gráficos e um guia visual de visagismo sob medida para você.",
    icon: BookOpen,
  },
];

const easeOutExpo = [0.16, 1, 0.3, 1];

function FeatureCard({ feature, index }) {
  const prefersReduced = useReducedMotion();
  const hue = (h) => `hsl(${h}, 100%, 50%)`;
  const isEven = index % 2 === 0;

  const isLeft = index === 0 || index === 2;
  const isRight = index === 1 || index === 3;

  return (
    <motion.div
      className={`flex items-center relative py-8 ${isLeft ? 'justify-start pl-8' : isRight ? 'justify-end pr-8' : 'justify-center'}`}
      style={{ marginBottom: index < features.length - 1 ? '-28px' : '0' }}
      initial={prefersReduced ? false : { opacity: 0, y: 80, rotate: isEven ? 6 : -6 }}
      whileInView={{ opacity: 1, y: 40, rotate: isEven ? -6 : 6 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ type: "spring", stiffness: 200, damping: 24, mass: 0.8 }}
    >
      <div className="relative">
        <div
          className="absolute -inset-6 opacity-100 pointer-events-none"
          style={{
            background: `linear-gradient(${isEven ? 306 : 54}deg, ${hue(feature.hueA)}, ${hue(feature.hueB)})`,
            clipPath: `path("M 0 303.5 C 0 292.454 8.995 285.101 20 283.5 L 460 219.5 C 470.085 218.033 480 228.454 480 239.5 L 500 430 C 500 441.046 491.046 450 480 450 L 20 450 C 8.954 450 0 441.046 0 430 Z")`,
            transform: `scale(1.125) ${isLeft ? 'scaleX(-1)' : ''}`,
            transformOrigin: 'center',
          }}
        />
        <div className="relative z-10 w-[200px] h-[274px] rounded-2xl bg-card-bg border border-border flex flex-col items-center justify-center gap-2 shadow-2xl overflow-hidden">
          <div className="flex flex-col items-center justify-center gap-2 p-3.5">
            <motion.span
              className="text-brand-accent"
              initial={prefersReduced ? false : { scale: 0.5, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
            >
              <feature.icon className="w-[40px] h-[40px]" strokeWidth={1.5} />
            </motion.span>
            <h3 className="text-[15px] font-bold text-text-primary text-center font-montenegrin">{feature.title}</h3>
            <p className="text-[11px] text-text-secondary text-center leading-relaxed">{feature.description}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SelectPlanButton({ planId, children, className }) {
  const navigate = useNavigate();
  const handleClick = () => {
    localStorage.setItem('selected_plan', planId);
    const token = localStorage.getItem('sb-lchmfruaaukeqorfmwvg-auth-token');
    // Se já logado, vai direto pro checkout; senão, cadastro
    const hasSession = !!token;
    navigate(hasSession ? '/checkout-simulation' : '/signup');
  };
  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}

export default function LandingPage() {
  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();
  const heroBgY = useTransform(scrollY, [0, 600], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.3]);
  const heroScale = useTransform(scrollY, [0, 600], [1, 1.08]);

  const circleRef = useRef(null);
  const circleInView = useInView(circleRef, { once: true, amount: 0.5 });
  const animatedScore = useAnimatedNumber(circleInView ? 85 : 0, 1200, 300);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative min-h-screen w-screen bg-background overflow-x-hidden font-urbanist">
      <Seo title="Home" description="A melhor IA brasileira de avaliação facial. Simetria, terços faciais e visagismo por especialistas." canonical="/" type="website" jsonLd={[jsonLdOrganization, jsonLdSoftwareApp]} />

      {/* Hero Section */}
      <section className="relative h-screen w-full">
        <motion.div
          className="absolute inset-0 w-full h-full z-0"
          style={{ y: heroBgY, opacity: heroOpacity, scale: heroScale }}
        >
          <img src={heroBg} alt="Background" className="w-full h-full object-cover hidden md:block" />
          <img src={heroMobileBg} alt="Background" className="w-full h-full object-cover md:hidden" />
          <div className="absolute inset-0 bg-background/50" />
        </motion.div>

        <header className="absolute top-0 left-0 w-full z-30 pointer-events-auto">
          <div className="relative w-full">
            <div className="absolute inset-0 z-0">
              <GlassSurface width="100%" height="100%" borderRadius={0} backgroundOpacity={0.08} blur={20} saturation={2} brightness={60} displace={2} distortionScale={-250} redOffset={40} greenOffset={15} blueOffset={5} borderWidth={0.1} opacity={0.85} mixBlendMode="screen" className="w-full h-full" />
            </div>
            <motion.div className="relative z-10" initial={prefersReduced ? false : { opacity: 0, scaleX: 0, originX: 0.5 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1], delay: 0.15 }}>
              <CardNav logo={logo} logoAlt="FaceMax" items={navItems} baseColor="rgba(0, 0, 0, 0.85)" menuColor="#ffffff" buttonBgColor="#D4AF37" buttonTextColor="#000000" />
            </motion.div>
          </div>
        </header>

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
          <motion.span className="text-brand-accent text-xs font-semibold tracking-[0.4em] uppercase mb-6" initial={prefersReduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.1 }}>
            Pioneirismo Nacional em Estética Facial
          </motion.span>

          <motion.h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-center max-w-5xl leading-tight font-montenegrin" initial={prefersReduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.25 }}>
            <GradientText colors={["#D4AF37", "#B8860B", "#FFD700", "#8B6914"]} animationSpeed={4}>
              A Elite da Estética<br />Brasileira
            </GradientText>
          </motion.h1>

          <motion.p className="text-text-secondary text-base md:text-lg text-center max-w-2xl mt-6 leading-relaxed" initial={prefersReduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.4 }}>
            A melhor IA brasileira de avaliação facial trabalhando em conjunto com o olhar clínico de profissionais reais. Resultados que transformam vidas.
          </motion.p>

          <motion.div className="mt-6 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full border border-brand-accent/30 bg-brand-accent/5 max-w-full overflow-hidden" initial={prefersReduced ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: easeOutExpo, delay: 0.5 }}>
            <span className="text-brand-accent text-[10px] sm:text-xs font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
              <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">O Único Site de Looksmaxxing que Cobra em Reais. Sem taxas abusivas de câmbio, sem IOF.</span>
            </span>
          </motion.div>

          <div className="flex flex-nowrap gap-3 sm:gap-4 mt-10">
            <motion.div initial={prefersReduced ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6, ease: easeOutExpo }}>
              <Link to="/login" className="inline-flex items-center justify-center px-5 sm:px-8 h-[44px] sm:h-[48px] rounded-xl bg-brand-accent text-background font-bold text-xs sm:text-sm whitespace-nowrap hover:opacity-90 transition-all duration-300 shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:shadow-[0_0_50px_rgba(212,175,55,0.5)]">
                Começar Agora — É Grátis
              </Link>
            </motion.div>
            <motion.div initial={prefersReduced ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6, ease: easeOutExpo }}>
              <GlassSurface width={160} height={44} borderRadius={12} backgroundOpacity={0.15} blur={10} saturation={1.3} brightness={50} displace={0.3}>
                <a href="#como-funciona" className="inline-flex items-center justify-center w-full h-full text-white font-medium text-xs sm:text-sm text-center whitespace-nowrap">
                  Como Funciona
                </a>
              </GlassSurface>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Authority Badge Section */}
      <section className="relative z-20 w-full py-16 bg-gradient-to-b from-background via-brand-accent/5 to-background">
        <ScrollFadeUp className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            {[
              { icon: Award, label: "Especialistas Reais", sub: "Profissionais clínicos" },
              { icon: Zap, label: "Entrega Expressa", sub: "Até 12 horas úteis" },
              { icon: Globe, label: "100% Brasileiro", sub: "Pioneirismo Nacional" },
              { icon: ShieldCheck, label: "Privacidade Total", sub: "Fotos nunca armazenadas" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-brand-accent" />
                </div>
                <div>
                  <p className="text-text-primary text-sm font-semibold">{item.label}</p>
                  <p className="text-text-muted text-xs">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollFadeUp>
      </section>

      {/* Features Section */}
      <section className="relative z-20 w-full bg-background">
        <ScrollFadeUp className="w-full flex flex-col items-center justify-center pt-24 pb-12 px-6">
          <span className="text-brand-accent text-sm font-medium tracking-widest uppercase mb-4">Funcionalidades</span>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary text-center max-w-2xl font-montenegrin">
            Análise facial com inteligência artificial e olhar humano
          </h2>
          <p className="text-text-secondary text-center mt-4 max-w-xl">
            Descubra os segredos da sua harmonia facial com tecnologia de ponta aliada a especialistas reais
          </p>
        </ScrollFadeUp>

        <div className="max-w-5xl mx-auto px-6 pb-20">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </section>

      {/* Como Funciona Section */}
      <section id="como-funciona" className="relative z-20 w-full bg-background">
        <ScrollFadeUp className="w-full flex flex-col items-center justify-center pt-24 pb-12 px-6">
          <span className="text-brand-accent text-sm font-medium tracking-widest uppercase mb-4">Processo Simples</span>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary text-center max-w-2xl font-montenegrin">
            Sua Jornada de Evolução em 3 Passos
          </h2>
        </ScrollFadeUp>

        <ScrollStaggerContainer className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <ScrollStaggerItem key={step.number}>
              <div className="bg-card-bg border border-border rounded-2xl p-8 flex flex-col items-center text-center h-full hover:border-brand-accent/30 transition-colors duration-300">
                <span className="text-6xl font-black text-brand-accent mb-4 font-playfair">{step.number}</span>
                <step.icon className="w-12 h-12 text-brand-accent mb-4" strokeWidth={1.5} />
                <h3 className="text-lg font-semibold text-text-primary mb-3 font-montenegrin">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
              </div>
            </ScrollStaggerItem>
          ))}
        </ScrollStaggerContainer>
      </section>

      {/* Seu Relatório por Dentro Section */}
      <section id="relatorio" className="relative z-20 w-full bg-background">
        <div className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <ScrollFadeUp className="flex flex-col gap-6">
            <span className="text-brand-accent text-sm font-medium tracking-widest uppercase">Seu Relatório por Dentro</span>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary leading-tight font-montenegrin">
              Um relatório de elite, direto ao ponto
            </h2>
            <p className="text-text-secondary text-base leading-relaxed">
              Cada análise gera um relatório completo com métricas precisas, gráficos interativos e recomendações personalizadas por um especialista real. Tudo organizado para você entender exatamente o seu perfil facial.
            </p>
            <ul className="flex flex-col gap-3 mt-2">
              {['Gráficos de simetria e harmonia facial', 'Divisão precisa dos terços faciais', 'Dicas exclusivas do especialista'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-text-secondary text-sm">
                  <span className="w-2 h-2 rounded-full bg-brand-accent flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </ScrollFadeUp>

          <ScrollFadeUp className="flex justify-center lg:justify-end" amount={0.2}>
            <div className="w-full max-w-md bg-card-bg border border-border rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-text-primary font-semibold text-sm font-playfair">Pontuação de Harmonia</h4>
                    <p className="text-text-secondary text-xs mt-0.5">Análise Biométrica em Tempo Real</p>
                  </div>
                  <span className="text-brand-accent text-[10px] font-medium bg-brand-accent/10 px-2.5 py-1 rounded-full uppercase tracking-wider">Relatório</span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-center mb-6">
                  <div className="relative w-36 h-36" ref={circleRef}>
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="#141414" strokeWidth="10" />
                      <motion.circle
                        cx="60" cy="60" r="52" fill="none" stroke="#D4AF37" strokeWidth="10"
                        strokeLinecap="round" strokeDasharray="327"
                        initial={{ strokeDashoffset: 327 }}
                        whileInView={{ strokeDashoffset: 49 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-white text-xl font-bold">{Math.round(animatedScore)}</span>
                      <span className="text-text-secondary text-[9px]">Pontuação Geral</span>
                    </div>
                  </div>
                </div>
                <div className="mb-6">
                  <h5 className="text-text-primary text-xs font-semibold mb-3">Proporção dos Terços Faciais</h5>
                  <div className="flex flex-col gap-3">
                    {[{ label: 'Terço Superior', value: 33 }, { label: 'Terço Médio', value: 33 }, { label: 'Terço Inferior', value: 34 }].map((item) => (
                      <div key={item.label} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary text-[11px]">{item.label}</span>
                          <span className="text-text-primary text-[11px] font-medium">{item.value}%</span>
                        </div>
                        <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                          <div className="h-full bg-brand-accent rounded-full" style={{ width: `${item.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-background rounded-xl border border-brand-accent/20">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-brand-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
                    </div>
                    <div>
                      <span className="text-brand-accent text-[11px] font-semibold block mb-1">Dica do Especialista</span>
                      <p className="text-text-secondary text-[11px] leading-relaxed">Seus terços estão equilibrados. Um corte com volume lateral pode realçar ainda mais a harmonia do seu rosto.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-20 w-full bg-background">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <ScrollFadeUp className="text-center mb-16">
            <span className="text-brand-accent text-sm font-medium tracking-widest uppercase mb-4 block">Elite da Estética</span>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4 font-montenegrin">
              Escolha o seu plano de transformação
            </h2>
            <p className="text-text-secondary text-base max-w-2xl mx-auto leading-relaxed">
              Acesso direto a avaliadores e especialistas reais em visagismo. Sem automações, sem respostas genéricas de IA. Apenas olhos clínicos de profissionais.
            </p>
          </ScrollFadeUp>

          <ScrollStaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
            {/* Card 1 - Mensal */}
            <ScrollStaggerItem>
              <div className="bg-card-bg border border-border rounded-2xl p-8 flex flex-col h-full hover:border-brand-accent/20 transition-colors duration-300">
                <div className="mb-6">
                  <h3 className="text-text-secondary text-sm font-medium uppercase tracking-wider mb-2">Acesso Regular</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-text-muted text-lg">R$</span>
                    <span className="text-4xl md:text-5xl font-black text-text-primary font-playfair">24</span>
                    <span className="text-text-muted text-sm">,90 / mês</span>
                  </div>
                </div>
                <SelectPlanButton planId="plan_monthly" className="w-full py-3.5 px-6 rounded-xl border border-brand-accent/50 text-brand-accent font-semibold text-sm text-center hover:bg-brand-accent/10 transition-colors mb-8">
                  Assinar Mensal
                </SelectPlanButton>
                <ul className="flex flex-col gap-3.5 flex-1">
                  {PLANS.plan_monthly.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                      <span className="text-text-secondary text-sm leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollStaggerItem>

            {/* Card 2 - Anual (MAIS VENDIDO) */}
            <ScrollStaggerItem>
              <div className="bg-card-bg border-2 border-brand-accent/60 rounded-2xl p-8 flex flex-col h-full relative shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-accent text-background text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] whitespace-nowrap">
                    Mais Vendido — Economize R$ 120
                  </span>
                </div>
                <div className="mb-6">
                  <h3 className="text-brand-accent text-sm font-medium uppercase tracking-wider mb-2">Evolução Contínua</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-text-muted text-lg">R$</span>
                    <span className="text-4xl md:text-5xl font-black text-text-primary font-playfair">179</span>
                    <span className="text-text-muted text-sm">,00 / ano</span>
                  </div>
                  <p className="text-brand-accent/80 text-xs mt-2 font-medium">Equivale a R$ 14,92/mês</p>
                </div>
                <SelectPlanButton planId="plan_annual" className="w-full py-3.5 px-6 rounded-xl bg-brand-accent text-background font-bold text-sm text-center hover:opacity-90 transition-all duration-300 shadow-[0_0_30px_rgba(212,175,55,0.25)] hover:shadow-[0_0_50px_rgba(212,175,55,0.4)] mb-8 animate-glow-pulse">
                  Assinar Anual
                </SelectPlanButton>
                <ul className="flex flex-col gap-3.5 flex-1">
                  {PLANS.plan_annual.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                      <span className="text-text-secondary text-sm leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollStaggerItem>

            {/* Card 3 - Black */}
            <ScrollStaggerItem>
              <div className="bg-card-bg border border-border rounded-2xl p-8 flex flex-col h-full hover:border-brand-accent/20 transition-colors duration-300">
                <div className="mb-6">
                  <h3 className="text-brand-accent text-sm font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Elite Estética
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-text-muted text-lg">R$</span>
                    <span className="text-4xl md:text-5xl font-black text-text-primary font-playfair">49</span>
                    <span className="text-text-muted text-sm">,90 / mês</span>
                  </div>
                </div>
                <SelectPlanButton planId="plan_black" className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] border border-[#333] text-text-primary font-semibold text-sm text-center hover:border-brand-accent/40 transition-all duration-300 mb-8">
                  Assinar Black
                </SelectPlanButton>
                <ul className="flex flex-col gap-3.5 flex-1">
                  {PLANS.plan_black.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                      <span className="text-text-secondary text-sm leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollStaggerItem>
          </ScrollStaggerContainer>

          <ScrollFadeUp className="mt-12 text-center">
            <p className="text-text-muted text-sm flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              Transações 100% seguras via Stripe. Cancele ou altere o seu plano a qualquer momento.
            </p>
          </ScrollFadeUp>
        </div>
      </section>

      {/* CTA Final Section */}
      <section className="relative z-20 w-full py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-brand-accent/5 to-background" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <ScrollFadeUp>
            <Sparkles className="w-12 h-12 text-brand-accent mx-auto mb-6" strokeWidth={1.5} />
            <h2 className="text-3xl md:text-5xl font-bold text-text-primary mb-6 leading-tight font-montenegrin">
              Pronto para descobrir o seu{' '}
              <span className="text-brand-accent">verdadeiro potencial</span>?
            </h2>
            <p className="text-text-secondary text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Junte-se a milhares de brasileiros que já transformaram sua auto-imagem com o FaceMax. Comece agora gratuitamente.
            </p>
            <Link to="/login" className="group relative inline-flex items-center justify-center px-10 h-14 rounded-xl bg-brand-accent text-background font-bold text-base hover:opacity-90 transition-all duration-300 shadow-[0_0_40px_rgba(212,175,55,0.3)] hover:shadow-[0_0_60px_rgba(212,175,55,0.5)]">
              <span className="relative z-10 flex items-center gap-2">
                Criar Minha Conta Grátis
                <TrendingUp className="w-5 h-5" />
              </span>
            </Link>
            <p className="text-text-muted text-xs mt-4">Sem cartão de crédito. Cancele quando quiser.</p>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 w-full bg-card-bg text-center flex flex-col items-center gap-4 py-12 border-t border-border">
        <div className="flex gap-3">
          {[FaInstagram, FaTwitter, FaLinkedin, FaGithub].map((Icon, i) => (
            <a key={i} href="#" className="w-10 h-10 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:text-brand-accent hover:border-brand-accent/40 transition-colors">
              <Icon className="w-5 h-5" />
            </a>
          ))}
        </div>
        <div className="w-12 h-[2px] bg-brand-accent/30 my-2" />
        <p className="text-text-secondary text-sm font-normal max-w-md leading-relaxed">
          A melhor IA brasileira de avaliação facial. Mapeamos mais de 468 pontos faciais para revelar o seu potencial visual único.
        </p>
        <div className="w-full h-[1px] bg-border my-2" />
        <div className="text-text-muted text-sm">
          {new Date().getFullYear()} — <strong className="text-brand-accent font-playfair">FaceMax</strong> — Elite da Estética
        </div>
      </footer>
    </div>
  );
}
