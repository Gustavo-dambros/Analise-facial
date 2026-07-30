import { useState } from 'react';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

const DAYS = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];

export default function WeeklyRoutineEditor({ userId, initialExercises }) {
  const [exercises, setExercises] = useState(() => {
    const initial = {};
    DAYS.forEach((day) => {
      initial[day] = {
        general: initialExercises?.[day]?.general || [],
        facial: initialExercises?.[day]?.facial || [],
      };
    });
    return initial;
  });
  const [dayInputs, setDayInputs] = useState(() => {
    const inputs = {};
    DAYS.forEach((day) => {
      inputs[day] = {
        general: (initialExercises?.[day]?.general || []).join('; '),
        facial: (initialExercises?.[day]?.facial || []).join('; '),
      };
    });
    return inputs;
  });
  const [saving, setSaving] = useState(false);

  const handleInputChange = (day, type, value) => {
    setDayInputs((prev) => ({
      ...prev,
      [day]: { ...prev[day], [type]: value },
    }));
    const items = value
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    setExercises((prev) => ({
      ...prev,
      [day]: { ...prev[day], [type]: items },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: existing, error: fetchError } = await supabase
        .from('weekly_routines')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('weekly_routines')
          .update({ exercises })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('weekly_routines')
          .insert({ user_id: userId, exercises });
        if (error) throw error;
      }

      toast.success('Rotina semanal salva!');
    } catch (err) {
      toast.error('Erro ao salvar rotina.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-secondary">Exercicios Semanais</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-accent text-background font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Rotina
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAYS.map((day) => (
          <div
            key={day}
            className="rounded-xl border border-border bg-white/[0.02] p-4 space-y-3"
          >
            <h3 className="text-sm font-bold text-brand-accent">{day}</h3>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-text-muted">Exercicios Gerais</Label>
              <Input
                placeholder="ex: corrida; abdominal; alongamento"
                value={dayInputs[day]?.general || ''}
                onChange={(e) => handleInputChange(day, 'general', e.target.value)}
              />
              {exercises[day]?.general?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {exercises[day].general.map((ex, i) => (
                    <span key={i} className="text-[10px] bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded-full">
                      {ex}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-text-muted">Exercicios Faciais</Label>
              <Input
                placeholder="ex: bochechas; sorriso; lingua"
                value={dayInputs[day]?.facial || ''}
                onChange={(e) => handleInputChange(day, 'facial', e.target.value)}
              />
              {exercises[day]?.facial?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {exercises[day].facial.map((ex, i) => (
                    <span key={i} className="text-[10px] bg-emerald-400/10 text-emerald-400 px-2 py-0.5 rounded-full">
                      {ex}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}