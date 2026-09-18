import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Send, MessageCircle, Star, Bug, Lightbulb, Layout,
  DollarSign, HelpCircle, CheckCircle, AlertCircle,
  Loader2, X, ChevronDown, UserPlus, CheckCircle2,
  Mail, Crown as CrownIcon, Plus, Trash2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createRecommendation, listMyRecommendations, createPlanAssignment, listPlanAssignments, cancelPlanAssignment } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Toast removed - using inline notifications instead

// Feature flag: false = esconde todos os pontos de criacao de sugestoes (reativar depois)
export const RECOMMENDATIONS_ENABLED = false;

const CATEGORIES = [
  { value: 'feature', label: 'Nova funcionalidade', icon: Lightbulb },
  { value: 'bug', label: 'Reportar bug', icon: Bug },
  { value: 'ux', label: 'Experiência/Design', icon: Layout },
  { value: 'pricing', label: 'Preços/Planos', icon: DollarSign },
  { value: 'other', label: 'Outro', icon: HelpCircle },
];

export function RecommendationDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<'form' | 'success' | 'list'>('form');
  const [category, setCategory] = useState('feature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [myRecommendations, setMyRecommendations] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (title.trim().length < 3) return setError('Título deve ter pelo menos 3 caracteres');
    if (description.trim().length < 10) return setError('Descrição deve ter pelo menos 10 caracteres');

    setSubmitting(true);
    try {
      await createRecommendation({ title: title.trim(), description: description.trim(), category });
      setTitle('');
      setDescription('');
      setCategory('feature');
      setStep('success');
      showToast('success', 'Sugestão enviada com sucesso! Nossa equipe vai analisar.');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar sugestão');
      showToast('error', err.message || 'Erro ao enviar sugestão');
    } finally {
      setSubmitting(false);
    }
  };

  const loadMyRecommendations = async () => {
    setLoadingList(true);
    try {
      const res = await listMyRecommendations();
      setMyRecommendations(res.items || []);
    } catch {
      showToast('error', 'Erro ao carregar suas sugestões');
    } finally {
      setLoadingList(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      reviewed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      implemented: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    const labels: Record<string, string> = {
      pending: 'Pendente',
      reviewed: 'Em análise',
      implemented: 'Implementado',
      rejected: 'Não aceito',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getCategoryIcon = (cat: string) => {
    const c = CATEGORIES.find(x => x.value === cat);
    return c ? <c.icon className="w-3 h-3" /> : <HelpCircle className="w-3 h-3" />;
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card-bg border border-border rounded-2xl font-urbanist"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-brand-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary font-alpino">Central de Sugestões</h2>
                <p className="text-text-secondary text-xs">Envie ideias, reporte bugs ou melhore o FaceMax</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-brand-accent/10 transition-colors text-text-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toast */}
          {toast && (
            <motion.div
              className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 max-w-sm ${
                toast.type === 'success'
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
            >
              {toast.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <span className="text-sm font-medium">{toast.message}</span>
              <button onClick={() => setToast(null)} className="ml-auto p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
            </motion.div>
          )}

          {/* Content */}
          <div className="p-6">
            {step === 'form' && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Categoria</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full bg-background border-border">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="w-4 h-4" />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Título</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Resuma sua sugestão em poucas palavras"
                    maxLength={200}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Descrição <span className="text-text-muted">({description.length}/5000)</span>
                  </label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Descreva detalhadamente sua ideia, bug ou sugestão..."
                    maxLength={5000}
                    rows={6}
                    className="bg-background border-border text-text-primary placeholder-text-muted focus:ring-brand-accent/50 focus:border-brand-accent"
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-brand-accent hover:opacity-90 text-background font-semibold py-3 rounded-xl transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Enviar Sugestão
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => { setStep('list'); loadMyRecommendations(); }}
                    variant="outline"
                    className="flex-1 border-brand-accent/50 text-brand-accent hover:bg-brand-accent/10 py-3 rounded-xl"
                  >
                    Minhas Sugestões
                  </Button>
                </div>
              </form>
            )}

            {step === 'success' && (
              <motion.div
                className="text-center py-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-text-primary font-alpino mb-2">Sugestão Enviada!</h3>
                <p className="text-text-secondary mb-6">Obrigado por ajudar a melhorar o FaceMax. Nossa equipe vai analisar sua sugestão.</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setStep('form')} variant="outline" className="border-brand-accent/50 text-brand-accent hover:bg-brand-accent/10">
                    Enviar Outra
                  </Button>
                  <Button onClick={() => { setStep('list'); loadMyRecommendations(); }} className="bg-brand-accent hover:opacity-90">
                    Ver Minhas Sugestões
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'list' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-text-primary font-alpino">Minhas Sugestões</h3>
                  <Button onClick={() => setStep('form')} variant="ghost" size="sm" className="text-text-muted hover:text-brand-accent">
                    <ChevronDown className="w-4 h-4 mr-1" /> Nova Sugestão
                  </Button>
                </div>
                {loadingList ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-brand-accent animate-spin" />
                  </div>
                ) : myRecommendations.length === 0 ? (
                  <div className="text-center py-8 text-text-muted">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhuma sugestão enviada ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {myRecommendations.map(rec => (
                      <motion.div
                        key={rec.id}
                        className="p-4 rounded-xl bg-background border border-border"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getCategoryIcon(rec.category)}
                            <span className="font-semibold text-text-primary truncate">{rec.title}</span>
                            {getStatusBadge(rec.status)}
                          </div>
                          <span className="text-text-muted text-xs whitespace-nowrap">
                            {new Date(rec.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-text-secondary text-sm line-clamp-2">{rec.description}</p>
                        {rec.admin_notes && (
                          <div className="mt-3 p-3 rounded-lg bg-brand-accent/10 border border-brand-accent/20">
                            <p className="text-xs font-medium text-brand-accent mb-1">Resposta da equipe:</p>
                            <p className="text-text-secondary text-sm">{rec.admin_notes}</p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

export function RecommendationButton() {
  const [isOpen, setIsOpen] = useState(false);
  if (!RECOMMENDATIONS_ENABLED) return null;
  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="border-brand-accent/50 text-brand-accent hover:bg-brand-accent/10 gap-2"
        size="sm"
      >
        <MessageCircle className="w-4 h-4" />
        Sugestões
      </Button>
      <RecommendationDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

/* ==================== PLAN ASSIGNMENT (Professional/Admin) ==================== */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PLAN_OPTIONS = [
  { value: 'free', label: 'Gratuito (Free)' },
  { value: 'pro', label: 'Pro - Mensal (R$ 24,90/mês)' },
  { value: 'enterprise', label: 'Enterprise - Anual/Black (R$ 184/ano)' },
];

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratuito',
  pro: 'Pro (Mensal)',
  enterprise: 'Enterprise (Anual/Black)',
};

function usePlanAssignments() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState('');

  const loadAssignments = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const res = await listPlanAssignments();
      setAssignments(res.items || []);
    } catch (err: any) {
      setListError(err.message || 'Erro ao carregar atribuições');
    } finally {
      setLoadingList(false);
    }
  }, []);

  return { assignments, loadingList, listError, loadAssignments };
}

function AssignmentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    applied: 'bg-green-500/20 text-green-400 border-green-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const labels: Record<string, string> = {
    pending: 'Pendente',
    applied: 'Aplicado',
    failed: 'Falhou',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}

function PlanAssignmentForm({ onAssigned }: { onAssigned?: () => void }) {
  const [identifier, setIdentifier] = useState('');
  const [planType, setPlanType] = useState('pro');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const raw = identifier.trim();
    if (!raw) return setError('Informe o email ou o ID do usuário');

    const isUuid = UUID_RE.test(raw);
    if (!isUuid && !raw.includes('@')) {
      return setError('Digite um email válido ou o ID do usuário');
    }

    setSubmitting(true);
    try {
      const payload = isUuid
        ? { target_user_id: raw, plan_type: planType, notes: notes.trim() || undefined }
        : { target_email: raw, plan_type: planType, notes: notes.trim() || undefined };
      await createPlanAssignment(payload);
      setIdentifier('');
      setNotes('');
      setPlanType('pro');
      setSuccess('Plano atribuído! O usuário recebe ao fazer login.');
      onAssigned?.();
    } catch (err: any) {
      setError(err.message || 'Erro ao atribuir plano');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Email ou ID do usuário</label>
        <input
          type="text"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          placeholder="usuario@exemplo.com ou 8daa73f5-..."
          className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all"
          required
        />
        <p className="text-[11px] text-text-muted mt-1.5">Cole o email de cadastro ou o ID (UUID) do perfil.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Plano a atribuir</label>
        <Select value={planType} onValueChange={setPlanType}>
          <SelectTrigger className="w-full bg-background border-border">
            <SelectValue placeholder="Selecione o plano" />
          </SelectTrigger>
          <SelectContent>
            {PLAN_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Observações (interno)</label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Motivo, campanha, etc."
          rows={2}
          className="bg-background border-border text-text-primary placeholder-text-muted focus:ring-brand-accent/50 focus:border-brand-accent"
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-brand-accent hover:opacity-90 text-background font-semibold py-3 rounded-xl transition-all"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Atribuindo...
          </>
        ) : (
          <>
            <UserPlus className="w-5 h-5 mr-2" />
            Atribuir Plano
          </>
        )}
      </Button>
    </form>
  );
}

function AssignmentHistory({ assignments, loadingList, listError, onRefresh }: {
  assignments: any[];
  loadingList: boolean;
  listError: string;
  onRefresh: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCancel = async (assignmentId: string) => {
    if (!window.confirm('Cancelar esta atribuição pendente?')) return;
    setDeletingId(assignmentId);
    try {
      await cancelPlanAssignment(assignmentId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar atribuição');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="pt-5 mt-5 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-text-primary font-alpino">Atribuições Recentes</h3>
        <Button onClick={onRefresh} variant="ghost" size="sm" className="text-text-muted hover:text-brand-accent h-8 px-2">
          <Loader2 className={`w-4 h-4 mr-1 ${loadingList ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {loadingList && assignments.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 text-brand-accent animate-spin" />
        </div>
      ) : listError ? (
        <p className="text-center py-4 text-red-400 text-sm">{listError}</p>
      ) : assignments.length === 0 ? (
        <div className="text-center py-6 text-text-muted">
          <CrownIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma atribuição feita ainda</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {assignments.map(a => (
            <div key={a.id} className="p-3.5 rounded-xl bg-background border border-border">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Mail className="w-4 h-4 text-brand-accent flex-shrink-0" />
                  <span className="font-semibold text-text-primary text-sm truncate">{a.target_email}</span>
                </div>
                <AssignmentStatusBadge status={a.status} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent border border-brand-accent/30 text-[11px] font-medium">
                  {PLAN_LABELS[a.plan_type] || a.plan_type}
                </span>
                <span className="text-text-muted text-[11px]">
                  {new Date(a.created_at).toLocaleDateString('pt-BR')}
                </span>
                {a.target_user_id && (
                  <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 text-[11px] font-medium">
                    ✓ {a.target_user_name || 'usuário'}
                  </span>
                )}
              </div>
              {a.notes && (
                <p className="mt-1.5 text-xs text-text-muted line-clamp-1">{a.notes}</p>
              )}
              {a.status === 'pending' && (
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancel(a.id)}
                    disabled={deletingId === a.id}
                    className="text-red-400 hover:bg-red-500/10 h-7 px-2"
                  >
                    {deletingId === a.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlanAssignmentDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { assignments, loadingList, listError, loadAssignments } = usePlanAssignments();

  useEffect(() => {
    if (!isOpen) return;
    loadAssignments();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, loadAssignments]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card-bg border border-border rounded-2xl font-urbanist shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border sticky top-0 bg-card-bg z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center shrink-0">
              <CrownIcon className="w-5 h-5 text-brand-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary font-alpino">Atribuir Plano</h2>
              <p className="text-text-secondary text-xs">O usuário recebe ao fazer login</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-2 rounded-lg hover:bg-brand-accent/10 transition-colors text-text-muted shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <PlanAssignmentForm onAssigned={loadAssignments} />
          <AssignmentHistory assignments={assignments} loadingList={loadingList} listError={listError} onRefresh={loadAssignments} />
        </div>
      </motion.div>
    </div>
  );
}

export function PlanAssignmentButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="border-brand-accent/50 text-brand-accent hover:bg-brand-accent/10 gap-2"
        size="sm"
      >
        <UserPlus className="w-4 h-4" />
        Atribuir Plano
      </Button>
      <PlanAssignmentDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export function PlanAssignmentPanel() {
  const { assignments, loadingList, listError, loadAssignments } = usePlanAssignments();

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  return (
    <Card className="bg-white/[0.03] border-white/[0.06] rounded-[20px] apple-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-[13px] font-semibold flex items-center gap-2" style={{ letterSpacing: '-0.022em' }}>
          <CrownIcon className="w-4 h-4 text-[#D4AF37]" />
          Atribuir Plano
        </CardTitle>
        <CardDescription className="text-[11px]">Por email ou ID • o usuário recebe ao logar</CardDescription>
      </CardHeader>
      <CardContent>
        <PlanAssignmentForm onAssigned={loadAssignments} />
        <AssignmentHistory assignments={assignments} loadingList={loadingList} listError={listError} onRefresh={loadAssignments} />
      </CardContent>
    </Card>
  );
}