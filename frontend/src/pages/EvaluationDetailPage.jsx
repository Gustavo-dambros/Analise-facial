import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, User, Flag, AlertTriangle, CheckCircle2, Calendar, Check, Minus, Dumbbell } from 'lucide-react';
import ChartRadialText from '@/components/evaluation/ChartRadialText';
import RadarAttributes from '@/components/evaluation/RadarAttributes';
import FacialThirds from '@/components/evaluation/FacialThirds';
import HighlightBadges from '@/components/evaluation/HighlightBadges';
import AttributeTable from '@/components/evaluation/AttributeTable';
import BodyRadarChart from '@/components/evaluation/BodyRadarChart';
import { FadeIn, ScaleIn, SlideInLeft, SlideInRight, StaggerContainer, StaggerItem } from '@/components/ui/page-transition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

const BUCKET = 'analysis-photos';

const REPORT_STATUS_LABELS = {
  pending: 'Em analise',
  reviewed: 'Revisado',
  dismissed: 'Descartado',
  resolved: 'Resolvido',
};

const REPORT_STATUS_COLORS = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  reviewed: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  dismissed: 'text-text-muted bg-white/5 border-border',
  resolved: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

const FACIAL_ATTRIBUTES = [
  { key: 'tercoSuperior', label: 'Terço Superior', icon: '📏' },
  { key: 'tercoMedio', label: 'Terço Médio', icon: '📏' },
  { key: 'tercoInferior', label: 'Terço Inferior', icon: '📏' },
  { key: 'olhos', label: 'Olhos', icon: '👁️' },
  { key: 'sobrancelhas', label: 'Sobrancelhas', icon: '🤨' },
  { key: 'nariz', label: 'Nariz', icon: '👃' },
  { key: 'lábios', label: 'Lábios', icon: '👄' },
  { key: 'mandibula', label: 'Mandíbula', icon: '🦷' },
  { key: 'queixo', label: 'Queixo', icon: '🦷' },
  { key: 'macasRosto', label: 'Maçãs do Rosto', icon: '💎' },
  { key: 'harmonia', label: 'Harmonia', icon: '⚖️' },
  { key: 'testa', label: 'Testa', icon: '📐' },
  { key: 'formatoRosto', label: 'Formato do Rosto', icon: '🔷' },
];

const WEEK_DAYS = [
  { key: 'monday', label: 'Segunda-feira', short: 'Seg' },
  { key: 'tuesday', label: 'Terça-feira', short: 'Ter' },
  { key: 'wednesday', label: 'Quarta-feira', short: 'Qua' },
  { key: 'thursday', label: 'Quinta-feira', short: 'Qui' },
  { key: 'friday', label: 'Sexta-feira', short: 'Sex' },
  { key: 'saturday', label: 'Sábado', short: 'Sáb' },
  { key: 'sunday', label: 'Domingo', short: 'Dom' },
];

function scoreToLabel(score) {
  const num = Number(score);
  if (num >= 7 && num <= 10) return 'Ótimo';
  if (num >= 4 && num <= 6) return 'Bom';
  if (num >= 1 && num <= 3) return 'Ok';
  return '—';
}

function labelToColor(label) {
  switch (label) {
    case 'Ótimo': return 'text-green-400 bg-green-400/10 border-green-400/20';
    case 'Bom': return 'text-brand-accent bg-yellow-400/10 border-yellow-400/20';
    case 'Ok': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    default: return 'text-text-muted bg-white/5 border-border';
  }
}

function parseExercises(str) {
  if (!str) return [];
  return str.split(';').map(s => s.trim()).filter(Boolean);
}

function getPhotoUrl(urlOrPath) {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith('http')) return urlOrPath;
  const supabase = createClient();
  const cleanPath = urlOrPath.replace(/^\/+/, '');
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(cleanPath);
  return data?.publicUrl || null;
}

export default function EvaluationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entry, setEntry] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedExercises, setCompletedExercises] = useState({});

  useEffect(() => {
    if (!user || !id) return;
    fetchEntry();
    fetchReport();
  }, [id, user]);

  const fetchEntry = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        setEntry(null);
        return;
      }

      setEntry({
        id: data.id,
        status: data.status,
        createdAt: data.created_at,
        photos: {
          front: getPhotoUrl(data.photo_front_url),
          left: getPhotoUrl(data.photo_left_url),
          right: getPhotoUrl(data.photo_right_url),
          body: getPhotoUrl(data.photo_body_url),
        },
        evaluation: data.result && Object.keys(data.result).length > 0 ? data.result : null,
        body_evaluation: data.body_result && Object.keys(data.body_result).length > 0 ? data.body_result : null,
        exercise_recommendations: data.exercise_recommendations && Object.keys(data.exercise_recommendations).length > 0 ? data.exercise_recommendations : null,
        verdict_text: data.verdict_text,
        reviewed_at: data.reviewed_at,
      });
    } catch (err) {
      console.error('Failed to fetch evaluation:', err);
      setEntry(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('evaluation_reports')
        .select('*')
        .eq('analysis_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch report:', error);
        return;
      }

      setReport(data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    }
  };

  const handleExerciseToggle = (dayKey, type, index) => {
    const key = `${dayKey}-${type}-${index}`;
    setCompletedExercises(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-accent animate-spin" />
      </div>
    );
  }

  if (!entry || !entry.evaluation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-text-secondary">Avaliacao nao encontrada.</p>
        <button
          onClick={() => navigate('/dashboard/progress')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-background text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>
    );
  }

  const ev = entry.evaluation;
  const exRecs = entry.exercise_recommendations;

const radarData = useMemo(() => {
    if (ev.attributes && Object.keys(ev.attributes).length > 0) {
      return Object.entries(ev.attributes).map(([feature, score]) => ({ feature, score }));
    }
    return [
      { feature: 'Simetria', score: Math.round((ev.symmetry_score || 0) * 10) },
      { feature: 'Terço Sup.', score: ev.attributes?.tercoSuperior || 0 },
      { feature: 'Terço Médio', score: ev.attributes?.tercoMedio || 0 },
      { feature: 'Terço Inf.', score: ev.attributes?.tercoInferior || 0 },
      { feature: 'Mandíbula', score: ev.attributes?.mandibula || 0 },
      { feature: 'Olhos', score: ev.attributes?.olhos || 0 },
      { feature: 'Nariz', score: ev.attributes?.nariz || 0 },
      { feature: 'Lábios', score: ev.attributes?.lábios || 0 },
      { feature: 'Harmonia', score: ev.attributes?.harmonia || 0 },
    ];
  }, [ev]);

  const attrEntries = ev.attributes && Object.keys(ev.attributes).length > 0
    ? ev.attributes
    : null;

  const thirdsData = useMemo(() => [
    { label: 'Terço Superior (Testa)', value: ev.thirds?.superior ?? 0 },
    { label: 'Terço Médio (Nariz)', value: ev.thirds?.medio ?? 0 },
    { label: 'Terço Inferior (Mandíbula)', value: ev.thirds?.inferior ?? 0 },
  ], [ev]);

  return (
    <div className="flex-1 p-4 md:p-8 md:pl-4">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => navigate('/dashboard/progress')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div className="h-5 w-px bg-border" />
            <h1 className="text-lg font-bold tracking-tight text-text-primary font-alpino">
              Detalhe da Avaliacao
            </h1>
          </div>
        </FadeIn>

        {/* Report Alert */}
        {report && (
          <FadeIn delay={0.1}>
            <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${REPORT_STATUS_COLORS[report.status] || REPORT_STATUS_COLORS.pending}`}>
              <Flag className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold">Avaliacao Denunciada</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${REPORT_STATUS_COLORS[report.status]}`}>
                    {REPORT_STATUS_LABELS[report.status] || report.status}
                  </span>
                </div>
                <p className="text-xs opacity-80 mb-2">{report.reason}</p>
                {report.admin_response && (
                  <div className="mt-2 p-2 rounded-lg bg-white/5">
                    <p className="text-[10px] text-text-muted mb-1">Resposta da administracao:</p>
                    <p className="text-xs">{report.admin_response}</p>
                  </div>
                )}
                <p className="text-[10px] opacity-60 mt-2">
                  Denunciado em {new Date(report.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </FadeIn>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column */}
          <SlideInLeft delay={0.15}>
            <div className="flex flex-col items-center gap-6 lg:w-80 shrink-0">
              {/* Photos */}
              <StaggerContainer className="grid grid-cols-3 gap-2 w-full">
                {[
                  { key: 'front', label: 'Frontal' },
                  { key: 'left', label: 'Esq' },
                  { key: 'right', label: 'Dir' },
                ].map(({ key, label }) => (
                  <StaggerItem key={key}>
                    <div className="rounded-xl overflow-hidden border border-border bg-card-bg">
                      {entry.photos?.[key] ? (
                        <img src={entry.photos[key]} alt={label} className="w-full aspect-[3/4] object-cover" />
                      ) : (
                        <div className="w-full aspect-[3/4] flex items-center justify-center bg-white/[0.02]">
                          <p className="text-[10px] text-text-muted">{label}</p>
                        </div>
                      )}
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              {/* Body photo */}
              {entry.photos?.body && (
                <FadeIn delay={0.25}>
                  <div className="w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-3.5 h-3.5 text-text-muted" />
                      <p className="text-[11px] text-text-muted">Foto do Fisico</p>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-border bg-card-bg">
                      <img src={entry.photos.body} alt="Fisico" className="w-full aspect-[4/3] object-cover" />
                    </div>
                  </div>
                </FadeIn>
              )}

              <ScaleIn delay={0.3}>
                <ChartRadialText
                  score={ev.overall_score ?? 0}
                  label="Overall Final"
                />
              </ScaleIn>

              <FadeIn delay={0.4}>
                <HighlightBadges highlights={ev.highlights} />
              </FadeIn>
            </div>
          </SlideInLeft>

          {/* Right column */}
          <SlideInRight delay={0.2}>
            <div className="flex-1 flex flex-col gap-6">
              {/* Top row: Facial Symmetry + Overall Final + Terços */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Facial Symmetry Card */}
                <FadeIn delay={0.25}>
                  <Card className="bg-card-bg border border-border rounded-2xl backdrop-blur-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-text-primary flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-green-400/10 flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                        </div>
                        Simetria Facial
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-0">
                      <div className="text-center py-4">
                        <p className="text-4xl font-bold text-green-400 font-playfair">
                          {ev.symmetry_score ? (ev.symmetry_score * 10).toFixed(1) : '—'}
                        </p>
                        <p className="text-xs text-text-muted mt-1">/ 100</p>
                        <p className="text-sm text-text-secondary mt-2">
                          Média dos 13 atributos
                        </p>
                        <div className="mt-3">
                          <Progress value={ev.symmetry_score ? ev.symmetry_score * 10 : 0} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </FadeIn>

                {/* Overall Final Card - Main Highlight */}
                <FadeIn delay={0.3}>
                  <Card className="bg-card-bg border border-brand-accent/30 rounded-2xl backdrop-blur-md relative overflow-hidden lg:col-span-1">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand-accent/20 to-transparent rounded-full blur-2xl" />
                    <CardHeader className="pb-3 relative z-10">
                      <CardTitle className="text-sm text-text-primary flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-brand-accent/10 flex items-center justify-center">
                          <Dumbbell className="w-3 h-3 text-brand-accent" />
                        </div>
                        Overall Final <span className="text-xs text-text-muted font-normal">(Destaque Principal)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-0 relative z-10">
                      <div className="text-center py-6">
                        <p className="text-5xl font-bold text-brand-accent font-playfair">
                          {ev.overall_score ?? '—'}
                        </p>
                        <p className="text-xs text-text-muted mt-1">/ 100</p>
                        <p className="text-sm text-text-secondary mt-2">
                          {(ev.symmetry_score && ev.attributes?.harmonia !== undefined)
                            ? `Média: (Simetria ${(ev.symmetry_score * 10).toFixed(1)} + Atratividade ${ev.attributes?.harmonia}/10) / 2 × 10`
                            : 'Média entre Simetria Facial e Atratividade × 10'}
                        </p>
                        <div className="mt-4">
                          <Progress value={ev.overall_score ?? 0} className="h-3 bg-brand-accent/10" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </FadeIn>

                {/* Facial Thirds */}
                <FadeIn delay={0.35}>
                  <FacialThirds thirds={thirdsData} />
                </FadeIn>
              </div>

              {/* 13 Facial Attributes Table */}
              <FadeIn delay={0.4}>
                <Card className="bg-card-bg border border-border rounded-2xl backdrop-blur-md overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-text-primary flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-blue-400/10 flex items-center justify-center">
                        <span className="text-xs">13</span>
                      </div>
                      13 Atributos Faciais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-white/5 border-b border-border">
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Atributo</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">Classificação</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider pr-4">Nota</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {FACIAL_ATTRIBUTES.map((attr, index) => {
                            const score = ev.attributes?.[attr.key];
                            const label = score != null ? scoreToLabel(score) : '—';
                            const hasScore = score != null;
                            return (
                              <tr key={attr.key} className={`hover:bg-white/2 transition-colors ${index % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">{attr.icon}</span>
                                    <span className="text-text-primary font-medium">{attr.label}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {hasScore && (
                                    <Badge
                                      variant="secondary"
                                      className={`text-xs font-medium px-2.5 py-1 ${labelToColor(label)}`}
                                    >
                                      {label}
                                    </Badge>
                                  )}
                                  {!hasScore && (
                                    <span className="text-text-muted text-xs">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right pr-4 font-mono text-brand-accent font-medium">
                                  {hasScore ? `${score}/10` : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>

{attrEntries && (
                <FadeIn delay={0.32}>
                  <AttributeTable attributes={attrEntries} overall={ev.overall_score} />
                </FadeIn>
              )}

              {ev.categories && !attrEntries && (
                <FadeIn delay={0.35}>
                  <div className="rounded-2xl border border-border bg-card-bg p-6">
                    <h3 className="text-sm font-semibold text-text-secondary mb-4">Categorias</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: 'Terço Superior', value: ev.categories.terco_superior },
                          { label: 'Terço Médio', value: ev.categories.terco_medio },
                          { label: 'Terço Inferior', value: ev.categories.terco_inferior },
                          { label: 'Contorno Mandibular', value: ev.categories.contorno_mandibular },
                        ].map((cat) => (
                          <div key={cat.label} className="flex flex-col gap-1">
                            <p className="text-xs text-text-muted">{cat.label}</p>
                            <p className="text-sm font-medium text-brand-accent">{cat.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </FadeIn>
              )}

              {/* Radar Attributes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FadeIn delay={0.5}>
                  <RadarAttributes data={radarData} />
                </FadeIn>
                <FadeIn delay={0.55}>
                  <Card className="bg-card-bg border border-border rounded-2xl backdrop-blur-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-text-primary">Atratividade</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-4">
                        <p className="text-4xl font-bold text-brand-accent font-playfair">
                          {ev.attributes?.harmonia ?? ev.attractiveness ?? '—'}/10
                        </p>
                        <p className="text-xs text-text-muted mt-1">Nota de Atratividade / Harmonia</p>
                        <div className="mt-3">
                          <Progress value={(ev.attributes?.harmonia ?? ev.attractiveness ?? 0) * 10} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </FadeIn>
              </div>

              {/* Visagismo */}
              {ev.visagismo_tips && Object.values(ev.visagismo_tips).some(Boolean) && (
                <FadeIn delay={0.6}>
                  <Card className="bg-card-bg border border-border rounded-2xl backdrop-blur-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-text-primary">Recomendacoes de Visagismo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {ev.visagismo_tips.cabelo && (
                          <div className="flex flex-col gap-1">
                            <p className="text-xs text-text-muted">Cabelo</p>
                            <p className="text-sm text-text-primary">{ev.visagismo_tips.cabelo}</p>
                          </div>
                        )}
                        {ev.visagismo_tips.barba && (
                          <div className="flex flex-col gap-1">
                            <p className="text-xs text-text-muted">Barba</p>
                            <p className="text-sm text-text-primary">{ev.visagismo_tips.barba}</p>
                          </div>
                        )}
                        {ev.visagismo_tips.oculos && (
                          <div className="flex flex-col gap-1">
                            <p className="text-xs text-text-muted">Oculos</p>
                            <p className="text-sm text-text-primary">{ev.visagismo_tips.oculos}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </FadeIn>
              )}

              {/* Weekly Exercise Routine */}
              {exRecs && (
                <FadeIn delay={0.65}>
                  <Card className="bg-card-bg border border-border rounded-2xl backdrop-blur-md overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-text-primary flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-brand-accent" />
                        Rotina Semanal de Exercicios
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-white/5 border-b border-border">
                              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-32">Dia</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Exercícios Gerais</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Exercícios Faciais</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {WEEK_DAYS.map((day) => {
                              const generalExercises = parseExercises(exRecs.general?.[day.key]);
                              const facialExercises = parseExercises(exRecs.facial?.[day.key]);
                              const maxRows = Math.max(generalExercises.length, facialExercises.length, 1);
                              
                              return (
                                <tbody key={day.key}>
                                  {Array.from({ length: maxRows }).map((_, rowIndex) => (
                                    <tr key={rowIndex} className={`hover:bg-white/2 transition-colors ${rowIndex % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                                      <td className="px-4 py-2 text-text-secondary font-medium whitespace-nowrap">
                                        {rowIndex === 0 ? day.label : ''}
                                      </td>
                                      <td className="px-4 py-2">
                                        {generalExercises[rowIndex] ? (
                                          <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={completedExercises[`${day.key}-general-${rowIndex}`] || false}
                                              onChange={() => handleExerciseToggle(day.key, 'general', rowIndex)}
                                              className="w-4 h-4 text-brand-accent border-border rounded focus:ring-brand-accent focus:ring-2"
                                            />
                                            <span className="text-text-primary text-sm">{generalExercises[rowIndex]}</span>
                                          </label>
                                        ) : (
                                          <span className="text-text-muted text-xs">—</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2">
                                        {facialExercises[rowIndex] ? (
                                          <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={completedExercises[`${day.key}-facial-${rowIndex}`] || false}
                                              onChange={() => handleExerciseToggle(day.key, 'facial', rowIndex)}
                                              className="w-4 h-4 text-brand-accent border-border rounded focus:ring-brand-accent focus:ring-2"
                                            />
                                            <span className="text-text-primary text-sm">{facialExercises[rowIndex]}</span>
                                          </label>
                                        ) : (
                                          <span className="text-text-muted text-xs">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-4 border-t border-border bg-white/5">
                        <p className="text-xs text-text-muted flex items-center gap-1">
                          <Check className="w-3 h-3" /> Marque os exercicios concluidos. O progresso e salvo localmente no navegador.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </FadeIn>
              )}

              {/* Body Evaluation */}
              {entry.body_evaluation && (
                <FadeIn delay={0.7}>
                  <BodyRadarChart bodyEvaluation={entry.body_evaluation} />
                  {entry.body_evaluation.notes && (
                    <div className="mt-4 rounded-2xl border border-border bg-card-bg p-6">
                      <p className="text-xs text-text-muted mb-1">Observações sobre o Físico</p>
                      <p className="text-sm text-text-primary">{entry.body_evaluation.notes}</p>
                    </div>
                  )}
                </FadeIn>
              )}

              {/* Verdict */}
              {entry.verdict_text && (
                <FadeIn delay={0.75}>
                  <Card className="bg-card-bg border border-border rounded-2xl backdrop-blur-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-text-primary">Veredito Profissional</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-text-primary whitespace-pre-wrap">{entry.verdict_text}</p>
                    </CardContent>
                  </Card>
                </FadeIn>
              )}

              <FadeIn delay={0.8}>
                <div className="text-center text-xs text-text-muted">
                  Avaliada em {new Date(ev.evaluatedAt || entry.reviewed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </FadeIn>
            </div>
          </SlideInRight>
        </div>
      </div>
    </div>
  );
}