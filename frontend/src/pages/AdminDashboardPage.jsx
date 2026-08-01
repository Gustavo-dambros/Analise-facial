"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
} from "@/components/ui/chart"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Users, DollarSign, Package, TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table"
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/page-transition"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const API_BASE = "/api/v1"

const COLORS = ["#d4a853", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#8b5cf6"]

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value)
}

function KPICard({ title, value, icon: Icon, trend, trendLabel, color = "text-brand-accent" }: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  trend?: number
  trendLabel?: string
  color?: string
}) {
  return (
    <Card className="bg-card-bg border border-border rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm text-text-secondary">{title}</CardTitle>
        <Icon className="w-5 h-5 text-text-muted" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end justify-between">
          <p className="text-3xl font-bold text-text-primary font-playfair">{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{Math.abs(trend)}%</span>
              {trendLabel && <span className="text-text-muted">{trendLabel}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function RevenueChart({ data }: { data: Array<{ date: string; value: number }> }) {
  if (!data.length) return <div className="h-64 flex items-center justify-center text-text-muted">Sem dados</div>

  return (
    <Card className="bg-card-bg border border-border rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm text-text-secondary">Receita por Período</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{ revenue: { label: "Receita", color: "hsl(var(--chart-1))" } }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis dataKey="date" stroke="#666" fontSize={11} tick={{ fill: "#888" }} />
              <YAxis stroke="#666" fontSize={11} tick={{ fill: "#888" }} tickFormatter={(v) => formatCurrency(v)} />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => [formatCurrency(value), "Receita"]} />}
              />
              <ChartLegend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function UserGrowthChart({ data }: { data: Array<{ date: string; value: number }> }) {
  if (!data.length) return <div className="h-64 flex items-center justify-center text-text-muted">Sem dados</div>

  return (
    <Card className="bg-card-bg border border-border rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm text-text-secondary">Crescimento de Usuários</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{ users: { label: "Novos Usuários", color: "hsl(var(--chart-2))" } }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis dataKey="date" stroke="#666" fontSize={11} tick={{ fill: "#888" }} />
              <YAxis stroke="#666" fontSize={11} tick={{ fill: "#888" }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => [formatNumber(value), "Usuários"]} />} />
              <ChartLegend />
              <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} maxBarWidth={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function ShippingStatusChart({ pending, in_transit, delivered, failed }: {
  pending: number
  in_transit: number
  delivered: number
  failed: number
}) {
  const data = [
    { name: "Pendente", value: pending, color: COLORS[1] },
    { name: "Em Trânsito", value: in_transit, color: COLORS[4] },
    { name: "Entregue", value: delivered, color: COLORS[2] },
    { name: "Falhou", value: failed, color: COLORS[3] },
  ].filter((d) => d.value > 0)

  if (!data.length) return <div className="h-64 flex items-center justify-center text-text-muted">Sem dados</div>

  return (
    <Card className="bg-card-bg border border-border rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm text-text-secondary">Status da Logística</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => [value, "Pedidos"]} />}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <ChartLegend className="mt-4" />
      </CardContent>
    </Card>
  )
}

function OrdersTable({ orders, loading }: { orders: any[]; loading: boolean }) {
  if (loading) return <div className="h-64 flex items-center justify-center text-text-muted">Carregando...</div>

  return (
    <Card className="bg-card-bg border border-border rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm text-text-secondary">Últimos Pedidos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="w-[140px]">Valor</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[140px]">Logística</TableHead>
              <TableHead className="w-[160px]">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.slice(0, 10).map((order) => (
              <TableRow key={order.id} className="border-border/50">
                <TableCell className="font-mono text-xs text-text-muted">{order.id.slice(0, 8)}</TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{order.user_name || order.user_email}</p>
                    <p className="text-xs text-text-muted">{order.user_email}</p>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{formatCurrency(order.amount)}</TableCell>
                <TableCell>
                  <Badge variant={
                    order.status === "paid" ? "default" :
                    order.status === "pending" ? "secondary" :
                    order.status === "cancelled" ? "destructive" : "outline"
                  }>
                    {order.status === "paid" ? "Pago" :
                     order.status === "pending" ? "Pendente" :
                     order.status === "cancelled" ? "Cancelado" : "Reembolsado"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {order.shipping_status && (
                    <Badge variant={
                      order.shipping_status === "delivered" ? "default" :
                      order.shipping_status === "in_transit" ? "secondary" :
                      order.shipping_status === "failed" ? "destructive" : "outline"
                    }>
                      {order.shipping_status === "delivered" ? "Entregue" :
                       order.shipping_status === "in_transit" ? "Em Trânsito" :
                       order.shipping_status === "pending" ? "Pendente" : "Falhou"}
                    </Badge>
                  )}
                  {!order.shipping_status && <span className="text-xs text-text-muted">Sem envio</span>}
                </TableCell>
                <TableCell className="text-xs text-text-muted">
                  {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
              </TableRow>
            ))}
            {!orders.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-text-muted">
                  Nenhum pedido encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function UsersTable({ users, loading }: { users: any[]; loading: boolean }) {
  if (loading) return <div className="h-64 flex items-center justify-center text-text-muted">Carregando...</div>

  return (
    <Card className="bg-card-bg border border-border rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm text-text-secondary">Últimos Usuários</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Usuário</TableHead>
              <TableHead className="w-[120px]">Pedidos</TableHead>
              <TableHead className="w-[140px]">Total Gasto</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[160px]">Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.slice(0, 10).map((user) => (
              <TableRow key={user.id} className="border-border/50">
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{user.full_name || user.email.split("@")[0]}</p>
                    <p className="text-xs text-text-muted">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{user.total_orders}</TableCell>
                <TableCell className="font-mono text-sm">{formatCurrency(user.total_spent)}</TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? "default" : "secondary"}>
                    {user.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-text-muted">
                  {format(new Date(user.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
              </TableRow>
            ))}
            {!users.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-text-muted">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function PeriodSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px] bg-card-bg border-border">
        <SelectValue placeholder="Período" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="today">Hoje</SelectItem>
        <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
        <SelectItem value="this_month">Mês Atual</SelectItem>
        <SelectItem value="last_month">Mês Anterior</SelectItem>
      </SelectContent>
    </Select>
  )
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState("this_month")
  const [kpis, setKpis] = useState<any>(null)
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [userData, setUserData] = useState<any[]>([])
  const [shippingData, setShippingData] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const headers = { Authorization: `Bearer ${token}` }

      const [kpisRes, revenueRes, userRes, shippingRes, ordersRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/admin/kpis?period=${period}`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/admin/charts/revenue?period=${period}`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/admin/charts/users?period=${period}`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/admin/charts/shipping`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/admin/orders?page_size=20`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/admin/users?page_size=20`, { headers }).then(r => r.json()),
      ])

      setKpis(kpisRes)
      setRevenueData(revenueRes.data || [])
      setUserData(userRes.data || [])
      setShippingData(shippingRes)
      setOrders(ordersRes.orders || [])
      setUsers(usersRes.users || [])
    } catch (err) {
      console.error("Erro ao buscar dados do admin:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === "admin") fetchData()
  }, [user, period])

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
            <p className="text-text-muted">Esta página é acessível apenas para administradores.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      <StaggerContainer>
        <FadeIn className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold font-playfair text-text-primary">Dashboard Administrativo</h1>
              <p className="text-sm text-text-muted mt-1">Visão geral de métricas, finanças e logística</p>
            </div>
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
        </FadeIn>

        {/* KPIs */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StaggerItem><KPICard title="Total de Usuários" value={kpis?.total_users ? formatNumber(kpis.total_users) : "—"} icon={Users} trend={0} trendLabel="vs mês anterior" /></StaggerItem>
          <StaggerItem><KPICard title="Receita Total" value={kpis?.total_revenue ? formatCurrency(kpis.total_revenue) : "—"} icon={DollarSign} trend={kpis?.revenue_this_month && kpis?.revenue_last_7_days ? Math.round(((kpis.revenue_this_month - kpis.revenue_last_7_days) / kpis.revenue_last_7_days) * 100) : 0} trendLabel="vs 7 dias" /></StaggerItem>
          <StaggerItem><KPICard title="Pedidos Pendentes" value={kpis?.pending_orders || 0} icon={Package} color="text-yellow-400" /></StaggerItem>
          <StaggerItem><KPICard title="Entregues" value={kpis?.delivered_orders || 0} icon={TrendingUp} color="text-green-400" /></StaggerItem>
        </StaggerContainer>

        {/* Charts */}
        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <StaggerItem><RevenueChart data={revenueData} /></StaggerItem>
          <StaggerItem><UserGrowthChart data={userData} /></StaggerItem>
        </StaggerContainer>

        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <StaggerItem className="lg:col-span-1"><ShippingStatusChart {...shippingData} /></StaggerItem>
        </StaggerContainer>

        {/* Tables */}
        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StaggerItem><OrdersTable orders={orders} loading={loading} /></StaggerItem>
          <StaggerItem><UsersTable users={users} loading={loading} /></StaggerItem>
        </StaggerContainer>
      </StaggerContainer>
    </div>
  )
}