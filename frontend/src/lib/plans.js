// Fonte unica de verdade para os planos de assinatura.
// Beneficios refletem exatamente o que o profissional avalia
// (12 atributos faciais, tercos, simetria, atratividade e visagismo).

export const PLANS = {
  plan_avulsa: {
    id: 'plan_avulsa',
    name: 'Analise Avulsa',
    price: '14,99',
    priceRaw: 14.99,
    pixPrice: '12,99',
    pixPriceRaw: 12.99,
    period: 'avulso',
    highlight: false,
    benefits: [
      '1 Avaliacao facial completa (uso unico)',
      'Analise dos 12 atributos faciais (escala 0-10)',
      'Relatorio de Tercos Faciais e Simetria',
      'Dicas de Visagismo (cabelo, barba e oculos)',
      'Fila padrao (24 horas ou menos)',
    ],
  },
  plan_monthly: {
    id: 'plan_monthly',
    name: 'Acesso Essencial',
    price: '24,90',
    priceRaw: 24.90,
    pixPrice: '20,00',
    pixPriceRaw: 20.00,
    period: 'mes',
    highlight: false,
    benefits: [
      '2 Avaliacoes faciais completas por mes',
      'Analise dos 12 atributos faciais (escala 0-10)',
      'Relatorio de Tercos Faciais e Simetria',
      'Dicas de Visagismo (cabelo, barba e oculos)',
      'Fila padrao (24 horas ou menos)',
    ],
  },
  plan_annual: {
    id: 'plan_annual',
    name: 'Evolucao Continua',
    price: '184,00',
    priceRaw: 184.00,
    pixPrice: '179,00',
    pixPriceRaw: 179.00,
    period: 'ano',
    tag: 'Mais Vendido — Economize R$ 60',
    highlight: true,
    benefits: [
      '4 Avaliacoes faciais completas por mes',
      'Painel de Evolucao Temporal (compare seus scores)',
      'Score de Atratividade e Harmonia Facial detalhado',
      'Relatorio estendido de proporcoes e destaques',
      'Fila Prioritaria (16 horas ou menos)',
      'Economia de R$ 60 ao ano',
    ],
  },
  plan_black: {
    id: 'plan_black',
    name: 'Lite Estetica',
    price: '54,90',
    priceRaw: 54.90,
    pixPrice: '49,90',
    pixPriceRaw: 49.90,
    period: 'mes',
    highlight: false,
    benefits: [
      '6 Avaliacoes por mes (acompanhamento semanal)',
      'Analise completa dos 12 atributos + atratividade',
      'Diagnostico de Contraste Pessoal e Cores',
      'Plano de Visagismo completo (rosto, cabelo, barba, oculos)',
      'Relatorio Estendido de Tracos e proporcoes',
      'Fila Expressa Ultra-VIP (8 horas ou menos)',
    ],
  },
};

export const PLAN_ORDER = ['plan_avulsa', 'plan_monthly', 'plan_annual', 'plan_black'];

// Mapeia o plano salvo no perfil/localStorage para um dos ids acima.
// Retorna null se for free/sem plano (permite escolher qualquer um).
// Ids legados ('pro', 'enterprise') — que existiram no frontend antigo mas
// nunca tiveram preço/oferta no backend — também retornam null: o backend
// continua honrando a cota desses usuários via último pagamento aprovado,
// mas a UI os trata como sem plano atual (convite a assinar um plano válido).
// Mapeamento backend → frontend PLANS keys
const BACKEND_PLAN_MAP = {
  free: null,
  pro: 'plan_monthly',
  enterprise: 'plan_annual',
};

export function resolveCurrentPlan(user) {
  const fromStorage = typeof window !== 'undefined' ? localStorage.getItem('user_subscription') : null;
  const fromUser = user?.plan;
  const candidate = fromStorage || fromUser || null;
  if (!candidate || candidate === 'free') return null;
  
  // Check if candidate is a direct PLANS key
  if (PLANS[candidate]) return candidate;
  
  // Check if candidate is a backend plan value that maps to a PLANS key
  const mapped = BACKEND_PLAN_MAP[candidate];
  if (mapped && PLANS[mapped]) return mapped;
  
  return null;
}
