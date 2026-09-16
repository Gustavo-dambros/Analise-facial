import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Send, MessageCircle, Star, Bug, Lightbulb, Layout,
  DollarSign, HelpCircle, CheckCircle, AlertCircle,
  Loader2, X, ChevronDown, UserPlus, CheckCircle2,
  Mail, Crown as CrownIcon, Plus
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createRecommendation, listMyRecommendations, createPlanAssignment, listPlanAssignments } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Toast removed - using inline notifications instead

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
    <ToastProvider>
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
    </ToastProvider>
  );
}

export function RecommendationButton() {
  const [isOpen, setIsOpen] = useState(false);
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

/* ==================== PLAN ASSIGNMENT PANEL (Professional/Admin) ==================== */

export function PlanAssignmentPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [planType, setPlanType] = useState('pro');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadAssignments = async () => {
    setLoadingList(true);
    try {
      const res = await listPlanAssignments();
      setAssignments(res.items || []);
    } catch {
      showToast('error', 'Erro ao carregar atribuições');
    } finally {
      setLoadingList(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Email é obrigatório');

    setSubmitting(true);
    try {
      await createPlanAssignment({ target_email: email.trim(), plan_type: planType, notes: notes.trim() });
      setEmail('');
      setNotes('');
      setPlanType('pro');
      loadAssignments();
      showToast('success', 'Plano atribuído! O usuário receberá ao fazer login.');
    } catch (err: any) {
      setError(err.message || 'Erro ao atribuir plano');
      showToast('error', err.message || 'Erro ao atribuir plano');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
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
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      free: 'Gratuito',
      pro: 'Pro (Mensal)',
      enterprise: 'Enterprise (Anual/Black)',
    };
    return labels[plan] || plan;
  };

  if (!isOpen && !assignments.length && !loadingList) {
    // Render button only
    return (
      <>
        <Button
          onClick={() => { setIsOpen(true); loadAssignments(); }}
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

  return (
    <ToastProvider>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsOpen(false)}
      >
        <motion.div
          className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-card-bg border border-border rounded-2xl font-urbanist"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center">
                <CrownIcon className="w-5 h-5 text-brand-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary font-alpino">Atribuir Plano por Email</h2>
                <p className="text-text-secondary text-xs">O usuário receberá o plano ao fazer login no FaceMax</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-brand-accent/10 transition-colors text-text-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

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
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <span className="text-sm font-medium">{toast.message}</span>
              <button onClick={() => setToast(null)} className="ml-auto p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
            </motion.div>
          )}

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Email do Usuário</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@exemplo.com"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Plano</label>
                <Select value={planType} onValueChange={setPlanType}>
                  <SelectTrigger className="w-full bg-background border-border">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Gratuito (Free)</SelectItem>
                    <SelectItem value="pro">Pro - Mensal (R$ 24,90/mês)</SelectItem>
                    <SelectItem value="enterprise">Enterprise - Anual/Black (R$ 184/ano)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Observações (interno)</label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Motivo, campanha, etc."
                  rows={3}
                  className="bg-background border-border text-text-primary placeholder-text-muted focus:ring-brand-accent/50 focus:border-brand-accent"
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
                      Atribuindo...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Atribuir Plano
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => { loadAssignments(); }}
                  variant="outline"
                  className="flex-1 border-brand-accent/50 text-brand-accent hover:bg-brand-accent/10 py-3 rounded-xl"
                >
                  Atualizar Lista
                </Button>
              </div>
            </form>

            <div className="pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-text-primary font-alpino">Atribuições Recentes</h3>
                <Button onClick={loadAssignments} variant="ghost" size="sm" className="text-text-muted hover:text-brand-accent">
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                </Button>
              </div>

              {loadingList ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-brand-accent animate-spin" />
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <CrownIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhuma atribuição feita ainda</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {assignments.map(a => (
                    <motion.div
                      key={a.id}
                      className="p-4 rounded-xl bg-background border border-border"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Mail className="w-4 h-4 text-brand-accent flex-shrink-0" />
                          <span className="font-semibold text-text-primary truncate">{a.target_email}</span>
                          {getStatusBadge(a.status)}
                        </div>
                        <span className="text-text-muted text-xs whitespace-nowrap">
                          {new Date(a.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent border border-brand-accent/30 text-[11px] font-medium">
                          {getPlanLabel(a.plan_type)}
                        </span>
                        {a.target_user_id && (
                          <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 text-[11px] font-medium">
                            ✓ Aplicado para {a.target_user_name || 'usuário'}
                          </span>
                        )}
                      </div>
                      {a.notes && (
                        <p className="mt-2 text-xs text-text-muted line-clamp-1">{a.notes}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </ToastProvider>
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