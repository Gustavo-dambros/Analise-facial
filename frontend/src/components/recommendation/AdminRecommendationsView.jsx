import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle, Bug, Lightbulb, Layout, DollarSign, HelpCircle,
  Loader2, ChevronDown, ChevronUp, Filter, X, Edit2, Eye,
  AlertCircle, CheckCircle, Clock, User
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { listAllRecommendations, updateRecommendation } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente', icon: Clock },
  { value: 'reviewed', label: 'Em análise', icon: Eye },
  { value: 'implemented', label: 'Implementado', icon: CheckCircle },
  { value: 'rejected', label: 'Não aceito', icon: X },
];

const CATEGORIES = [
  { value: 'feature', label: 'Nova funcionalidade', icon: Lightbulb },
  { value: 'bug', label: 'Reportar bug', icon: Bug },
  { value: 'ux', label: 'Experiência/Design', icon: Layout },
  { value: 'pricing', label: 'Preços/Planos', icon: DollarSign },
  { value: 'other', label: 'Outro', icon: HelpCircle },
];

export function AdminRecommendationsView() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const limit = 20;

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listAllRecommendations(limit, (page - 1) * limit, statusFilter || undefined);
      setRecommendations(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(Math.max(1, Math.ceil((res.total || 0) / limit)));
    } catch (err) {
      setError(err.message || 'Erro ao carregar recomendações');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchRecommendations(); }, [fetchRecommendations]);

  const getStatusConfig = (status) => {
    const configs = {
      pending: { label: 'Pendente', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
      reviewed: { label: 'Em análise', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Eye },
      implemented: { label: 'Implementado', class: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
      rejected: { label: 'Não aceito', class: 'bg-red-500/20 text-red-400 border-red-500/30', icon: X },
    };
    return configs[status] || configs.pending;
  };

  const getCategoryIcon = (cat) => {
    const c = CATEGORIES.find(x => x.value === cat);
    return c ? <c.icon className="w-3 h-3" /> : <HelpCircle className="w-3 h-3" />;
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleEditClick = (rec) => {
    setEditingId(rec.id);
    setEditStatus(rec.status);
    setEditNotes(rec.admin_notes || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditStatus('');
    setEditNotes('');
  };

  const handleSaveEdit = async (recId) => {
    setSubmitting(true);
    try {
      await updateRecommendation(recId, { status: editStatus, admin_notes: editNotes });
      setRecommendations(prev => prev.map(r => r.id === recId ? { ...r, status: editStatus, admin_notes: editNotes } : r));
      setEditingId(null);
      setEditStatus('');
      setEditNotes('');
    } catch (err) {
      alert(err.message || 'Erro ao atualizar');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'professional')) {
    return (
      <Card className="bg-white/[0.03] border-white/[0.06] rounded-[20px]">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/60">Acesso restrito a administradores e profissionais</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/[0.03] border-white/[0.06] rounded-[20px] apple-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-[13px] font-semibold flex items-center gap-2" style={{ letterSpacing: '-0.022em' }}>
              <MessageCircle className="w-4 h-4 text-[#D4AF37]" />
              Recomendações dos Clientes
            </CardTitle>
            <CardDescription className="text-[11px]">{total} total • {recommendations.length} nesta página</CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[180px] h-9 rounded-full bg-white/[0.06] border-white/10">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading && !recommendations.length ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchRecommendations} className="mt-2">Tentar novamente</Button>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="p-8 text-center text-white/40">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma recomendação encontrada</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left p-3 text-[11px] tracking-widest uppercase text-white/40">Cliente</th>
                    <th className="text-left p-3 text-[11px] tracking-widest uppercase text-white/40">Categoria</th>
                    <th className="text-left p-3 text-[11px] tracking-widest uppercase text-white/40">Título</th>
                    <th className="text-left p-3 text-[11px] tracking-widest uppercase text-white/40">Status</th>
                    <th className="text-left p-3 text-[11px] tracking-widest uppercase text-white/40">Data</th>
                    <th className="text-right p-3 text-[11px] tracking-widest uppercase text-white/40">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.map(rec => {
                    const statusConfig = getStatusConfig(rec.status);
                    const StatusIcon = statusConfig.icon;
                    const isEditing = editingId === rec.id;
                    const mainRow = (
                      <tr key={rec.id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5 text-white/40" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-white truncate" style={{ letterSpacing: '-0.011em' }}>
                                {rec.user?.full_name || 'Cliente'}
                              </p>
                              <p className="text-[11px] text-white/30 truncate">{rec.user?.email || 'Sem email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-medium flex items-center gap-1">
                            {getCategoryIcon(rec.category)}
                            {CATEGORIES.find(c => c.value === rec.category)?.label || rec.category}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs">
                          <p className="text-[13px] font-medium text-white truncate" style={{ letterSpacing: '-0.011em' }}>{rec.title}</p>
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <Select value={editStatus} onValueChange={setEditStatus}>
                              <SelectTrigger className="w-[140px] h-8 rounded-full bg-white/[0.06] border-white/10">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center gap-2">
                                      <opt.icon className="w-4 h-4" />
                                      {opt.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={`rounded-full text-[11px] ${statusConfig.class}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-xs text-white/60">
                          {new Date(rec.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 p-0 rounded-full hover:bg-white/[0.06] text-white/60 hover:text-white">
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" onClick={() => handleSaveEdit(rec.id)} disabled={submitting} className="h-8 w-8 p-0 rounded-full bg-[#D4AF37] text-black hover:opacity-90">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => handleEditClick(rec)} className="h-8 w-8 p-0 rounded-full hover:bg-white/[0.06] text-white/60 hover:text-white">
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td></tr>
                      );
                    const editRow = isEditing ? (
                      <tr key={`${rec.id}-edit`} className="bg-white/[0.02]">
                        <td colSpan={6} className="p-4">
                          <div className="space-y-3">
                            <Textarea
                              value={editNotes}
                              onChange={e => setEditNotes(e.target.value)}
                              placeholder="Notas da equipe (interno)..."
                              rows={3}
                              className="w-full bg-white/[0.04] border-white/10 text-white placeholder-white/30 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]"
                            />
                            {rec.description && (
                              <p className="text-xs text-white/40">
                                <strong>Descrição original:</strong> {rec.description}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null;
                    return isEditing ? [mainRow, editRow] : mainRow;
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between p-3 border-t border-white/[0.06]">
              <p className="text-[11px] text-white/30">Página {page} de {totalPages} • {total} resultados</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-8 w-8 p-0 rounded-full bg-white/[0.04] border-white/10">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-8 w-8 p-0 rounded-full bg-white/[0.04] border-white/10">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}