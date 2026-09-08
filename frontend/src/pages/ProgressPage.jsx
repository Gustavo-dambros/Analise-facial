import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Clock, CheckCircle2, AlertCircle, BarChart3, Eye, TrendingUp, Loader2, Crown, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import WeeklyRoutineTable from '@/components/evaluation/WeeklyRoutineTable';
import { StaggerContainer, StaggerItem, FadeIn, ScaleIn } from '@/components/ui/page-transition';
import { PLANS, resolveCurrentPlan } from '@/lib/plans';
import { Button } from '@/components/ui/button';

const BUCKET = 'analysis-photos';

function getPhotoUrl(urlOrPath) {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith('http')) return urlOrPath;
  const supabase = createClient();
  const cleanPath = urlOrPath.replace(/^\/+/, '');
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(cleanPath);
  return data?.publicUrl || null;
}

function normalizeAnalysis(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    photos: {
      front: getPhotoUrl(row.photo_front_url),
      left: getPhotoUrl(row.photo_left_url),
      right: getPhotoUrl(row.photo_right_url),
      body: getPhotoUrl(row.photo_body_url),
    },
    evaluation: row.result && Object.keys(row.result).length > 0 ? row.result : null,
    verdict_text: row.verdict_text,
    reviewed_at: row.reviewed_at,
  };
}

function PhotoThumbs({ a, onOpen }) {
  const photos = [
    { key: 'front', label: 'Frontal', src: a.photos?.front },
    { key: 'left', label: 'Perfil Esquerdo', src: a.photos?.left },
    { key: 'right', label: 'Perfil Direito', src: a.photos?.right },
    { key: 'body', label: 'Físico', src: a.photos?.body },
  ].filter((p) => p.src);

  if (photos.length === 0) return null;

  return (
    <div className="flex gap-1.5 shrink-0">
      {photos.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(p);
          }}
          className="block overflow-hidden rounded-lg border border-border hover:border-brand-accent/50 transition-colors"
        >
          <img src={p.src} alt={p.label} className="w-12 h-16 object-cover" />
        </button>
      ))}
    </div>
  );
}

export default function ProgressPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [evaluated, setEvaluated] = useState([]);
  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
    fetchRoutine();

    // Revalida ao voltar para a aba ou ao receber evento de nova analise
    const onSubmitted = () => fetchData();
    const onFocus = () => fetchData();
    window.addEventListener('analysis:submitted', onSubmitted);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('analysis:submitted', onSubmitted);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [user]);

  const fetchRoutine = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('weekly_routines')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data) {
        setRoutine(data.exercises || {});
      }
    } catch (err) {
      console.error('Failed to fetch weekly routine:', err);
    }
  };

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: pendingData, error: pendingError } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) {
        console.error('Failed to fetch pending analyses:', pendingError.message);
      }

      const { data: completedData, error: completedError } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('reviewed_at', { ascending: false });

      if (completedError) {
        console.error('Failed to fetch completed analyses:', completedError.message);
      }

      setPending((pendingData || []).map(normalizeAnalysis));
      setEvaluated((completedData || []).map(normalizeAnalysis));
    } catch (err) {
      console.error('Failed to fetch analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  function formatDate(dateStr) {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const chartData = evaluated
    .filter((a) => a.evaluation?.overall_score != null)
    .map((a, i) => ({
      index: i + 1,
      label: `#${i + 1}`,
      score: a.evaluation.overall_score,
      date: new Date(a.evaluation.evaluatedAt || a.reviewed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    }))
    .reverse();

  if (loading) {
    return (
      <div className="flex-1 p-3 sm:p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-[88px] rounded-2xl bg-white/[0.03] border border-border animate-pulse" />
            ))}
          </div>
          <div className="h-[220px] rounded-2xl bg-white/[0.03] border border-border animate-pulse mb-6" />
          <div className="space-y-3">
            {[1,2].map(i => (
              <div key={i} className="h-[88px] rounded-2xl bg-white/[0.03] border border-border animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-8 md:pl-4 pb-24 md:pb-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto min-w-0">
          {/* Header */}
          <FadeIn>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-brand-accent" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-text-primary font-alpino">Meu Progresso</h1>
                  <p className="text-xs text-text-muted hidden sm:block">Acompanhe sua evolução e avaliações</p>
                </div>
              </div>
              <button onClick={() => navigate('/dashboard')} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-accent text-background text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto">
                Nova análise
              </button>
            </div>
          </FadeIn>

          {/* Plano Atual — Apple card */}
          <FadeIn>
            {(() => {
              const pid = resolveCurrentPlan(user);
              const plan = pid ? PLANS[pid] : null;
              const isFree = !pid;
              return (
                <Card className="apple-card apple-material-gold overflow-hidden mb-6 sm:mb-8">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                        <Crown className="w-4 h-4 text-brand-accent" />
                      </div>
                      <div>
                        <CardTitle className="text-[15px] font-semibold" style={{ letterSpacing: '-0.022em' }}>Plano Atual</CardTitle>
                        <CardDescription className="text-[13px]" style={{ letterSpacing: '-0.011em' }}>{isFree ? 'Gratuito — sem envios' : `${plan.name} • ${plan.period}`}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      {isFree ? (
                        <>
                          <p className="text-sm font-semibold text-text-primary">Free — 0 envios/mês</p>
                          <p className="text-xs text-text-muted mt-1">Assine para enviar avaliações. Login e cadastro continuam gratuitos.</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-text-primary" style={{ letterSpacing: '-0.011em' }}>{plan.name} — R$ {plan.price}/{plan.period}</p>
                          <p className="text-xs text-text-muted mt-1">{plan.benefits[0]}</p>
                        </>
                      )}
                    </div>
                    <Button onClick={() => navigate(isFree ? '/checkout-simulation' : '/dashboard/profile')} className="h-11 px-6 rounded-xl bg-brand-accent text-background font-semibold apple-button apple-focus gap-2 shrink-0">
                      {isFree ? <><Zap className="w-4 h-4" /> Ver planos</> : 'Gerenciar plano'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })()}
          </FadeIn>

          {/* Stats */}
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StaggerItem>
              <Card className="bg-card-bg border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">{pending.length}</p>
                      <p className="text-xs text-text-muted">Aguardando</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="bg-card-bg border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">{evaluated.length}</p>
                      <p className="text-xs text-text-muted">Avaliadas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="bg-card-bg border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-brand-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">{pending.length + evaluated.length}</p>
                      <p className="text-xs text-text-muted">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerContainer>

          {/* Line Chart */}
          {chartData.length > 0 && (
            <ScaleIn delay={0.2}>
              <Card className="bg-card-bg border-border rounded-2xl mb-8">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand-accent" />
                    <CardTitle className="text-sm text-text-primary font-alpino">Evolucao das Pontuacoes</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="label"
                          stroke="#64748b"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          stroke="#64748b"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#141414',
                            border: '1px solid rgba(211, 171, 57, 0.3)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          labelStyle={{ color: '#94a3b8' }}
                          itemStyle={{ color: '#d3ab39' }}
                          formatter={(value) => [`${value} pts`, 'Score']}
                          labelFormatter={(label, payload) => {
                            if (payload && payload[0]) {
                              return payload[0].payload.date;
                            }
                            return label;
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#d3ab39"
                          strokeWidth={2}
                          dot={{ fill: '#d3ab39', strokeWidth: 0, r: 4 }}
                          activeDot={{ r: 6, stroke: '#d3ab39', strokeWidth: 2, fill: '#141414' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </ScaleIn>
          )}

          {/* Tabs */}
          <FadeIn delay={0.3}>
          <Tabs defaultValue="pending">
            <TabsList className="flex-row gap-1 p-1 bg-white/[0.02] rounded-xl border border-border w-fit mb-6">
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                Aguardando ({pending.length})
              </TabsTrigger>
              <TabsTrigger value="evaluated" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Avaliadas ({evaluated.length})
              </TabsTrigger>
            </TabsList>

            {/* Pending */}
            <TabsContent value="pending">
              {pending.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 sm:py-16 text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Tudo em dia!</p>
                    <p className="text-xs text-text-muted mt-1">Nenhuma análise pendente. Que tal criar uma nova?</p>
                  </div>
                  <button onClick={() => navigate('/dashboard')} className="mt-2 px-4 py-2 rounded-xl bg-card-bg border border-border text-text-secondary text-xs hover:text-text-primary hover:border-brand-accent/20 transition-colors">
                    Criar nova análise
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map((a) => (
                    <Card key={a.id} className="bg-card-bg border-border cursor-pointer hover:border-brand-accent/40 transition-colors overflow-hidden" onClick={() => navigate(`/dashboard/evaluation/${a.id}`)}>
                      <CardContent className="p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <PhotoThumbs a={a} onOpen={setLightbox} />
                        <div className="flex-1 min-w-0 w-full">
                          <p className="text-sm font-medium text-text-primary truncate">
                            Analise Facial
                          </p>
                          <p className="text-xs text-text-muted mt-0.5 break-words">
                            Enviada em {formatDate(a.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Aguardando
                          </Badge>
                          <Eye className="w-4 h-4 text-text-muted" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Evaluated */}
            <TabsContent value="evaluated">
              {evaluated.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 sm:py-16 text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-border flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Sem avaliações ainda</p>
                    <p className="text-xs text-text-muted mt-1 max-w-[320px]">Suas análises avaliadas aparecerão aqui com score e detalhes. Envie suas primeiras fotos.</p>
                  </div>
                  <button onClick={() => navigate('/dashboard')} className="mt-2 px-4 py-2 rounded-xl bg-brand-accent text-background text-xs font-semibold hover:opacity-90">
                    Enviar fotos
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {evaluated.map((a) => (
                    <Card
                      key={a.id}
                      className="bg-card-bg border-border cursor-pointer hover:border-brand-accent/40 transition-colors overflow-hidden"
                      onClick={() => navigate(`/dashboard/evaluation/${a.id}`)}
                    >
                      <CardContent className="p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <PhotoThumbs a={a} onOpen={setLightbox} />
                        <div className="flex-1 min-w-0 w-full">
                          <p className="text-sm font-medium text-text-primary truncate">
                            Analise Facial
                          </p>
                          <p className="text-xs text-text-muted mt-0.5 break-words">
                            Avaliada em {formatDate(a.evaluation?.evaluatedAt || a.reviewed_at)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                          <Badge variant="success" className="text-xs">
                            Score {a.evaluation?.overall_score ?? '--'}
                          </Badge>
                          {a.evaluation?.attractiveness != null && (
                            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                              Atratividade {a.evaluation?.attractiveness}/10
                            </Badge>
                          )}
                          <Eye className="w-4 h-4 text-text-muted ml-1" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          </FadeIn>

          {/* Weekly Routine */}
          {routine && (
            <ScaleIn delay={0.4}>
              <div className="mt-8">
                <WeeklyRoutineTable exercises={routine} />
              </div>
            </ScaleIn>
          )}

        {lightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setLightbox(null)}
          >
            <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm underline"
              >
                Fechar
              </button>
              <img
                src={lightbox.src}
                alt={lightbox.label}
                className="w-full max-h-[80vh] object-contain rounded-2xl border border-border bg-black"
              />
              <p className="text-center text-white/80 mt-3 text-sm">{lightbox.label}</p>
            </div>
          </div>
        )}
        </div>
      </div>
  );
}
