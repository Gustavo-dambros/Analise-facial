import { useState, useRef, useCallback } from 'react';
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
        const { getUserAnalyses } = await import('@/lib/api');
        const history = await getUserAnalyses(user.id);
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

  const handleSend = async () => {
    if (sending) return;
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

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 md:pl-4 pb-24 sm:pb-6 md:pb-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          {/* Personalized greeting */}
          <p className="text-xs sm:text-sm text-text-secondary mb-2">
            {user?.full_name ? `Olá, ${user.full_name}!` : "Olá!"}
          </p>

          <h1 className="text-lg font-bold tracking-tight text-text-primary font-alpino">Nova Análise</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">Capture ou envie as fotos do rosto (frontal, perfil esquerdo e perfil direito) para avaliação de um profissional</p>
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
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 sm:gap-4 px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-border flex items-center justify-center bg-white/[0.02]">
                    <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-text-secondary" />
                  </div>
                  <p className="text-text-secondary text-xs sm:text-sm text-center">
                    {cameraError || `Ative a câmera ou faça upload de "${PHOTO_SLOTS.find(s => s.key === activeSlot)?.label}"`}
                  </p>
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

            {/* Botoes de acao */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-brand-accent text-background font-semibold text-xs sm:text-sm hover:opacity-90 transition-opacity"
                >
                  <Camera className="w-4 h-4" />
                  Ativar Câmera
                </button>
              ) : (
                <>
                  <button
                    onClick={capturePhoto}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-brand-accent text-background font-semibold text-xs sm:text-sm hover:opacity-90 transition-opacity"
                  >
                    <Camera className="w-4 h-4" />
                    Capturar
                  </button>
                  <button
                    onClick={stopCamera}
                    className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-border text-text-secondary font-medium text-xs sm:text-sm hover:text-text-primary hover:bg-white/5 transition-colors"
                  >
                    <CameraOff className="w-4 h-4" />
                    Parar
                  </button>
                </>
              )}

              <label
                onClick={() => fileInputRefs.current[activeSlot]?.click()}
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-border text-text-secondary font-medium text-xs sm:text-sm hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Upload
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                ref={(el) => { fileInputRefs.current[activeSlot] = el; }}
                onChange={(e) => {
                  handlePhotoUpload(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>

            <p className="text-[11px] text-text-muted">
              Formatos: JPG, PNG, WebP — max. 5MB
            </p>

            {/* Erro */}
            {sendError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {sendError}
              </div>
            )}

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

          {/* Coluna Direta: Slot Frontal */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-card-bg p-4">
              <h2 className="text-sm font-semibold text-text-primary mb-3">Foto Frontal (Obrigatória)</h2>
              <div className="grid grid-cols-1 gap-3">
                {PHOTO_SLOTS.filter(s => s.key === 'front').map(({ key, label, hint }) => (
                  <ContextMenu key={key}>
                    <ContextMenuTrigger asChild>
                      <div
                        onClick={() => setActiveSlot(key)}
                        className={`relative flex flex-col rounded-xl border overflow-hidden cursor-pointer transition-all duration-300 ${
                          activeSlot === key
                            ? 'border-brand-accent shadow-[0_0_20px_rgba(255,255,255,0.15)]'
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
                        <div className="px-2.5 py-1.5 border-t border-border">
                          <p className="text-[11px] sm:text-xs font-medium text-text-secondary text-center">{label}</p>
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

            {/* Preview of all captured photos */}
            {Object.values(photos).some(p => p) && (
              <div className="rounded-2xl border border-border bg-card-bg p-4">
                <h2 className="text-sm font-semibold text-text-primary mb-2">Fotos capturadas</h2>
                <div className="grid grid-cols-2 gap-2">
                  {PHOTO_SLOTS.map(({ key, label, hint, optional }) => {
                    const photo = photos[key];
                    if (!photo) return null;
                    const isOptional = key === 'body' && optional;
                    const slotLabel = isOptional && !photo ? '' : label;
                    return (
                      <div
                        key={key}
                        className="flex flex-col items-center gap-1.5 px-2 py-2 rounded-xl border border-border transition-colors hover:border-brand-accent/40 cursor-pointer"
                      >
                        <img
                          src={photo}
                          alt={label}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                        <p className="text-[10px] sm:text-xs font-medium text-text-primary text-center">{slotLabel}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemovePhoto(key); }}
                          className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:text-red-300 text-[10px] sm:text-xs transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botao Enviar */}
            <button
              onClick={handleSend}
              disabled={!photos.front || sending}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                photos.front && photos.left && photos.right && !sending
                  ? 'bg-brand-accent text-background hover:opacity-90'
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
          </div>
        </div>
      </div>
    </div>
  );
}