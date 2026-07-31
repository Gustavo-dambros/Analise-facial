import { useState, useEffect } from 'react';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FadeIn, ScaleIn, StaggerContainer, StaggerItem } from '@/components/ui/page-transition';

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

export default function AdminEvaluatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [attractiveness, setAttractiveness] = useState(5);
  const [tercoSuperior, setTercoSuperior] = useState(33);
  const [tercoMedio, setTercoMedio] = useState(34);
  const [tercoInferior, setTercoInferior] = useState(33);
  const [attributes, setAttributes] = useState({});
  const [highlightsInput, setHighlightsInput] = useState('');
  const [cabelo, setCabelo] = useState('');
  const [barba, setBarba] = useState('');
  const [oculos, setOculos] = useState('');
  const [tercoError, setTercoError] = useState(false);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('pending_evaluations') || '[]');
    const found = data.find((a) => a.id === id);
    if (found) setEntry(found);
  }, [id]);

  useEffect(() => {
    const sum = Number(tercoSuperior) + Number(tercoMedio) + Number(tercoInferior);
    setTercoError(sum !== 100);
  }, [tercoSuperior, tercoMedio, tercoInferior]);

  const highlights = highlightsInput
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

  function handleSubmit(e) {
    e.preventDefault();
    if (tercoError) return;

    const evalAttrs = {};
    ATTRIBUTE_DEFS.forEach((name) => {
      evalAttrs[name] = attributes[name] ?? 5;
    });

    const attrSymmetry = ATTRIBUTE_DEFS.reduce((sum, name) => sum + (evalAttrs[name] || 0), 0) / ATTRIBUTE_DEFS.length;
    const attrOverall = ((attrSymmetry + Number(attractiveness)) / 2) * 10;

    const evaluation = {
      overall_score: Math.round(attrOverall * 10) / 10,
      symmetry_score: Math.round(attrSymmetry * 100) / 100,
      attractiveness: Number(attractiveness),
      thirds: {
        superior: Number(tercoSuperior),
        medio: Number(tercoMedio),
        inferior: Number(tercoInferior),
      },
      attributes: evalAttrs,
      highlights,
      visagismo_tips: { cabelo, barba, oculos },
      evaluatedAt: new Date().toISOString(),
    };

    // Save evaluation and remove from pending
    const pending = JSON.parse(localStorage.getItem('pending_evaluations') || '[]');
    const updated = pending.filter((a) => a.id !== id);
    localStorage.setItem('pending_evaluations', JSON.stringify(updated));

    const evaluations = JSON.parse(localStorage.getItem('evaluations') || '[]');
    evaluations.push({ ...entry, evaluation });
    localStorage.setItem('evaluations', JSON.stringify(evaluations));

    setSubmitted(true);
    setTimeout(() => navigate('/dashboard/admin'), 1500);
  }

  if (!entry) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-secondary">Análise não encontrada.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="w-12 h-12 text-green-400" />
          <p className="text-sm text-green-400 font-medium">Avaliação salva com sucesso!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 md:pl-4">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={() => navigate('/dashboard/admin')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <div className="h-5 w-px bg-border" />
              <h1 className="text-lg font-bold tracking-tight text-text-primary font-alpino">
                Avaliar Análise
              </h1>
              <span className="text-xs text-text-muted ml-auto">
                ID: {id.slice(0, 8)}... — {entry.userName}
              </span>
            </div>
          </FadeIn>

        {/* Fotos */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <FadeIn delay={0.1}>
            <h2 className="text-sm font-semibold text-text-secondary mb-3 col-span-full">Fotos Enviadas</h2>
          </FadeIn>
          {[
            { key: 'front', label: 'Frontal' },
            { key: 'left', label: 'Perfil Esquerdo' },
            { key: 'right', label: 'Perfil Direito' },
          ].map(({ key, label }) => (
            <StaggerItem key={key}>
              <div className="rounded-2xl border border-border bg-card-bg overflow-hidden">
                {entry.photos?.[key] ? (
                  <img src={entry.photos[key]} alt={label} className="w-full aspect-[3/4] object-cover" />
                ) : (
                  <div className="w-full aspect-[3/4] flex items-center justify-center bg-white/[0.02]">
                    <p className="text-xs text-text-muted">Sem foto</p>
                  </div>
                )}
                <div className="px-3 py-2 border-t border-border">
                  <p className="text-[11px] font-medium text-text-secondary text-center">{label}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Scores Gerais */}
          <FadeIn delay={0.2}>
            <section className="rounded-2xl border border-border bg-card-bg p-6 space-y-5">
              <h2 className="text-sm font-semibold text-text-secondary">Scores Gerais</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Atratividade (1-10): {attractiveness}</Label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={attractiveness}
                    onChange={(e) => setAttractiveness(Number(e.target.value))}
                    className="w-full accent-brand-accent"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Simetria (Media automatica)</Label>
                  <div className="h-10 flex items-center text-sm text-text-muted">
                    Media dos 13 atributos = {(() => {
                      const vals = ATTRIBUTE_DEFS.map((n) => attributes[n] ?? 5).filter((v) => v != null);
                      return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : '--';
                    })()}/10
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Overall (0-100): {Math.round((((ATTRIBUTE_DEFS.reduce((sum, name) => sum + (attributes[name] ?? 5), 0) / ATTRIBUTE_DEFS.length) + Number(attractiveness || 5)) / 2) * 10)}</Label>
              </div>
            </section>
          </FadeIn>

          {/* Terços Faciais */}
          <FadeIn delay={0.25}>
            <section className="rounded-2xl border border-border bg-card-bg p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-secondary">Divisão dos Terços Faciais</h2>
                <span className={`text-xs font-medium ${tercoError ? 'text-red-400' : 'text-green-400'}`}>
                  Soma: {Number(tercoSuperior) + Number(tercoMedio) + Number(tercoInferior)}%
                  {tercoError && ' (deve ser 100%)'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label>Terço Superior (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={tercoSuperior}
                    onChange={(e) => setTercoSuperior(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Terço Médio (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={tercoMedio}
                    onChange={(e) => setTercoMedio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Terço Inferior (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={tercoInferior}
                    onChange={(e) => setTercoInferior(e.target.value)}
                  />
                </div>
              </div>
            </section>
          </FadeIn>

          {/* 13 Atributos Faciais */}
          <FadeIn delay={0.3}>
            <section className="rounded-2xl border border-border bg-card-bg p-6 space-y-5">
              <h2 className="text-sm font-semibold text-text-secondary">13 Atributos Faciais (1-10)</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {ATTRIBUTE_DEFS.map((attrName) => {
                  const currentVal = attributes[attrName] ?? 5;
                  const label = currentVal <= 3 ? 'Ok' : currentVal <= 6 ? 'Bom' : 'Otimo';
                  return (
                    <div key={attrName} className="space-y-1.5">
                      <Label className="text-[11px]">{attrName}</Label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={currentVal}
                        onChange={(e) => setAttributes((prev) => ({ ...prev, [attrName]: Number(e.target.value) }))}
                        className="w-full accent-brand-accent h-5"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-muted font-medium">{label}</span>
                        <span className="text-[10px] text-brand-accent font-bold">{currentVal}/10</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </FadeIn>

          {/* Highlights */}
          <FadeIn delay={0.35}>
            <section className="rounded-2xl border border-border bg-card-bg p-6 space-y-5">
              <h2 className="text-sm font-semibold text-text-secondary">Pontos Fortes (Highlights)</h2>
              <div className="space-y-2">
                <Label>Separados por vírgula</Label>
                <Input
                  placeholder="Ex: Simetria excellent, Contorno definido, Proporção harmoniosa"
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
          <FadeIn delay={0.4}>
            <section className="rounded-2xl border border-border bg-card-bg p-6 space-y-5">
              <h2 className="text-sm font-semibold text-text-secondary">Recomendações de Visagismo</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label>Corte de Cabelo</Label>
                  <textarea
                    value={cabelo}
                    onChange={(e) => setCabelo(e.target.value)}
                    placeholder="Ex: Corte curto nas laterais, mais volume no topo..."
                    rows={3}
                    className="flex w-full rounded-md border border-border bg-card-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Barba</Label>
                  <textarea
                    value={barba}
                    onChange={(e) => setBarba(e.target.value)}
                    placeholder="Ex: Barba curta uniforme, sem bigode..."
                    rows={3}
                    className="flex w-full rounded-md border border-border bg-card-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Óculos</Label>
                  <textarea
                    value={oculos}
                    onChange={(e) => setOculos(e.target.value)}
                    placeholder="Ex: Arredondados, aro fino, tons neutros..."
                    rows={3}
                    className="flex w-full rounded-md border border-border bg-card-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none"
                  />
                </div>
              </div>
            </section>
          </FadeIn>

          {/* Botão Enviar */}
          <FadeIn delay={0.45}>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={tercoError}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                  !tercoError
                    ? 'bg-brand-accent text-background hover:opacity-90'
                    : 'bg-white/5 text-text-muted border border-border cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                Enviar Avaliação
              </button>
            </div>
          </FadeIn>
        </form>
      </div>
    </div>
  );
}
