import { motion } from "framer-motion"
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  PolarRadiusAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const CATEGORY_SCORES = {
  'Excelente': 90,
  'Bom': 70,
  'Regular': 50,
  'Ajustável': 35,
}

function CustomTooltip({ active, payload }) {
  if (active && payload?.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-xl">
        <p className="font-medium text-text-primary">{data.feature}</p>
        <p className="text-brand-accent">{data.label}: {data.score}/100</p>
      </div>
    )
  }
  return null
}

export default function BodyRadarChart({ bodyEvaluation }) {
  if (!bodyEvaluation) return null

  const data = [
    {
      feature: "Geral",
      score: Math.max(0, Math.min(100, Number(bodyEvaluation.score) || 0)),
      label: `${Number(bodyEvaluation.score) || 0}/100`,
    },
    {
      feature: "Postura",
      score: CATEGORY_SCORES[bodyEvaluation.postura] || 50,
      label: bodyEvaluation.postura,
    },
    {
      feature: "Proporção",
      score: CATEGORY_SCORES[bodyEvaluation.proporcao] || 50,
      label: bodyEvaluation.proporcao,
    },
    {
      feature: "Simetria",
      score: CATEGORY_SCORES[bodyEvaluation.simetria] || 50,
      label: bodyEvaluation.simetria,
    },
    {
      feature: "Definição",
      score: CATEGORY_SCORES[bodyEvaluation.definicao] || 50,
      label: bodyEvaluation.definicao,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
      animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="bg-card-bg border border-border rounded-2xl backdrop-blur-md">
        <CardHeader className="items-center pb-0">
          <CardTitle className="text-sm text-text-primary">Avaliação do Físico</CardTitle>
          <CardDescription className="text-xs text-text-secondary">
            Geral: <span className="text-brand-accent font-bold">{data[0].score}/100</span> • 5 eixos 0-100 (categorias mapeadas: Excelente 90, Bom 70, Regular 50, Ajustável 35)
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-0 pt-2 px-2 sm:px-6">
          <div className="w-full h-[260px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <PolarGrid
                  gridType="polygon"
                  stroke="rgba(211, 171, 57, 0.15)"
                />
                <PolarAngleAxis
                  dataKey="feature"
                  tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "inherit" }}
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
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 pb-4 pt-2">
            {data.map((item) => (
              <div key={item.feature} className="flex items-center justify-between gap-2 text-xs min-w-0">
                <span className="text-text-muted truncate">{item.feature}</span>
                <span className="text-brand-accent font-medium shrink-0">{item.label} ({item.score})</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
