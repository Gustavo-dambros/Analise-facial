import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function attributeLabel(score) {
  if (score <= 3) return "Ok";
  if (score <= 6) return "Bom";
  return "Otimo";
}

function labelColor(label) {
  if (label === "Otimo") return "text-emerald-400";
  if (label === "Bom") return "text-brand-accent";
  return "text-yellow-400";
}

export default function AttributeTable({ attributes = {}, overall = 0 }) {
  const entries = Object.entries(attributes);

  if (!entries.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="bg-card-bg border border-border rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-text-primary">
            Atributos Faciais
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {entries.map(([name, score]) => {
              const label = attributeLabel(score);
              return (
                <div
                  key={name}
                  className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 xs:gap-2 py-2.5 px-3 rounded-xl bg-white/[0.02] border border-border/40 hover:border-brand-accent/20 transition-colors min-w-0"
                >
                  <span className="text-sm text-text-primary xs:min-w-[120px] truncate pr-2">
                    {name}
                  </span>
                  <div className="flex items-center justify-between xs:justify-end gap-3 w-full xs:w-auto shrink-0">
                    <span className={`text-xs sm:text-sm font-semibold ${labelColor(label)}`}>
                      {label}
                    </span>
                    <span className="text-sm font-bold text-brand-accent min-w-[40px] text-right">
                      {score}/10
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}