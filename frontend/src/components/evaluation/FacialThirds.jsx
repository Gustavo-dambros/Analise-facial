import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

const defaultThirds = [
  { label: "Terço Superior (Testa)", value: 0 },
  { label: "Terço Médio (Nariz)", value: 0 },
  { label: "Terço Inferior (Mandíbula)", value: 0 },
]

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1']

function CustomTooltip({ active, payload }) {
  if (active && payload?.length) {
    const d = payload[0].payload
    return (
      <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-xl">
        <p className="font-medium text-text-primary">{d.label}</p>
        <p className="text-brand-accent">{d.value}%</p>
      </div>
    )
  }
  return null
}

export default function FacialThirds({ thirds = defaultThirds }) {
  const total = thirds.reduce((sum, item) => sum + Number(item.value || 0), 0)
  const normalizedThirds = total === 100
    ? thirds.map(item => ({ ...item, value: Number(item.value) }))
    : total > 0
      ? thirds.map(item => ({ ...item, value: Number(item.value) }))
      : defaultThirds
  const isValid = total === 100

  return (
    <motion.div
      initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
      animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="bg-card-bg border border-border rounded-2xl backdrop-blur-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-text-primary">Proporção dos Terços Faciais</CardTitle>
            <span className={`text-xs font-medium ${isValid ? 'text-green-400' : 'text-yellow-400'}`}>
              Soma: {total}% {isValid ? '✓' : '(deve ser 100%)'}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">Seção separada: mede como o rosto é dividido (soma exata 100%). Ideal ~33% cada.</p>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <ResponsiveContainer width="100%" height={220} className="sm:!h-[250px]">
            <PieChart>
              <Pie
                data={normalizedThirds}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                labelLine={false}
                label={({ value }) => `${value}%`}
              >
                {normalizedThirds.map((entry, index) => (
                  <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-col xs:flex-row xs:justify-between gap-1.5 text-xs text-text-secondary">
            {normalizedThirds.map((item, index) => (
              <div key={item.label} className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate">{item.label}: {item.value}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
