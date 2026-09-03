import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, User, Flag, AlertTriangle, CheckCircle2, Calendar, Check, Minus, Dumbbell, Clock } from 'lucide-react';
import ChartRadialText from '@/components/evaluation/ChartRadialText';
import RadarAttributes from '@/components/evaluation/RadarAttributes';
import FacialThirds from '@/components/evaluation/FacialThirds';
import HighlightBadges from '@/components/evaluation/HighlightBadges';
import AttributeTable from '@/components/evaluation/AttributeTable';
import BodyRadarChart from '@/components/evaluation/BodyRadarChart';
import ScoreCard from '@/components/evaluation/ScoreCard';
import { FadeIn, ScaleIn, SlideInLeft, SlideInRight, StaggerContainer, StaggerItem } from '@/components/ui/page-transition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

const parseExercises = (str) => {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  if (typeof str !== 'string') return [String(str)];
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
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [completedExercises, setCompletedExercises] = useState({});

  useEffect(() => {
    fetchEntry();
    fetchReport();
  }, [id, user]);

  const radarData = useMemo(() => {
    if (!evaluation?.attributes || Object.keys(evaluation.attributes).length === 0) return [];
    // Converter 1-10 -> 0-100 para domínio condizente com Overall (0-100)
    return Object.entries(evaluation.attributes).map(([feature, score]) => ({
      feature,
      score: Math.round(Number(score) * 10),
      raw: Number(score),
    }));
  }, [evaluation]);

  const thirdsData = useMemo(() => {
    if (!evaluation) return [];
    const r = evaluation.result;
    if (r?.thirds && typeof r.thirds === 'object') {
      const t = r.thirds;
      const s = t.superior?.percentage ?? t.superior;
      const m = t.medio?.percentage ?? t.medio ?? t.middle?.percentage ?? t.middle;
      const i = t.inferior?.percentage ?? t.inferior;
      if (s != null || m != null || i != null) {
        return [
          { label: 'Terço Superior (Testa)', value: Number(s ?? 0) },
          { label: 'Terço Médio (Nariz)', value: Number(m ?? 0) },
          { label: 'Terço Inferior (Mandíbula)', value: Number(i ?? 0) },
        ];
      }
    }
    const td = evaluation.thirds_data;
    if (Array.isArray(td)) {
      const findVal = (needle) => td.find(x => x.label?.toLowerCase().includes(needle))?.value ?? 0;
      return [
        { label: 'Terço Superior (Testa)', value: Number(findVal('superior')) },
        { label: 'Terço Médio (Nariz)', value: Number(findVal('médio') ?? findVal('medio')) },
        { label: 'Terço Inferior (Mandíbula)', value: Number(findVal('inferior')) },
      ];
    }
    if (td?.superior || td?.middle || td?.inferior) {
      return [
        { label: 'Terço Superior (Testa)', value: Number(td.superior?.percentage ?? 0) },
        { label: 'Terço Médio (Nariz)', value: Number(td.middle?.percentage ?? 0) },
        { label: 'Terço Inferior (Mandíbula)', value: Number(td.inferior?.percentage ?? 0) },
      ];
    }
    return [];
  }, [evaluation]);

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
        setEvaluation(null);
        setLoading(false);
        return;
      }

      const r = data.result && typeof data.result === 'object' && Object.keys(data.result).length > 0 ? data.result : null;
      const thirdsDataRaw = data.thirds_data ?? r?.thirds ?? null;

      setEvaluation({
        id: data.id,
        status: data.status,
        createdAt: data.created_at,
        photos: {
          front: getPhotoUrl(data.photo_front_url),
          left: getPhotoUrl(data.photo_left_url),
          right: getPhotoUrl(data.photo_right_url),
          body: getPhotoUrl(data.photo_body_url),
        },
        result: r,
        // Campos normalizados para render
        attributes: r?.attributes || {},
        highlights: r?.highlights || [],
        visagismo_tips: r?.visagismo_tips || {},
        face_shape: r?.face_shape || null,
        symmetry_score: r?.symmetry_score ?? null,
        overall_score: r?.overall_score ?? null,
        attractiveness: r?.attractiveness ?? null,
        thirds: r?.thirds ?? null,
        body_evaluation: data.body_result && typeof data.body_result === 'object' && Object.keys(data.body_result).length > 0 ? data.body_result : null,
        exercise_recommendations: data.exercise_recommendations && typeof data.exercise_recommendations === 'object' && Object.keys(data.exercise_recommendations).length > 0 ? data.exercise_recommendations : null,
        verdict_text: data.verdict_text || r?.verdict_text || '',
        reviewed_at: data.reviewed_at,
        thirds_data: thirdsDataRaw,
      });
    } catch (err) {
      console.error('Failed to fetch evaluation:', err);
      setEvaluation(null);
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

  if (!evaluation) {
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

  const ev = evaluation;
  const isPending = ev.status === 'pending';
  const hasResult = !!ev.result && Object.keys(ev.result).length > 0;

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-8 md:pl-4 pb-24 md:pb-8 overflow-x-hidden">
      <div className="max-w-6xl mx-auto min-w-0">
        <FadeIn>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-8 min-w-0">
            <button
              onClick={() => navigate('/dashboard/progress')}
              className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors text-sm shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden xs:inline">Voltar</span>
            </button>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-text-primary font-alpino truncate">
              Detalhe da Avaliacao
            </h1>
            <Badge variant={isPending ? 'secondary' : 'success'} className="shrink-0 text-xs">
              {isPending ? <><Clock className="w-3 h-3 mr-1" /> Aguardando</> : <><CheckCircle2 className="w-3 h-3 mr-1" /> Avaliada</>}
            </Badge>
          </div>
        </FadeIn>

        {/* Fotos sempre visíveis */}
        <FadeIn>
          <Card className="bg-card-bg border-border mb-6 overflow-hidden">
            <CardHeader className="pb-3 px-4 sm:px-6">
              <CardTitle className="text-sm text-text-primary">Fotos Enviadas</CardTitle>
              <CardDescription className="text-xs text-text-muted break-words">Enviada em {new Date(ev.createdAt).toLocaleString('pt-BR')} {ev.reviewed_at ? `• Avaliada em ${new Date(ev.reviewed_at).toLocaleString('pt-BR')}` : ''}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { label: 'Frontal', src: ev.photos.front },
                  { label: 'Perfil Esquerdo', src: ev.photos.left },
                  { label: 'Perfil Direito', src: ev.photos.right },
                  { label: 'Físico', src: ev.photos.body },
                ].filter(p => p.src).map(p => (
                  <div key={p.label} className="rounded-xl overflow-hidden border border-border bg-black min-w-0">
                    <img src={p.src} alt={p.label} className="w-full aspect-[3/4] object-cover" />
                    <div className="px-1 sm:px-2 py-1.5 border-t border-border text-center text-[10px] sm:text-[11px] text-text-secondary truncate">{p.label}</div>
                  </div>
                ))}
                {!ev.photos.front && !ev.photos.left && !ev.photos.right && (
                  <p className="text-xs text-text-muted col-span-full">Nenhuma foto encontrada.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {isPending && !hasResult ? (
          <Card className="bg-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-6 flex items-center gap-3">
              <Clock className="w-6 h-6 text-yellow-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-400">Aguardando avaliação do profissional</p>
                <p className="text-xs text-text-secondary mt-1">Sua análise foi enviada e está na fila. Você receberá a avaliação completa aqui assim que um profissional revisar.</p>
              </div>
            </CardContent>
          </Card>
        ) : hasResult ? (
          <div className="space-y-6 sm:space-y-8 min-w-0">
            <Separator />

            {/* Scores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <ScoreCard score={ev.overall_score ?? 0} label="Overall" />
              <ScoreCard score={ev.symmetry_score != null ? Math.round(ev.symmetry_score * 10) : 0} label="Simetria (0-100)" />
              <Card className="bg-card-bg border-border p-4 flex flex-col items-center justify-center text-center min-w-0">
                <p className="text-xs text-text-muted uppercase">Atratividade</p>
                <p className="text-2xl sm:text-3xl font-bold text-brand-accent">{ev.attractiveness ?? '--'}/10</p>
                <p className="text-[11px] text-text-muted mt-1 break-words">{ev.face_shape ? `Formato: ${ev.face_shape}` : ''}</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-w-0">
              <RadarAttributes data={radarData.length ? radarData : undefined} />
              <FacialThirds thirds={thirdsData.length ? thirdsData : undefined} />
            </div>

            <div className="space-y-4">
              <HighlightBadges highlights={ev.highlights} />
              <AttributeTable attributes={ev.attributes} overall={ev.overall_score} />
            </div>

            {ev.body_evaluation ? (
              <BodyRadarChart bodyEvaluation={ev.body_evaluation} />
            ) : (
              <p className="text-sm text-text-secondary">Corpo ainda nao avaliado</p>
            )}

            {/* Visagismo */}
            {(ev.visagismo_tips?.cabelo || ev.visagismo_tips?.barba || ev.visagismo_tips?.oculos) && (
              <Card className="bg-card-bg border-border overflow-hidden">
                <CardHeader className="px-4 sm:px-6"><CardTitle className="text-sm">Recomendações de Visagismo</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm px-4 sm:px-6">
                  <div className="min-w-0"><p className="font-medium text-text-primary">Cabelo</p><p className="text-text-secondary mt-1 break-words whitespace-pre-wrap">{ev.visagismo_tips.cabelo || '—'}</p></div>
                  <div className="min-w-0"><p className="font-medium text-text-primary">Barba</p><p className="text-text-secondary mt-1 break-words whitespace-pre-wrap">{ev.visagismo_tips.barba || '—'}</p></div>
                  <div className="min-w-0"><p className="font-medium text-text-primary">Óculos</p><p className="text-text-secondary mt-1 break-words whitespace-pre-wrap">{ev.visagismo_tips.oculos || '—'}</p></div>
                </CardContent>
              </Card>
            )}

            {/* Exercícios */}
            {ev.exercise_recommendations ? (
              <Card className="bg-card-bg border-border overflow-hidden">
                <CardHeader className="px-4 sm:px-6"><CardTitle className="text-sm">Recomendações de Exercícios</CardTitle>
                  <CardDescription className="text-xs">Semana organizada por dia</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-4 sm:px-6">
                  {(['general','facial']).map(type => {
                    const data = ev.exercise_recommendations[type] || ev.exercise_recommendations;
                    const isLegacy = !ev.exercise_recommendations.general && !ev.exercise_recommendations.facial;
                    if (isLegacy && type==='facial') return null;
                    const map = isLegacy ? ev.exercise_recommendations : data;
                    if (!map || Object.keys(map).length===0) return null;
                    return (
                      <div key={type} className="min-w-0">
                        <p className="text-xs font-medium text-text-secondary uppercase mb-2">{type==='general' ? 'Gerais' : 'Faciais'}</p>
                        <div className="space-y-2">
                          {WEEK_DAYS.map(d => {
                            const val = map[d.key] || map[d.label] || '';
                            if (!val) return null;
                            return <div key={d.key} className="flex flex-col xs:flex-row xs:gap-2 gap-1 text-sm min-w-0"><span className="font-medium shrink-0 xs:min-w-[90px]">{d.label}:</span><span className="text-text-secondary break-words min-w-0">{Array.isArray(val) ? val.join(', ') : val}</span></div>
                          })}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-text-secondary px-1">Nenhuma recomendacao de exercicio registrada</p>
            )}

            {ev.verdict_text ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm font-medium text-emerald-400">Veredito do profissional:</p>
                <p className="mt-1 text-sm text-text-primary whitespace-pre-wrap">{ev.verdict_text}</p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Veredito ainda nao disponivel</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-secondary mt-4">Esta avaliacao ainda nao possui dados de resultado.</p>
        )}

        <Separator className="mt-8" />
      </div>
    </div>
  );
}
