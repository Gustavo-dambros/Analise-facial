import { useState } from 'react';
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Calendar } from 'lucide-react';

const DAYS = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];

const STORAGE_KEY = 'facemax_completed_exercises';

function loadCompleted() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCompleted(completed) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
}

export default function WeeklyRoutineTable({ exercises = {} }) {
  const [completed, setCompleted] = useState(loadCompleted);

  const hasContent = DAYS.some(
    (day) =>
      exercises[day]?.general?.length > 0 ||
      exercises[day]?.facial?.length > 0
  );

  if (!hasContent) return null;

  const toggle = (day, type, idx) => {
    const key = `${day}_${type}_${idx}`;
    setCompleted((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCompleted(next);
      return next;
    });
  };

  const completedCount = Object.values(completed).filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="bg-card-bg border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
<div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-accent" />
              <h3 className="text-sm font-semibold text-text-primary">Rotina Semanal</h3>
            </div>
            <span className="text-xs text-text-muted">
              {completedCount} concluidos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-3 text-left text-xs text-text-muted font-medium w-32">Dia</th>
                  <th className="py-2 px-3 text-left text-xs text-text-muted font-medium">Exercícios Gerais</th>
                  <th className="py-2 px-3 text-left text-xs text-text-muted font-medium">Exercícios Faciais</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => {
                const general = exercises[day]?.general || [];
                const facial = exercises[day]?.facial || [];
                if (general.length === 0 && facial.length === 0) return null;

                return (
                  <tr key={day} className="border-b border-border/50 hover:bg-white/[0.01]">
                    <td className="py-2.5 px-3 font-medium text-text-primary text-xs">{day}</td>
                    <td className="py-2.5 px-3">
                      {general.length > 0 ? (
                        <ul className="space-y-1">
                          {general.map((ex, idx) => {
                            const key = `${day}_general_${idx}`;
                            const isDone = completed[key];
                            return (
                              <li key={idx} className="flex items-center gap-2 text-xs">
                                <button
                                  onClick={() => toggle(day, 'general', idx)}
                                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                    isDone
                                      ? 'bg-emerald-400 border-emerald-400 text-white'
                                      : 'border-border hover:border-brand-accent/50'
                                  }`}
                                >
                                  {isDone && <CheckCircle2 className="w-3 h-3" />}
                                </button>
                                <span className={isDone ? 'text-text-muted line-through' : 'text-text-primary'}>
                                  {ex}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <span className="text-xs text-text-muted">--</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {facial.length > 0 ? (
                        <ul className="space-y-1">
                          {facial.map((ex, i) => {
                            const key = `${day}_facial_${i}`;
                            const isDone = completed[key];
                            return (
                              <li key={i} className="flex items-center gap-2 text-xs">
                                <button
                                  onClick={() => toggle(day, 'facial', i)}
                                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                    isDone
                                      ? 'bg-emerald-400 border-emerald-400 text-white'
                                      : 'border-border hover:border-brand-accent/50'
                                  }`}
                                >
                                  {isDone && <CheckCircle2 className="w-3 h-3" />}
                                </button>
                                <span className={isDone ? 'text-text-muted line-through' : 'text-text-primary'}>
                                  {ex}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="text-xs text-text-muted">--</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}