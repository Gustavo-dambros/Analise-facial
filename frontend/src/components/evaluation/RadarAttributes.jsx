import { motion } from "framer-motion"
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const fallback12 = [
  { feature: "Terco Superior", score: 0 },
  { feature: "Terco Medio", score: 0 },
  { feature: "Terco Inferior", score: 0 },
  { feature: "Olhos", score: 0 },
  { feature: "Sobrancelhas", score: 0 },
  { feature: "Nariz", score: 0 },
  { feature: "Labios", score: 0 },
  { feature: "Mandibula", score: 0 },
  { feature: "Queixo", score: 0 },
  { feature: "Macas do Rosto", score: 0 },
  { feature: "Testa", score: 0 },
  { feature: "Formato do Rosto", score: 0 },
]

function CustomTooltip({ active, payload }) {
  if (active && payload?.length) {
    const d = payload[0].payload
    const raw = d.raw ?? Math.round(d.score / 10)
    return (
      <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-xl">
        <p className="font-medium text-text-primary">{d.feature}</p>
        <p className="text-brand-accent">{d.score}/100 <span className="text-text-muted">({raw}/10)</span></p>
      </div>
    )
  }
  return null
}

export default function RadarAttributes({ data }) {
  const chartData = data && data.length ? data : fallback12
  return (
    <motion.div
      initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
      animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="bg-card-bg border border-border rounded-2xl backdrop-blur-md">
        <CardHeader className="items-center pb-0">
          <CardTitle className="text-sm text-text-primary">Atributos Faciais (0-100)</CardTitle>
          <CardDescription className="text-xs text-text-secondary">Nota 1-10 convertida ×10 — domínio condizente com Overall</CardDescription>
        </CardHeader>
        <CardContent className="pb-0 pt-2 px-2 sm:px-6">
          <div className="w-full h-[260px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <PolarGrid
                  gridType="polygon"
                  stroke="rgba(211, 171, 57, 0.15)"
                />
                <PolarAngleAxis
                  dataKey="feature"
                  tick={{ fill: "#94a3b8", fontSize: 9, fontFamily: "inherit" }}
                  tickLine={false}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickCount={6} />
                <Radar
                  dataKey="score"
                  stroke="#d3ab39"
                  fill="#d3ab39"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
