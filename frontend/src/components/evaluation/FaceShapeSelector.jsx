import { Label } from '@/components/ui/label';
import oval from '@/assets/faces/oval.png';
import square from '@/assets/faces/square.png';
import rectangular from '@/assets/faces/rectangular.png';
import round from '@/assets/faces/round.png';
import heart from '@/assets/faces/heart.png';
import diamond from '@/assets/faces/diamond.png';
import pear from '@/assets/faces/pear.png';

export const FACE_SHAPE_OPTIONS = [
  { value: 'Oval', label: 'Oval', img: oval },
  { value: 'Quadrado', label: 'Quadrado', img: square },
  { value: 'Retangular', label: 'Retangular (Oblongo)', img: rectangular },
  { value: 'Redondo', label: 'Redondo', img: round },
  { value: 'Coração', label: 'Coração (Triângulo invertido)', img: heart },
  { value: 'Diamante', label: 'Diamante', img: diamond },
  { value: 'Pera', label: 'Pera (Triângulo)', img: pear },
];

export function faceShapeLabel(value) {
  return FACE_SHAPE_OPTIONS.find((o) => o.value === value)?.label || value;
}

export function FaceShapeSelector({ value, onChange, label = 'Formato do Rosto' }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {FACE_SHAPE_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`relative flex flex-col items-center gap-2 rounded-xl border p-2 text-center transition-all ${
                selected
                  ? 'border-brand-accent bg-brand-accent/10'
                  : 'border-border bg-card-bg hover:border-brand-accent/30'
              }`}
            >
              <img
                src={opt.img}
                alt={opt.label}
                className="h-16 w-auto object-contain"
              />
              <span className="text-[10px] font-medium text-text-primary">{opt.label}</span>
              {selected && (
                <span className="absolute top-1 right-1 rounded-full bg-brand-accent text-[8px] font-bold text-background px-1">✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FaceShapeSelector;
