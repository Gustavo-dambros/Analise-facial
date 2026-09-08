import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  CameraOff,
  Upload,
  User,
  Loader2,
  Send,
  CheckCircle2,
  Trash2,
  Image,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { validateMagicBytes } from '@/lib/supabase/storage';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
// Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion
import PlanBanners from '@/components/PlanBanners';

const PHOTO_SLOTS = [
  { key: 'front', label: 'Frontal', hint: 'Rosto de frente' },
  { key: 'left', label: 'Perfil Esquerdo', hint: 'Lado esquerdo' },
  { key: 'right', label: 'Perfil Direito', hint: 'Lado direito' },
  { key: 'body', label: 'Físico', hint: 'Corpo de frente (opcional)', optional: true },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function FaceAnalyzer() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState({ front: null, left: null, right: null, body: null });
  const [activeSlot, setActiveSlot] = useState('front');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [analysesCount, setAnalysesCount] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRefs = useRef({});

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      setCameraError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      setCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    const loadAnalysesCount = async () => {
      if (!user?.id) return;
      try {
        const { getAnalysisHistory } = await import('@/lib/api');
        const history = await getAnalysisHistory();
        setAnalysesCount(history.length);
      } catch (err) {
        console.error('Falha ao carregar contagem de análises:', err);
        setAnalysesCount(0);
      }
    };
    loadAnalysesCount();
  }, [user?.id]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    setPhotos((prev) => {
      const next = { ...prev, [activeSlot]: base64 };
      // Auto-advance to next empty slot
      const slotOrder = ['front', 'left', 'right', 'body'];
      const currentIdx = slotOrder.indexOf(activeSlot);
      const nextEmpty = slotOrder.find((s, i) => i > currentIdx && !next[s])
        || slotOrder.find((s) => !next[s]);
      if (nextEmpty) setActiveSlot(nextEmpty);
      return next;
    });
  }, [activeSlot]);

  const handlePhotoUpload = useCallback((file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setSendError(`Imagem muito grande (${sizeMB}MB). O limite é 5MB.`);
      return;
    }
    setSendError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotos((prev) => {
        const next = { ...prev, [activeSlot]: reader.result };
        // Auto-advance to next empty slot
        const slotOrder = ['front', 'left', 'right', 'body'];
        const currentIdx = slotOrder.indexOf(activeSlot);
        const nextEmpty = slotOrder.find((s, i) => i > currentIdx && !next[s])
          || slotOrder.find((s) => !next[s]);
        if (nextEmpty) setActiveSlot(nextEmpty);
        return next;
      });
    };
    reader.readAsDataURL(file);
  }, [activeSlot]);

  const handleRemovePhoto = useCallback((key) => {
    setPhotos((prev) => ({ ...prev, [key]: null }));
  }, []);

  const [biometricConsent, setBiometricConsent] = useState(false);
  const handleSend = async () => {
    if (sending) return;
    if (!biometricConsent) {
      setSendError('Você precisa consentir o tratamento de dados biométricos sensíveis para enviar (LGPD Art.11).');
      return;
    }
    setSending(true);
    setSendError(null);

    try {
      if (!photos.front) {
        throw new Error('A foto frontal é obrigatória.');
      }

      // Validate magic bytes for all non-null photos
      for (const [slot, photo] of Object.entries(photos)) {
        if (photo) {
          const isValid = await validateMagicBytes(photo);
          if (!isValid) {
            const slotLabel = slot === 'front' ? 'frontal' : slot === 'left' ? 'esquerda' : slot === 'right' ? 'direita' : 'do físico';
            throw new Error(`A foto ${slotLabel} não é uma imagem válida. Use JPG, PNG ou WebP.`);
          }
        }
      }

      // As fotos frontal, esquerda e direita são obrigatórias para a avaliação do profissional
      if (!photos.left || !photos.right) {
        throw new Error('As fotos de perfil esquerdo e direito também são obrigatórias.');
      }

      // Envia todas as fotos para avaliação de um profissional via API FastAPI
      const { submitAnalysis } = await import('@/lib/api');
      const result = await submitAnalysis({
        front: photos.front,
        left: photos.left,
        right: photos.right,
        body: photos.body,
      });

      setSubmitted(true);
      setPhotos({ front: null, left: null, right: null, body: null });
      setActiveSlot('front');
      stopCamera();
      // Atualiza contador imediatamente para feedback; ProgressPage recarrega via Supabase ao navegar
      setAnalysesCount((c) => c + 1);
      // Dispara evento para que outras abas/páginas possam recarregar se ouvirem
      try { window.dispatchEvent(new CustomEvent('analysis:submitted', { detail: result })); } catch {}
    } catch (err) {
      setSendError(err.message || 'Erro ao enviar imagem para análise');
    } finally {
      setSending(false);
    }
  };

  const handleNewScan = () => {
    setPhotos({ front: null, left: null, right: null, body: null });
    setActiveSlot('front');
    setSendError(null);
    setSubmitted(false);
  };

  const completedSlots = Object.values(photos).filter(Boolean).length;
  const requiredDone = ['front','left','right'].filter(k => photos[k]).length;
  const canSend = photos.front && photos.left && photos.right && !sending;

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 md:pl-4 pb-24 sm:pb-6 md:pb-8">
      <div className="max-w-6xl mx-auto">
        {/* Header — com hierarquia e progresso */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mb-2">
            <p className="text-sm sm:text-base text-text-primary font-medium">
              {user?.full_name ? `Olá, ${user.full_name} 👋` : "Olá! 👋"}
            </p>
            {analysesCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-border text-[11px] text-text-muted">
                {analysesCount} {analysesCount === 1 ? 'análise' : 'análises'} • {requiredDone}/3 obrigatórias
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary font-alpino">Nova Análise</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1.5 max-w-2xl leading-relaxed">Fotografe de frente, perfil esquerdo e direito com luz natural. Um especialista avalia em até 48h — o físico é opcional e melhora a consulta.</p>

          {/* Progresso sutil */}
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1.5 flex-1 max-w-[280px] rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full bg-brand-accent transition-all duration-500" style={{ width: `${(requiredDone/3)*100}%` }} />
            </div>
            <span className="text-[11px] text-text-muted">{requiredDone}/3</span>
            <span className="text-[11px] text-text-secondary hidden sm:inline">{completedSlots === 4 ? 'Completo' : completedSlots ? `${completedSlots} fotos` : 'Comece pela frontal'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_410px] gap-6">
          {/* Coluna Esquerda: Camera + Botoes */}
          <div className="flex flex-col gap-4">
            {/* Camera / Preview */}
            <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-card-bg border border-border">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ transform: 'scaleX(-1)' }}
                className={`w-full h-full object-cover ${cameraActive && !photos[activeSlot] ? 'block' : 'hidden'}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {photos[activeSlot] && (
                <img src={photos[activeSlot]} alt="Foto capturada" className="w-full h-full object-cover" />
              )}

              {!cameraActive && !photos[activeSlot] && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 sm:gap-4 px-5 sm:px-8 text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-border bg-white/[0.03] flex items-center justify-center">
                    <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-text-secondary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-text-primary text-xs sm:text-sm font-medium">
                      {cameraError ? 'Câmera indisponível' : `Foto: ${PHOTO_SLOTS.find(s => s.key === activeSlot)?.label}`}
                    </p>
                    <p className="text-text-muted text-[11px] sm:text-xs leading-relaxed max-w-[320px]">
                      {cameraError || (activeSlot === 'front' ? 'Centralize o rosto, luz natural de frente, sem filtro.' : activeSlot === 'body' ? 'Opcional — corpo de frente ajuda no visagismo.' : 'Rosto a 90° — orelha e contorno visíveis.')}
                    </p>
                    {!cameraError && (
                      <div className="flex flex-wrap gap-2 justify-center pt-1">
                        <span className="text-[11px] px-2 py-1 rounded-full bg-white/[0.04] border border-border text-text-muted">JPG/PNG/WebP • até 5MB</span>
                        <button onClick={() => fileInputRefs.current[activeSlot]?.click()} className="text-[11px] px-2 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">Escolher arquivo</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {cameraActive && (
                <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border">
                  <p className="text-[11px] sm:text-xs font-medium text-text-primary">
                    {PHOTO_SLOTS.find(s => s.key === activeSlot)?.label}
                  </p>
                </div>
              )}
            </div>

            {/* Ações — com a11y e feedback */}
            <div className="flex flex-wrap gap-4">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  aria-label="Ativar câmera"
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-brand-accent text-background font-semibold text-xs sm:text-sm hover:scale-[1.02] active:scale-[0.96] apple-transition apple-focus apple-button"
                >
                  <Camera className="w-4 h-4" />
                  Ativar Câmera
                </button>
              ) : (
                <>
                  <button
                    onClick={capturePhoto}
                    aria-label={`Capturar ${PHOTO_SLOTS.find(s=>s.key===activeSlot)?.label}`}
                    className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-brand-accent text-background font-semibold text-xs sm:text-sm hover:scale-[1.02] active:scale-[0.96] apple-transition apple-focus apple-button"
                  >
                    <Camera className="w-4 h-4" />
                    Capturar
                  </button>
                  <button
                    onClick={stopCamera}
                    aria-label="Parar câmera"
                    className="inline-flex items-center gap-2 h-11 px-6 rounded-xl border apple-material text-text-secondary font-medium text-xs sm:text-sm hover:text-text-primary apple-transition apple-focus"
                  >
                    <CameraOff className="w-4 h-4" />
                    Parar
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => fileInputRefs.current[activeSlot]?.click()}
                aria-label="Fazer upload"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-xl border apple-material text-text-secondary font-medium text-xs sm:text-sm hover:text-text-primary cursor-pointer apple-transition apple-focus"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                ref={(el) => { fileInputRefs.current[activeSlot] = el; }}
                onChange={(e) => {
                  handlePhotoUpload(e.target.files?.[0]);
                  e.target.value = '';
                }}
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => navigate('/dashboard/photo-guide')}
                className="text-[11px] sm:text-xs text-text-muted hover:text-text-secondary underline underline-offset-4 px-1"
              >
                Ver guia de fotos
              </button>
            </div>

            <p className="text-[11px] text-text-muted">
              Dica: fundo claro, sem óculos escuros. Você pode refazer qualquer foto antes de enviar.
            </p>

            {/* Erro — paywall só no envio, login/conta continuam grátis */}
            {sendError && (() => {
              const msg = String(sendError || '');
              const isPaywall = /limite|assine|gratuito não inclui|plano gratuito/i.test(msg);
              if (isPaywall) {
                return (
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm font-medium text-yellow-400">{msg}</p>
                    <p className="text-xs text-text-secondary mt-1">Login e cadastro são gratuitos. A cobrança é apenas para enviar avaliações.</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button onClick={() => navigate('/checkout-simulation')} className="px-4 py-2 rounded-xl bg-brand-accent text-background text-sm font-semibold hover:opacity-90">Ver planos</button>
                      <button onClick={() => navigate('/dashboard/profile')} className="px-4 py-2 rounded-xl border border-border text-sm text-text-secondary hover:text-text-primary">Meu plano</button>
                    </div>
                  </div>
                );
              }
              return (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {sendError}
                </div>
              );
            })()}

            {/* Notificacao de sucesso */}
            {submitted && (
              <div className="p-3 sm:p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-400">
                    Análise enviada para avaliação
                  </p>
                  <p className="text-xs text-green-400/70 mt-1">
                    Um profissional irá avaliar suas fotos em breve.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button
                    onClick={() => navigate('/dashboard/progress')}
                    className="text-xs text-green-400/80 hover:text-green-400 transition-colors underline underline-offset-2"
                  >
                    Ver meu progresso
                  </button>
                  <button
                    onClick={handleNewScan}
                    className="text-xs text-green-400/60 hover:text-green-400 transition-colors underline underline-offset-2"
                  >
                    Nova análise
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Slots */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border apple-material-gold bg-card-bg p-4 apple-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text-primary" style={{ letterSpacing: '-0.022em' }}>Fotos</h2>
                <span className="text-[11px] px-2 py-1 rounded-full bg-white/[0.04] border border-border text-text-muted apple-badge">{requiredDone}/3 obrigatórias</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {PHOTO_SLOTS.map(({ key, label, hint, optional }) => (
                  <ContextMenu key={key}>
                    <ContextMenuTrigger asChild>
                      <div
                        onClick={() => setActiveSlot(key)}
                        className={`relative flex flex-col rounded-xl border overflow-hidden cursor-pointer apple-transition apple-card ${
                          activeSlot === key
                            ? 'border-brand-accent shadow-[0_4px_12px_rgba(0,0,0,0.1)] scale-[1.02]'
                            : photos[key]
                              ? 'border-border hover:border-brand-accent/40'
                              : 'border-dashed border-border/60 hover:border-brand-accent/50 hover:bg-white/[0.02]'
                        } bg-background`}
                      >
                        {photos[key] ? (
                          <>
                            <img src={photos[key]} alt={label} className="w-full aspect-square object-cover" />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemovePhoto(key); }}
                              className="absolute top-1.5 right-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-background/80 border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-background transition-colors text-[10px] sm:text-xs"
                            >x</button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2.5 aspect-square px-3 bg-white/[0.01]">
                            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-border/50 flex items-center justify-center bg-white/[0.02] transition-colors group-hover:border-brand-accent/30">
                              <User className="w-5 h-5 sm:w-7 sm:h-7 text-text-muted" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs sm:text-sm font-medium text-text-primary leading-tight">{label}</p>
                              <p className="text-[10px] sm:text-[11px] text-text-muted mt-0.5 hidden sm:block">{hint}</p>
                            </div>
                          </div>
                        )}
                        <div className="px-2 py-1.5 border-t border-border flex items-center justify-center gap-1.5">
                          <p className="text-[11px] sm:text-xs font-medium text-text-secondary text-center truncate">{label}</p>
                          {optional && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-border text-text-muted">Opcional</span>}
                          {!optional && photos[key] && <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />}
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-background border-border">
                      <ContextMenuItem
                        onClick={() => {
                          setActiveSlot(key);
                          if (!cameraActive) startCamera();
                        }}
                        className="gap-2 text-text-primary focus:bg-white/5 focus:text-text-primary"
                      >
                        <Camera className="w-4 h-4" />
                        Capturar
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => {
                          setActiveSlot(key);
                          setTimeout(() => fileInputRefs.current[key]?.click(), 100);
                        }}
                        className="gap-2 text-text-primary focus:bg-white/5 focus:text-text-primary"
                      >
                        <Image className="w-4 h-4" />
                        Upload
                      </ContextMenuItem>
                      {photos[key] && (
                        <>
                          <ContextMenuSeparator className="bg-border" />
                          <ContextMenuItem
                            onClick={() => handleRemovePhoto(key)}
                            className="gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remover
                          </ContextMenuItem>
                        </>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            </div>

            {/* Botao Enviar — com helper */}
            {!canSend && !sending && !submitted && (
              <p className="text-[11px] text-text-muted px-1" style={{ letterSpacing: '-0.011em' }}>
                {requiredDone === 0 ? 'Envie a frontal para começar' : requiredDone === 1 ? 'Falta perfil esquerdo e direito' : requiredDone === 2 ? 'Falta 1 perfil (esquerdo ou direito)' : ''}
              </p>
            )}
            <label className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.03] border border-border text-xs text-text-secondary">
              <input type="checkbox" checked={biometricConsent} onChange={(e) => setBiometricConsent(e.target.checked)} className="mt-0.5" />
              <span>Consinto o tratamento das minhas fotos como dado sensível biométrico para avaliação estética por profissional, com armazenamento em bucket privado e exclusão pós-laudo — <a href="/privacidade" className="underline text-brand-accent">Política</a>. Versão 1.0 03/09/2026</span>
            </label>
            <button
              onClick={handleSend}
              disabled={!canSend || !biometricConsent}
              aria-disabled={!canSend || !biometricConsent}
              aria-busy={sending}
              className={`flex items-center justify-center gap-2 w-full h-11 rounded-xl font-semibold text-sm apple-transition apple-focus apple-button ${
                canSend && biometricConsent
                  ? 'bg-brand-accent text-background hover:scale-[1.02] active:scale-[0.96] shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
                  : 'bg-white/5 text-text-muted border border-border cursor-not-allowed'
              }`}
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar para Avaliação
                </>
              )}
            </button>
            {canSend && <p className="text-[11px] text-text-muted text-center">Revise as fotos — você pode refazer antes de enviar.</p>}
          </div>
        </div>
      </div>

      <PlanBanners />
    </div>
  );
}