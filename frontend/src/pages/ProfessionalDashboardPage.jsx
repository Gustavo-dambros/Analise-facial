// Apple UI Design System – Verified: 8pt Grid, SF Typography, Material-Depth, Natural Spring Motion
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { LogOut, ScanFace, ClipboardList, Users, Clock, ChevronRight, Loader2, BarChart3, Crown, Search, Bell, Filter, ArrowUpRight, Activity, Zap, Eye, Trash2, Edit2, ChevronLeft, MessageCircle, Crown as CrownIcon, Mail, Plus, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RecommendationButton, PlanAssignmentButton, PlanAssignmentPanel } from '@/components/recommendation/RecommendationDialog';
import { AdminRecommendationsView } from '@/components/recommendation/AdminRecommendationsView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function ProfessionalDashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [pendingAnalyses, setPendingAnalyses] = useState([]);
  const [allAnalyses, setAllAnalyses] = useState([]);
  const [stats, setStats] = useState({ pending: 0, completed: 0, total: 0, today: 0 });
  const [loading, setLoading] = useState(true);
  const [chartRows, setChartRows] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => { fetchAnalyses(); }, []);

  const hourlyData = useMemo(() => {
    const counts = Array(24).fill(0);
    chartRows.forEach(r => { const d = new Date(r.created_at); if (!isNaN(d)) counts[d.getHours()]++; });
    return counts.map((v, h) => ({ hour: `${h}h`, count: v }));
  }, [chartRows]);

  const planData = useMemo(() => {
    const map = { free: 0, pro: 0, enterprise: 0 };
    chartRows.forEach(r => {
      const plan = (r.profiles?.plan || 'free').toLowerCase();
      if (plan.includes('annual') || plan.includes('black') || plan === 'enterprise') map.enterprise++;
      else if (plan.includes('monthly') || plan === 'pro') map.pro++;
      else map.free++;
    });
    return [
      { plano: 'Gratuito', total: map.free },
      { plano: 'Pro', total: map.pro },
      { plano: 'Enterprise', total: map.enterprise },
    ];
  }, [chartRows]);

  const filtered = useMemo(() => {
    let rows = allAnalyses.length ? allAnalyses : pendingAnalyses;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => (r.profiles?.full_name || 'Cliente').toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') rows = rows.filter(r => r.status === statusFilter);
    return rows;
  }, [allAnalyses, pendingAnalyses, search, statusFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const fetchAnalyses = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [{ data: pending }, { count: completedCount }, { count: totalCount }, { data: all }] = await Promise.all([
        supabase.from('analyses').select('*, profiles:user_id(full_name, avatar_url)').eq('status', 'pending').order('created_at', { ascending: false }).limit(50),
        supabase.from('analyses').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('analyses').select('*', { count: 'exact', head: true }),
        supabase.from('analyses').select('*, profiles:user_id(full_name, plan)').order('created_at', { ascending: false }).limit(100),
      ]);
      setPendingAnalyses(pending || []);
      setAllAnalyses(all || pending || []);
      const today = (all || []).filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()).length;
      setStats({ pending: pending?.length || 0, completed: completedCount || 0, total: totalCount || 0, today });
      try {
        const { data: rows } = await supabase.from('analyses').select('created_at, profiles:user_id(plan)').order('created_at', { ascending: false }).limit(1000);
        setChartRows(rows || []);
      } catch {}
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleLogout = async () => { await signOut(); navigate('/professional/login'); };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--';

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header — Apple glass + 8pt */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] apple-material" style={{ background: 'rgba(10,10,10,0.72)', backdropFilter: 'blur(20px) saturate(180%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
              <ScanFace className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-[13px] font-semibold leading-none" style={{ letterSpacing: '-0.022em' }}>FaceMax Professional</h1>
              <p className="text-[11px] text-white/40">{user?.role === 'admin' ? 'Administrador' : 'Especialista'}</p>
            </div>
          </div>

          <div className="flex-1 max-w-md hidden md:flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input placeholder="Buscar por cliente ou ID" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-9 pl-9 rounded-full bg-white/[0.06] border-white/10 text-[13px] apple-focus" />
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')} className={`h-9 px-3 rounded-full border text-xs font-medium apple-transition ${statusFilter === 'pending' ? 'bg-[#D4AF37] text-black border-transparent' : 'bg-white/[0.06] border-white/10 text-white/60 hover:text-white'}`}>
                <Filter className="w-3 h-3 inline mr-1" /> Pendentes
              </button>
            </div>
          </div>

<div className="flex items-center gap-2 ml-auto">
              <RecommendationButton />
              <PlanAssignmentButton />
              <button className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center hover:bg-white/[0.08] apple-transition">
                <Bell className="w-4 h-4 text-white/60" />
              </button>
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[12px] font-medium leading-none">{user?.email}</span>
                <span className="text-[11px] text-white/40">Online</span>
              </div>
              <button onClick={handleLogout} className="h-9 px-3 rounded-full border border-white/10 text-white/60 hover:text-white text-xs apple-transition">Sair</button>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* 4 KPIs — 8pt grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pendentes', value: stats.pending, sub: 'Aguardando laudo', icon: ClipboardList, trend: '+12%', color: 'text-[#D4AF37]' },
            { label: 'Concluídas', value: stats.completed, sub: 'Laudos entregues', icon: ScanFace, trend: '+8%' },
            { label: 'Total', value: stats.total, sub: 'No sistema', icon: Users, trend: '+5%' },
            { label: 'Hoje', value: stats.today, sub: 'Envios hoje', icon: Activity, trend: '+3%' },
          ].map(k => (
            <Card key={k.label} className="bg-white/[0.04] border-white/[0.06] backdrop-blur rounded-[20px] apple-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
                    <k.icon className={`w-4 h-4 ${k.color || 'text-white/60'}`} />
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{k.trend}</span>
                </div>
                <p className="mt-3 text-2xl font-semibold" style={{ letterSpacing: '-0.022em' }}>{loading ? '--' : k.value}</p>
                <p className="text-[12px] font-medium text-white/80">{k.label}</p>
                <p className="text-[11px] text-white/30">{k.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card className="bg-white/[0.04] border-white/[0.06] rounded-[20px] apple-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] font-semibold" style={{ letterSpacing: '-0.022em' }}>Horários das Avaliações</CardTitle>
              <CardDescription className="text-[11px]">Distribuição por hora (0-23h)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="hour" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} interval={3} />
                    <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px' }} formatter={(v) => [v, 'Envios']} />
                    <Bar dataKey="count" fill="#D4AF37" radius={[8,8,0,0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.04] border-white/[0.06] rounded-[20px] apple-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] font-semibold" style={{ letterSpacing: '-0.022em' }}>Avaliações por Plano</CardTitle>
              <CardDescription className="text-[11px]">Gratuito / Pro / Enterprise</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planData} layout="vertical" margin={{ top: 4, right: 12, left: 32, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="plano" stroke="#e5e7eb" fontSize={11} tickLine={false} axisLine={false} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} formatter={(v) => [v, 'Avaliações']} />
                    <Bar dataKey="total" fill="#D4AF37" radius={[0,8,8,0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Tabela central */}
          <Card className="bg-white/[0.03] border-white/[0.06] rounded-[20px] apple-card overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-[13px] font-semibold" style={{ letterSpacing: '-0.022em' }}>Fila de Avaliação</CardTitle>
                  <CardDescription className="text-[11px]">{filtered.length} itens • página {page}/{totalPages}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative md:hidden flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <Input placeholder="Buscar" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-9 pl-9 rounded-full bg-white/[0.06] border-white/10 text-xs" />
                  </div>
                  <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="h-9 rounded-full bg-white/[0.06] border border-white/10 px-3 text-xs text-white">
                    <option value="all" className="bg-[#0A0A0A]">Todos</option>
                    <option value="pending" className="bg-[#0A0A0A]">Pendentes</option>
                    <option value="completed" className="bg-[#0A0A0A]">Concluídos</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-[11px] tracking-widest uppercase text-white/40">Cliente</TableHead>
                      <TableHead className="text-[11px] tracking-widest uppercase text-white/40">Enviado</TableHead>
                      <TableHead className="text-[11px] tracking-widest uppercase text-white/40">Status</TableHead>
                      <TableHead className="text-right text-[11px] tracking-widest uppercase text-white/40">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i} className="border-white/[0.04]">
                          <TableCell colSpan={4}><div className="h-12 rounded-xl bg-white/[0.04] animate-pulse" /></TableCell>
                        </TableRow>
                      ))
                    ) : paginated.length === 0 ? (
                      <TableRow className="border-white/[0.04]">
                        <TableCell colSpan={4} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center"><Clock className="w-5 h-5 text-white/30" /></div>
                            <p className="text-sm font-medium text-white">Nenhum item encontrado</p>
                            <p className="text-xs text-white/40">Tente ajustar busca ou filtros.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map(row => (
                        <TableRow key={row.id} className="border-white/[0.04] hover:bg-white/[0.03]">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                                {row.photo_front_url ? <img src={row.photo_front_url} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center"><ScanFace className="w-4 h-4 text-white/30" /></span>}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-white truncate" style={{ letterSpacing: '-0.011em' }}>{row.profiles?.full_name || 'Cliente'}</p>
                                <p className="text-[11px] text-white/30 truncate">{row.id.slice(0, 8)} • {row.profiles?.plan || 'free'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-white/60">{formatDate(row.created_at)}</TableCell>
                          <TableCell>
                            <Badge className={`rounded-full text-[11px] ${row.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{row.status === 'pending' ? 'Pendente' : 'Concluído'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/professional/dashboard/evaluate/${row.id}`)} className="h-8 w-8 p-0 rounded-full hover:bg-white/[0.06]"><Eye className="w-3.5 h-3.5" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/professional/dashboard/evaluate/${row.id}`)} className="h-8 w-8 p-0 rounded-full hover:bg-white/[0.06] hidden sm:inline-flex"><Edit2 className="w-3.5 h-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-red-500/10 text-white/40 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between p-3 border-t border-white/[0.06]">
                <p className="text-[11px] text-white/30">{filtered.length} resultados</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-8 w-8 p-0 rounded-full bg-white/[0.04] border-white/10"><ChevronLeft className="w-4 h-4" /></Button>
                  <span className="text-xs text-white/60 px-2">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-8 w-8 p-0 rounded-full bg-white/[0.04] border-white/10"><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Painel secundário */}
          <div className="space-y-4">
            <Card className="bg-white/[0.04] border-white/[0.06] rounded-[20px] apple-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-[13px] font-semibold flex items-center gap-2" style={{ letterSpacing: '-0.022em' }}><Activity className="w-4 h-4 text-[#D4AF37]" /> Atividade recente</CardTitle>
                <CardDescription className="text-[11px]">Últimos envios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {allAnalyses.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5 text-white/40" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">{r.profiles?.full_name || 'Cliente'}</p>
                      <p className="text-[11px] text-white/30">{formatDate(r.created_at)} • {r.status}</p>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${r.status === 'pending' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  </div>
                ))}
                {allAnalyses.length === 0 && <p className="text-xs text-white/30 text-center py-6">Sem atividade</p>}
              </CardContent>
            </Card>

            <Card className="bg-[#D4AF37] border-0 rounded-[20px] apple-card text-black">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <p className="text-[13px] font-semibold">Ações rápidas</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button onClick={() => navigate('/professional/dashboard')} className="h-9 rounded-full bg-black text-white text-xs font-medium hover:bg-black/80">Ver fila</Button>
                  <Button onClick={() => window.location.reload()} variant="outline" className="h-9 rounded-full bg-white/80 text-black border-black/10 text-xs">Atualizar</Button>
                </div>
                <p className="text-[11px] text-black/60 mt-2">Ergonomia: tudo a 1 clique, sem poluição.</p>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.03] border-white/[0.06] rounded-[20px]">
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-white/40">Dica</p>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">Use a busca para filtrar por nome ou ID. Combine com filtro de status para alta densidade sem poluição.</p>
              </CardContent>
            </Card>
            {/* Plan Assignment Panel */}
            <PlanAssignmentPanel />
            {/* Recomendações dos Clientes */}
            <AdminRecommendationsView />
          </div>
        </div>
      </main>
    </div>
  );
}
