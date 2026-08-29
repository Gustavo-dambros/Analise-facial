import { Check, Sparkles, Crown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PLANS, PLAN_ORDER, resolveCurrentPlan } from '@/lib/plans';
import { useAuth } from '@/context/AuthContext';

export default function PlanBanners() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentPlanId = resolveCurrentPlan(user);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-text-primary font-alpino flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-accent" />
            Conheça os nossos planos
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Toda avaliação cobre os 12 atributos faciais, terços, simetria, atratividade e visagismo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const isCurrent = id === currentPlanId;
          const isHighlight = plan.highlight;

          return (
            <div
              key={id}
              className={`relative rounded-2xl border p-5 flex flex-col ${
                isHighlight
                  ? 'border-brand-accent/60 bg-brand-accent/5 shadow-[0_0_30px_rgba(212,175,55,0.12)]'
                  : 'border-border bg-card-bg'
              }`}
            >
              {plan.tag && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-accent text-background text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                  {plan.tag}
                </span>
              )}

              <div className="flex items-center gap-2 mb-1">
                {id === 'plan_black' && <Crown className="w-4 h-4 text-brand-accent" />}
                <h3 className="text-sm font-semibold text-text-primary">{plan.name}</h3>
              </div>

              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-text-muted text-sm">R$</span>
                <span className="text-2xl font-black text-text-primary font-playfair">{plan.price}</span>
                <span className="text-text-muted text-xs">/ {plan.period}</span>
              </div>

              <ul className="flex flex-col gap-2 flex-1">
                {plan.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-brand-accent flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-text-secondary text-xs leading-relaxed">{benefit}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate('/#pricing')}
                className={`mt-4 w-full py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  isCurrent
                    ? 'bg-brand-accent/15 text-brand-accent cursor-default'
                    : isHighlight
                    ? 'bg-brand-accent text-background hover:opacity-90'
                    : 'border border-brand-accent/50 text-brand-accent hover:bg-brand-accent/10'
                }`}
                disabled={isCurrent}
              >
                {isCurrent ? (
                  'Plano atual'
                ) : (
                  <>
                    Assinar {plan.name}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
