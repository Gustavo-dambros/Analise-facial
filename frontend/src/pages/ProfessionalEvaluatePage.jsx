import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Send, Loader2, AlertTriangle, ScanFace, ImageOff, Save, Flag, X, User, Dumbbell, Calendar, Minus, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import WeeklyRoutineEditor from '@/components/evaluation/WeeklyRoutineEditor';
import FaceShapeSelector from '@/components/evaluation/FaceShapeSelector';
import { FACE_SHAPE_OPTIONS } from '@/components/evaluation/FaceShapeSelector';
import { FadeIn, ScaleIn, StaggerContainer, StaggerItem } from '@/components/ui/page-transition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BUCKET = 'analysis-photos';
const CATEGORY_OPTIONS = ['Excelente', 'Bom', 'Regular', 'Ajustável'];
const ATTRIBUTE_DEFS = [
  'Terco Superior',
  'Terco Medio',
  'Terco Inferior',
  'Olhos',
  'Sobrancelhas',
  'Nariz',
  'Labios',
  'Mandibula',
  'Queixo',
  'Macas do Rosto',
  'Testa',
  'Formato do Rosto',
];
const REPORT_CATEGORIES = [
  { value: 'avaliacao_incorreta', label: 'Avaliacao Incorreta' },
  { value: 'resultado_inadequado', label: 'Resultado Inadequado' },
  { value: 'informacoes_erradas', label: 'Informacoes Erradas' },
  { value: 'comportamento_inapropriado', label: 'Comportamento Inapropriado' },
  { value: 'outro', label: 'Outro' },
];

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
  { key: 'testa', label: 'Testa', icon: '📐' },
  { key: 'formatoRosto', label: 'Formato do Rosto', icon: '🔷' },
];

// Mapa canônico key (camelCase) <-> nome persistido (backend ATTRIBUTE_NAMES)
const ATTR_KEY_TO_NAME = {
  tercoSuperior: 'Terco Superior',
  tercoMedio: 'Terco Medio',
  tercoInferior: 'Terco Inferior',
  olhos: 'Olhos',
  sobrancelhas: 'Sobrancelhas',
  nariz: 'Nariz',
  'lábios': 'Labios',
  mandibula: 'Mandibula',
  queixo: 'Queixo',
  macasRosto: 'Macas do Rosto',
  testa: 'Testa',
  formatoRosto: 'Formato do Rosto',
};
const ATTR_NAME_TO_KEY = Object.fromEntries(
  Object.entries(ATTR_KEY_TO_NAME).map(([k, v]) => [v, k])
);

const WEEK_DAYS = [
  { key: 'monday', label: 'Segunda', short: 'Seg' },
  { key: 'tuesday', label: 'Terça', short: 'Ter' },
  { key: 'wednesday', label: 'Quarta', short: 'Qua' },
  { key: 'thursday', label: 'Quinta', short: 'Qui' },
  { key: 'friday', label: 'Sexta', short: 'Sex' },
  { key: 'saturday', label: 'Sábado', short: 'Sáb' },
  { key: 'sunday', label: 'Domingo', short: 'Dom' },
];

function getPhotoUrl(urlOrPath) {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith('http')) return urlOrPath;
  const supabase = createClient();
  const cleanPath = urlOrPath.replace(/^\/+/, '');
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(cleanPath);
  return data?.publicUrl || null;
}

function PhotoImage({ src, alt }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div className="w-full aspect-[3/4] flex flex-col items-center justify-center gap-2 bg-white/[0.02]">
        <ImageOff className="w-8 h-8 text-text-muted" />
        <p className="text-[10px] text-text-muted">Imagem indisponivel</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full aspect-[3/4] object-cover"
      onError={() => setImgError(true)}
    />
  );
}

function scoreToLabel(score) {
  const num = Number(score);
  if (num >= 7 && num <= 10) return 'Ótimo';
  if (num >= 4 && num <= 6) return 'Bom';
  if (num >= 1 && num <= 3) return 'Ok';
  return '';
}

function labelToColor(label) {
  switch (label) {
    case 'Ótimo': return 'text-green-400 bg-green-400/10 border-green-400/20';
    case 'Bom': return 'text-brand-accent bg-yellow-400/10 border-yellow-400/20';
    case 'Ok': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    default: return 'text-text-muted bg-white/5 border-border';
  }
}

function calculateSymmetry(attributes) {
  const values = Object.values(attributes).map(Number).filter(v => !isNaN(v));
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateOverall(symmetry, attractiveness) {
  return ((symmetry + attractiveness) / 2) * 10;
}

function parseExercises(str) {
  if (!str) return [];
  return str.split(';').map(s => s.trim()).filter(Boolean);
}

function formatExercises(arr) {
  return arr.join('; ');
}

export default function ProfessionalEvaluatePage() {
  const { id } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const safeUserId = user?.id;
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('outro');
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

// Form state - 13 facial attributes (1-10), computed scores
  const [attributes, setAttributes] = useState({});
  const [attractiveness, setAttractiveness] = useState(5);
  const [faceShape, setFaceShape] = useState('');
  const [highlightsInput, setHighlightsInput] = useState('');
  const [cabelo, setCabelo] = useState('');
  const [barba, setBarba] = useState('');
  const [oculos, setOculos] = useState('');
  const [verdict, setVerdict] = useState('');

  // Terços faciais (%) — separados da nota 1-10, soma inteira deve ser 100
  const [tercoSuperior, setTercoSuperior] = useState(33);
  const [tercoMedio, setTercoMedio] = useState(34);
  const [tercoInferior, setTercoInferior] = useState(33);
  const [tercoError, setTercoError] = useState(false);

  // Body evaluation state
  const [bodyScore, setBodyScore] = useState(50);
  const [bodyPostura, setBodyPostura] = useState('Bom');
  const [bodyProporcao, setBodyProporcao] = useState('Bom');
  const [bodySimetria, setBodySimetria] = useState('Bom');
  const [bodyDefinicao, setBodyDefinicao] = useState('Bom');
  const [bodyNotes, setBodyNotes] = useState('');

  // Weekly Exercise Recommendations
  const [exerciseRecs, setExerciseRecs] = useState({
    general: {},
    facial: {},
  });

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/professional/login', { replace: true });
      return;
    }
    if (profile && profile.role !== 'professional' && profile.role !== 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && user && profile) {
      fetchAnalysis();
    }
  }, [id, authLoading, user, profile]);

  // Validate terços soma inteira exata 100
  useEffect(() => {
    const a = Number(tercoSuperior);
    const b = Number(tercoMedio);
    const c = Number(tercoInferior);
    const allIntegers = Number.isInteger(a) && Number.isInteger(b) && Number.isInteger(c);
    const inRange = [a, b, c].every(v => v >= 0 && v <= 100);
    const sum = a + b + c;
    setTercoError(!(allIntegers && inRange && sum === 100));
  }, [tercoSuperior, tercoMedio, tercoInferior]);

  // Computed values — simetria = média dos 12 atributos 1-10 (inclui terços nota)
  const symmetryScore = useMemo(
    () => (attributes && Object.keys(attributes).length > 0 ? calculateSymmetry(attributes) : 0),
    [attributes]
  );
  const overallScore = useMemo(
    () => calculateOverall(symmetryScore, attractiveness),
    [symmetryScore, attractiveness]
  );

  const highlights = (highlightsInput || '').split(',')
    .map((h) => h.trim())
    .filter(Boolean);

  const hasAllPhotos = Boolean(
    analysis?.photo_front_url && analysis?.photo_left_url && analysis?.photo_right_url
  );

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('analyses')
        .select('*, profiles:user_id(full_name)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setAnalysis(data);

      if (data?.result && typeof data.result === 'object' && Object.keys(data.result).length > 0) {
        const r = data.result;
        
        // Load 12 attributes (nota 1-10) — r.attributes é { "Terco Superior": 7, ... }
        if (r.attributes) {
          const loadedAttrs = {};
          FACIAL_ATTRIBUTES.forEach(attr => {
            const name = ATTR_KEY_TO_NAME[attr.key];
            const v = r.attributes[name] ?? r.attributes[attr.key];
            if (v != null) loadedAttrs[attr.key] = Number(v);
          });
          setAttributes(loadedAttrs);
        }

        // Load terços % separados (inteiros 0-100, soma 100)
        if (r.thirds) {
          if (r.thirds.superior != null) setTercoSuperior(Number(r.thirds.superior));
          if (r.thirds.medio != null) setTercoMedio(Number(r.thirds.medio));
          if (r.thirds.inferior != null) setTercoInferior(Number(r.thirds.inferior));
          // retrocompat: thirds como { superior:{percentage}, ... } ou array thirds_data
          if (r.thirds.superior?.percentage != null) setTercoSuperior(Number(r.thirds.superior.percentage));
          if (r.thirds.medio?.percentage != null) setTercoMedio(Number(r.thirds.medio.percentage));
          if (r.thirds.inferior?.percentage != null) setTercoInferior(Number(r.thirds.inferior.percentage));
        }
        if (r.thirds_data && Array.isArray(r.thirds_data)) {
          // IA legado: [{label,value}]
          const findVal = (needle) => r.thirds_data.find(t => t.label?.toLowerCase().includes(needle))?.value;
          const s = findVal('superior'); if (s != null) setTercoSuperior(Math.round(Number(s)));
          const m = findVal('médio') ?? findVal('medio'); if (m != null) setTercoMedio(Math.round(Number(m)));
          const i = findVal('inferior'); if (i != null) setTercoInferior(Math.round(Number(i)));
        }

        // Load attractiveness
        if (r.attractiveness != null) setAttractiveness(Number(r.attractiveness));
        if (r.face_shape) setFaceShape(r.face_shape);

        // Load highlights
        if (r.highlights && Array.isArray(r.highlights)) {
          setHighlightsInput(r.highlights.join(', '));
        }

        // Load visagismo
        if (r.visagismo_tips) {
          if (r.visagismo_tips.cabelo) setCabelo(r.visagismo_tips.cabelo);
          if (r.visagismo_tips.barba) setBarba(r.visagismo_tips.barba);
          if (r.visagismo_tips.oculos) setOculos(r.visagismo_tips.oculos);
        }

        // Load verdict
        if (r.verdict_text) setVerdict(r.verdict_text);
      }

      // Load body evaluation
      if (data?.body_result && typeof data.body_result === 'object' && Object.keys(data.body_result).length > 0) {
        const b = data.body_result;
        if (b.score != null) setBodyScore(b.score);
        if (b.postura) setBodyPostura(b.postura);
        if (b.proporcao) setBodyProporcao(b.proporcao);
        if (b.simetria) setBodySimetria(b.simetria);
        if (b.definicao) setBodyDefinicao(b.definicao);
        if (b.notes) setBodyNotes(b.notes);
      }

      // Load exercise recommendations
      if (data?.exercise_recommendations && typeof data.exercise_recommendations === 'object') {
        const ex = data.exercise_recommendations;
        setExerciseRecs({
          general: ex.general || {},
          facial: ex.facial || {},
        });
      }
    } catch (err) {
      setError('Erro ao carregar analise.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAttributeChange = (key, value) => {
    const num = Number(value);
    if (num >= 1 && num <= 10) {
      setAttributes(prev => ({ ...prev, [key]: num }));
    } else if (value === '') {
      setAttributes(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleExerciseChange = (type, dayKey, value) => {
    setExerciseRecs(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [dayKey]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    if (tercoError || submitting || !hasAllPhotos) return;
    setSubmitting(true);
    setError('');

    try {
      const supabase = createClient();

      // Validação forte: terços inteiros 0-100 soma 100
      const tS = Number(tercoSuperior), tM = Number(tercoMedio), tI = Number(tercoInferior);
      if (!Number.isInteger(tS) || !Number.isInteger(tM) || !Number.isInteger(tI) || tS + tM + tI !== 100) {
        setTercoError(true);
        throw new Error('Terços devem ser inteiros 0-100 somando exatamente 100%.');
      }

      // Mapeia attributes por key -> nome persistido, usando fallback 5 se vazio
      const evalAttrs = {};
      FACIAL_ATTRIBUTES.forEach(({ key }) => {
        const name = ATTR_KEY_TO_NAME[key];
        const v = attributes[key];
        evalAttrs[name] = v != null && v !== '' ? Number(v) : 5;
      });

      const evaluationData = {
        face_shape: faceShape,
        attractiveness: Number(attractiveness),
        symmetry_score: Number(symmetryScore.toFixed(2)),
        overall_score: Number(overallScore.toFixed(1)),
        thirds: {
          superior: tS,
          medio: tM,
          inferior: tI,
        },
        attributes: evalAttrs,
        highlights,
        visagismo_tips: { cabelo, barba, oculos },
        verdict_text: verdict.trim(),
        evaluatedAt: new Date().toISOString(),
      };

      const bodyEvaluationData = analysis?.photo_body_url ? {
        score: Number(bodyScore),
        postura: bodyPostura,
        proporcao: bodyProporcao,
        simetria: bodySimetria,
        definicao: bodyDefinicao,
        notes: bodyNotes,
      } : null;

      const exerciseRecommendationsData = {
        general: exerciseRecs.general,
        facial: exerciseRecs.facial,
      };

      const { error: updateError } = await supabase
        .from('analyses')
        .update({
          status: 'completed',
          result: evaluationData,
          body_result: bodyEvaluationData,
          exercise_recommendations: exerciseRecommendationsData,
          verdict_text: verdict.trim(),
          reviewed_by: safeUserId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Avaliacao salva com sucesso!', {
        description: 'O resultado foi enviado para o cliente.',
      });

      setTimeout(() => navigate('/professional/dashboard'), 1200);
    } catch (err) {
      setError('Erro ao salvar avaliacao. Tente novamente.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim() || reporting) return;
    setReporting(true);

    try {
      const supabase = createClient();
      const { error: reportError } = await supabase
        .from('evaluation_reports')
        .insert({
          analysis_id: id,
          reporter_id: safeUserId,
          reported_user_id: analysis.user_id,
          category: reportCategory,
          reason: reportReason.trim(),
        });

      if (reportError) throw reportError;

      toast.success('Avaliacao denunciada com sucesso!', {
        description: 'O cliente sera informado sobre a denuncia. A equipe administrativa ira analisar.',
      });

      setShowReportModal(false);
      setReportReason('');
      setReportCategory('avaliacao_incorreta');
    } catch (err) {
      toast.error('Erro ao enviar denuncia. Tente novamente.');
      console.error(err);
    } finally {
      setReporting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
      </div>
    );
  }

  if (!user || !profile) return null;

  if (error && !analysis) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => navigate('/professional/dashboard')}
            className="mt-4 text-sm text-brand-accent underline"
          >
            Voltar ao painel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-border bg-card-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/professional/dashboard')}
            className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white font-alpino">Avaliar Analise</h1>
            <p className="text-[11px] text-text-muted">{analysis?.profiles?.full_name || 'Cliente'}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-8">
        <div className="space-y-6">
          {/* Photos + Client Info */}
          <FadeIn>
            <section className="rounded-2xl border border-border bg-card-bg p-6">
              <h2 className="text-sm font-semibold text-text-secondary mb-4">Fotos Enviadas</h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { key: 'photo_front_url', label: 'Frontal' },
                  { key: 'photo_left_url', label: 'Perfil Esquerdo' },
                  { key: 'photo_right_url', label: 'Perfil Direito' },
                ].map(({ key, label }) => {
                  const photoUrl = getPhotoUrl(analysis?.[key]);
                  return (
                    <div key={key} className="bg-card-bg border border-border rounded-xl overflow-hidden">
                      {photoUrl ? (
                        <PhotoImage src={photoUrl} alt={label} />
                      ) : (
                        <div className="w-full aspect-[3/4] flex flex-col items-center justify-center gap-2 bg-white/[0.02]">
                          <ScanFace className="w-8 h-8 text-text-muted" />
                          <p className="text-[10px] text-text-muted">{label}</p>
                        </div>
                      )}
                      <div className="px-2 py-1.5 border-t border-border">
                        <p className="text-[10px] font-medium text-text-secondary text-center">{label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Body photo */}
              {analysis?.photo_body_url && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-3.5 h-3.5 text-text-muted" />
                    <p className="text-[11px] text-text-muted">Foto do Fisico</p>
                  </div>
                  <div className="bg-card-bg border border-border rounded-xl overflow-hidden max-w-xs">
                    {getPhotoUrl(analysis.photo_body_url) ? (
                      <img
                        src={getPhotoUrl(analysis.photo_body_url)}
                        alt="Fisico"
                        className="w-full aspect-[4/3] object-cover"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <div className="w-full aspect-[4/3] flex-col items-center justify-center gap-2 bg-white/[0.02] hidden">
                      <ImageOff className="w-8 h-8 text-text-muted" />
                      <p className="text-[10px] text-text-muted">Imagem indisponivel</p>
                    </div>
                    <div className="px-2 py-1.5 border-t border-border">
                      <p className="text-[10px] font-medium text-text-secondary text-center">Fisico</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-text-muted">
                <div className="flex items-center gap-4">
                  <span>{analysis?.profiles?.full_name || 'N/A'}</span>
                  <span>Enviado em: {formatDate(analysis?.created_at)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Denunciar
                </button>
              </div>
            </section>
          </FadeIn>

{/* Scores Calculados (Display Only) */}
          <FadeIn delay={0.05}>
            <section className="rounded-2xl border border-border bg-card-bg p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Dumbbell className="w-4 h-4 text-brand-accent" />
                <h2 className="text-sm font-semibold text-text-secondary">Scores Calculados</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-card-bg border border-border">
                  <CardContent className="p-4 flex flex-col items-center">
                    <p className="text-xs text-text-muted uppercase tracking-wide">Simetria Facial</p>
                    <p className="text-3xl font-bold text-brand-accent font-playfair">{symmetryScore.toFixed(1)}</p>
                    <p className="text-[10px] text-text-muted">Média dos 13 atributos (1-10)</p>
                  </CardContent>
                </Card>
                <Card className="bg-card-bg border border-border">
                  <CardContent className="p-4 flex flex-col items-center">
                    <p className="text-xs text-text-muted uppercase tracking-wide">Atratividade</p>
                    <div className="w-full">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={attractiveness}
                        onChange={(e) => setAttractiveness(Number(e.target.value))}
                        className="w-full accent-brand-accent"
                      />
                      <p className="text-center text-sm font-medium mt-1">{attractiveness}/10</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-brand-accent/10 border-brand-accent/30">
                  <CardContent className="p-4 flex flex-col items-center">
                    <p className="text-xs text-brand-accent uppercase tracking-wide">Overall Final</p>
                    <p className="text-3xl font-bold text-brand-accent font-playfair">{overallScore.toFixed(0)}</p>
                    <p className="text-[10px] text-text-muted">Escala 0-100 | ((Simetria + Atratividade) / 2) × 10</p>
                  </CardContent>
                </Card>
              </div>
            </section>
          </FadeIn>

          {/* 13 Atributos Faciais */}
          <FadeIn delay={0.1}>
            <section className="rounded-2xl border border-border bg-card-bg p-6 space-y-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-brand-accent" />
                  <h2 className="text-sm font-semibold text-text-secondary">13 Atributos Faciais (1 a 10)</h2>
                </div>
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <span className="px-2 py-0.5 rounded bg-green-400/10 text-green-400 border border-green-400/20">7-10: Ótimo</span>
                  <span className="px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">4-6: Bom</span>
                  <span className="px-2 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20">1-3: Ok</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FACIAL_ATTRIBUTES.map((attr, index) => {
                  const value = attributes[attr.key] || '';
                  const label = value ? scoreToLabel(value) : '';
                  if (attr.key === 'formatoRosto') {
                    return (
                      <div key={attr.key} className="col-span-full space-y-3">
                        <Label className="text-base">Formato do Rosto (selecione uma imagem)</Label>
                        <FaceShapeSelector value={faceShape} onChange={(v) => { setFaceShape(v); handleAttributeChange(attr.key, 7); }} />
                        {faceShape && <p className="text-xs text-text-secondary text-center">Selecionado: {faceShape}</p>}
                      </div>
                    );
                  }
                  return (
                    <div key={attr.key} className="space-y-2 bg-white/[0.02] p-4 rounded-xl border border-border/50">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm font-medium text-text-primary">
                          <span className="text-base">{attr.icon}</span>
                          {attr.label}
                        </Label>
                        {label && (
                          <Badge variant="secondary" className={`${labelToColor(label)} text-[10px] font-medium`}>
                            {label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            const current = attributes[attr.key] || 1;
                            handleAttributeChange(attr.key, Math.max(1, current - 1));
                          }}
                          className="w-8 h-8 rounded-lg border border-border bg-white/5 text-text-secondary hover:text-white hover:border-brand-accent/30 transition-colors flex items-center justify-center"
                          disabled={!attributes[attr.key] || attributes[attr.key] <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={value}
                          onChange={(e) => handleAttributeChange(attr.key, e.target.value)}
                          className="flex-1 text-center text-lg font-mono"
                          placeholder="Ó"
                        />
                        <button
                          onClick={() => {
                            const current = attributes[attr.key] || 1;
                            handleAttributeChange(attr.key, Math.min(10, current + 1));
                          }}
                          className="w-8 h-8 rounded-lg border border-border bg-white/5 text-text-secondary hover:text-white hover:border-brand-accent/30 transition-colors flex items-center justify-center"
                          disabled={attributes[attr.key] >= 10}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </FadeIn>

{/* Terços Faciais — seção separada: mede como o rosto é dividido, soma exata 100% inteiros */}
          <FadeIn delay={0.15}>
            <section className="rounded-2xl border border-border bg-card-bg p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-secondary">Divisão dos Terços Faciais (%)</h2>
                <span className={`text-xs font-medium ${tercoError ? 'text-red-400' : 'text-green-400'}`}>
                  Soma: {Number(tercoSuperior) + Number(tercoMedio) + Number(tercoInferior)}%
                  {tercoError ? ' (deve ser 100% — inteiros 0-100)' : ' ✓'}
                </span>
              </div>
              <p className="text-[11px] text-text-muted -mt-3">Seção separada da nota 1-10. Mede a proporção vertical do rosto; a soma dos 3 deve ser exatamente 100%.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label>Terço Superior (%) — inteiro 0-100</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={tercoSuperior}
                    onChange={(e) => setTercoSuperior(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Terço Médio (%) — inteiro 0-100</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={tercoMedio}
                    onChange={(e) => setTercoMedio(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Terço Inferior (%) — inteiro 0-100</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={tercoInferior}
                    onChange={(e) => setTercoInferior(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>
            </section>
          </FadeIn>

          {/* Highlights */}
          <FadeIn delay={0.2}>
            <section className="rounded-2xl border border-border bg-card-bg p-6 space-y-5">
              <h2 className="text-sm font-semibold text-text-secondary">Pontos Fortes (Highlights)</h2>
              <div className="space-y-2">
                <Label>Separados por virgula</Label>
                <Input
                  placeholder="Ex: Simetria excelente, Contorno definido, Proporcao harmoniosa"
                  value={highlightsInput}
                  onChange={(e) => setHighlightsInput(e.target.value)}
                />
              </div>
              {highlights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {highlights.map((h, i) => (
                    <Badge key={i}>{h}</Badge>
                  ))}
                </div>
              )}
            </section>
          </FadeIn>

          {/* Visagismo */}
          <FadeIn delay={0.25}>
            <section className="rounded-2xl border border-border bg-card-bg p-6 space-y-5">
              <h2 className="text-sm font-semibold text-text-secondary">Recomendacoes de Visagismo</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label>Corte de Cabelo</Label>
                  <Textarea
                    value={cabelo}
                    onChange={(e) => setCabelo(e.target.value)}
                    placeholder="Ex: Corte curto nas laterais, mais volume no topo..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Barba</Label>
                  <Textarea
                    value={barba}
                    onChange={(e) => setBarba(e.target.value)}
                    placeholder="Ex: Barba curta uniforme, sem bigode..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Oculos</Label>
                  <Textarea
                    value={oculos}
                    onChange={(e) => setOculos(e.target.value)}
                    placeholder="Ex: Arredondados, aro fino, tons neutros..."
                    rows={3}
                  />
                </div>
              </div>
            </section>
          </FadeIn>

          {/* Weekly Exercise Recommendations */}
          <FadeIn delay={0.3}>
            <section className="rounded-2xl border border-border bg-card-bg p-6 space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <Dumbbell className="w-4 h-4 text-brand-accent" />
                <h2 className="text-sm font-semibold text-text-secondary">Recomendacoes de Exercicios Semanais</h2>
              </div>
              <p className="text-xs text-text-muted mb-4">
                Insira exercicios separados por ponto e virgula (;). Ex: "Exercicio 1; Exercicio 2; Exercicio 3"
              </p>

              {/* General Exercises */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide">Exercicios Gerais</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-xs text-text-muted font-medium w-20">Dia</th>
                        {WEEK_DAYS.map(day => (
                          <th key={day.key} className="text-center py-2 px-1 text-xs text-text-muted font-medium">
                            {day.short}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="py-2 px-3 text-text-primary font-medium">Exercicios</td>
                        {WEEK_DAYS.map(day => (
                          <td key={day.key} className="px-1 py-1">
                            <Input
                              type="text"
                              value={exerciseRecs.general[day.key] || ''}
                              onChange={(e) => handleExerciseChange('general', day.key, e.target.value)}
                              placeholder="ex1; ex2"
                              className="text-[11px] h-8"
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Facial Exercises */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide">Exercicios Faciais</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-xs text-text-muted font-medium w-20">Dia</th>
                        {WEEK_DAYS.map(day => (
                          <th key={day.key} className="text-center py-2 px-1 text-xs text-text-muted font-medium">
                            {day.short}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="py-2 px-3 text-text-primary font-medium">Exercicios</td>
                        {WEEK_DAYS.map(day => (
                          <td key={day.key} className="px-1 py-1">
                            <Input
                              type="text"
                              value={exerciseRecs.facial[day.key] || ''}
                              onChange={(e) => handleExerciseChange('facial', day.key, e.target.value)}
                              placeholder="ex1; ex2"
                              className="text-[11px] h-8"
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </FadeIn>

          {/* Avaliacao do Fisico */}
          {analysis?.photo_body_url && (
            <FadeIn delay={0.35}>
              <section className="rounded-2xl border border-border bg-card-bg p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-accent" />
                  <h2 className="text-sm font-semibold text-text-secondary">Avaliacao do Fisico</h2>
                </div>
                <div className="space-y-2">
                  <Label>Pontuacao Geral do Fisico ({bodyScore})</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bodyScore}
                    onChange={(e) => setBodyScore(e.target.value)}
                    className="w-full accent-brand-accent"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[
                    { label: 'Postura', value: bodyPostura, set: setBodyPostura },
                    { label: 'Proporcao Corporal', value: bodyProporcao, set: setBodyProporcao },
                    { label: 'Simetria Corporal', value: bodySimetria, set: setBodySimetria },
                    { label: 'Definicao Muscular', value: bodyDefinicao, set: setBodyDefinicao },
                  ].map(({ label, value, set }) => (
                    <div key={label} className="space-y-2">
                      <Label>{label}</Label>
                      <select
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-border bg-card-bg px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  ))}
</div>
              </section>
            </FadeIn>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Photo validation warning */}
          {!hasAllPhotos && (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
              Nao e possivel enviar a avaliacao. A analise precisa ter as 3 fotos (frontal, perfil esquerdo e perfil direito).
            </div>
          )}

          {/* Submit */}
          <FadeIn delay={0.45}>
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={tercoError || submitting || !hasAllPhotos}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                  !tercoError && !submitting && hasAllPhotos
                    ? 'bg-brand-accent text-background hover:opacity-90'
                    : 'bg-white/5 text-text-muted border border-border cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Enviar Avaliacao
                  </>
                )}
              </button>
            </div>
          </FadeIn>
    </div>
  </main>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-[#141414] border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-yellow-400" />
                <h2 className="text-base font-bold text-white">Denunciar Avaliacao</h2>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Denuncie esta avaliacao por um dos motivos abaixo. O cliente sera informado sobre a denuncia.
            </p>

            {/* Category */}
            <div className="space-y-2">
              <Label>Motivo</Label>
              <div className="flex flex-wrap gap-2">
                {REPORT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setReportCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      reportCategory === cat.value
                        ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                        : 'bg-white/5 text-text-secondary border border-border hover:border-yellow-400/20'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Descreva o motivo da denuncia..."
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                disabled={reporting}
                className="px-4 py-2 rounded-xl text-sm text-text-secondary hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason.trim() || reporting}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  reportReason.trim() && !reporting
                    ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/30'
                    : 'bg-white/5 text-text-muted border border-border cursor-not-allowed'
                }`}
              >
                {reporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4" />
                    Enviar Denuncia
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}