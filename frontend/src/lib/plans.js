// Fonte única de verdade para os planos de assinatura.
// Benefícios refletem exatamente o que o profissional avalia
// (12 atributos faciais, terços, simetria, atratividade e visagismo).

export const PLANS = {
  plan_monthly: {
    id: 'plan_monthly',
    name: 'Acesso Regular',
    price: '24,90',
    priceRaw: 24.90,
    pixPrice: '29,90',
    pixPriceRaw: 29.90,
    period: 'mês',
    highlight: false,
    benefits: [
      '1 Avaliação facial completa por mês',
      'Análise dos 12 atributos faciais (escala 0-10)',
      'Relatório de Terços Faciais e Simetria',
      'Dicas de Visagismo (cabelo, barba e óculos)',
      'Fila padrão (5 dias úteis)',
    ],
  },
  plan_annual: {
    id: 'plan_annual',
    name: 'Evolução Contínua',
    price: '179,00',
    priceRaw: 179.00,
    pixPrice: '184,00',
    pixPriceRaw: 184.00,
    period: 'ano',
    tag: 'Mais Vendido — Economize R$ 120',
    highlight: true,
    benefits: [
      '2 Avaliações faciais completas por mês',
      'Painel de Evolução Temporal (compare seus scores)',
      'Score de Atratividade e Harmonia Facial detalhado',
      'Relatório estendido de proporções e destaques',
      'Fila Prioritária (48 horas)',
      'Economia de R$ 120 ao ano',
    ],
  },
  plan_black: {
    id: 'plan_black',
    name: 'Elite Estética',
    price: '49,90',
    priceRaw: 49.90,
    pixPrice: '54,90',
    pixPriceRaw: 54.90,
    period: 'mês',
    highlight: false,
    benefits: [
      '4 Avaliações por mês (acompanhamento semanal)',
      'Análise completa dos 12 atributos + atratividade',
      'Diagnóstico de Contraste Pessoal e Cores',
      'Plano de Visagismo completo (rosto, cabelo, barba, óculos)',
      'Relatório Estendido de Traços e proporções',
      'Fila Expressa Ultra-VIP (12 horas)',
    ],
  },
};

export const PLAN_ORDER = ['plan_monthly', 'plan_annual', 'plan_black'];

// Mapeia o plano salvo no perfil/localStorage para um dos ids acima.
// Retorna null se for free/sem plano (permite escolher qualquer um)
export function resolveCurrentPlan(user) {
  const fromStorage = typeof window !== 'undefined' ? localStorage.getItem('user_subscription') : null;
  const fromUser = user?.plan;
  const candidate = fromStorage || fromUser || null;
  if (!candidate || candidate === 'free') return null;
  return PLANS[candidate] ? candidate : null;
}
