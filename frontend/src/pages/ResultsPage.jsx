import { useLocation, useNavigate } from 'react-router-dom';
import { RotateCcw, ArrowLeft } from 'lucide-react';
import oval from '@/assets/faces/oval.png';
import square from '@/assets/faces/square.png';
import rectangular from '@/assets/faces/rectangular.png';
import round from '@/assets/faces/round.png';
import heart from '@/assets/faces/heart.png';
import diamond from '@/assets/faces/diamond.png';
import pear from '@/assets/faces/pear.png';

const faceShapeImages = {
  Oval: oval,
  Quadrado: square,
  Retangular: rectangular,
  Redondo: round,
  Coração: heart,
  Diamante: diamond,
  Pera: pear,
};
import FacialThirds from '@/components/evaluation/FacialThirds';
import RadarAttributes from '@/components/evaluation/RadarAttributes';
import HighlightBadges from '@/components/evaluation/HighlightBadges';
import { PageTransition, FadeIn, ScaleIn, SlideInLeft, SlideInRight, StaggerContainer, StaggerItem } from '@/components/ui/page-transition';

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { geometryData, frontPhoto } = location.state || {};

  if (!geometryData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-6">
        <p className="text-text-secondary text-sm">Nenhum resultado disponível.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-accent text-background font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar à Análise
        </button>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
            <FadeIn>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <div className="h-5 w-px bg-border" />
                <h1 className="text-lg font-bold tracking-tight text-text-primary font-alpino">
                  Resultado da Análise
                </h1>
              </div>
            </FadeIn>
            <ScaleIn delay={0.1}>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-background font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-4 h-4" />
                Nova Análise
              </button>
            </ScaleIn>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Left column — face photo + score */}
            <SlideInLeft delay={0.15}>
              <div className="flex flex-col items-center gap-6 lg:w-80 shrink-0">
                {/* Face photo */}
                {frontPhoto && (
                  <ScaleIn delay={0.2}>
                    <div className="relative w-full max-w-xs rounded-2xl overflow-hidden border border-border bg-card-bg shadow-lg">
                      <img
                        src={frontPhoto}
                        alt="Foto da análise"
                        className="w-full aspect-[3/4] object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <p className="text-xs font-medium text-white/80 text-center">Foto capturada</p>
                      </div>
                    </div>
                  </ScaleIn>
                )}

                {/* Score radial */}
                <ScaleIn delay={0.3}>
                  <ChartRadialText
                    score={geometryData?.harmonyScore ?? 0}
                    label="Pontuação Geral"
                  />
                </ScaleIn>

                {/* Highlight badges */}
                <FadeIn delay={0.4}>
                  <HighlightBadges highlights={geometryData?.highlights} />
                </FadeIn>
              </div>
            </SlideInLeft>

            {/* Right column — charts & data */}
            <SlideInRight delay={0.2}>
              <div className="flex-1 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FadeIn delay={0.25}>
                    <RadarAttributes data={geometryData?.radarFeatures} />
                  </FadeIn>
                  <FadeIn delay={0.3}>
                    <FacialThirds thirds={geometryData?.thirds} />
                  </FadeIn>
                </div>

                {/* Dicas de Visagismo */}
                {geometryData?.raw && Object.keys(geometryData.raw).length > 0 && (
                  <FadeIn delay={0.35}>
                    <div className="rounded-2xl border border-border bg-card-bg p-6">
                      <h3 className="text-sm font-semibold text-text-secondary mb-4">Dicas de Visagismo</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
{geometryData.raw.formato_rosto && (
              <div className="flex items-center gap-2">
                <img
                  src={faceShapeImages[geometryData.raw.formato_rosto] || square}
                  alt={geometryData.raw.formato_rosto}
                  className="h-6 w-auto"
                />
                <p className="text-xs text-text-muted">Formato do Rosto</p>
                <p className="text-sm text-text-primary">{geometryData.raw.formato_rosto}</p>
              </div>
            )}
                        {geometryData.raw.cabelo && (
                          <div className="flex flex-col gap-1">
                            <p className="text-xs text-text-muted">Cabelo</p>
                            <p className="text-sm text-text-primary">{geometryData.raw.cabelo}</p>
                          </div>
                        )}
                        {geometryData.raw.barba && (
                          <div className="flex flex-col gap-1">
                            <p className="text-xs text-text-muted">Barba</p>
                            <p className="text-sm text-text-primary">{geometryData.raw.barba}</p>
                          </div>
                        )}
                        {geometryData.raw.oculos && (
                          <div className="flex flex-col gap-1">
                            <p className="text-xs text-text-muted">Óculos</p>
                            <p className="text-sm text-text-primary">{geometryData.raw.oculos}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </FadeIn>
                )}

                {/* Date */}
                <FadeIn delay={0.4}>
                  <div className="text-center text-xs text-text-muted">
                    Análise realizada em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </FadeIn>
              </div>
            </SlideInRight>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
