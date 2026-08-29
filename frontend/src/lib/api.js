/**
 * API Client para FastAPI Backend (Render)
 * 
 * Configuração centralizada de chamadas HTTP com:
 * - Base URL via VITE_API_URL
 * - Tratamento de erros padronizado
 * - Headers de autorização (Bearer token) do localStorage
 */
import { getFriendlyErrorMessage, formatValidationErrors } from './errorMessages';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Cache do access token em memória, alimentado pelo AuthContext via setAccessToken.
// Evita depender de supabase.auth.getSession() no exato momento da chamada (que
// pode retornar nulo por corrida de persistência/refresh de sessão -> 401 sem header).
let _accessToken = null;

export function setAccessToken(token) {
  console.error('[api] setAccessToken:', token ? 'token-presente' : 'token-nulo');
  _accessToken = token || null;
}

/**
 * Base da API FastAPI.
 * Aceita VITE_API_URL com ou sem o sufixo "/api/v1" (normalizado abaixo).
 * Sanitiza aspas/espaços e exige protocolo http(s) — caso contrário usa o
 * fallback de produção. Sem isso uma env var mal formatada gera URLs
 * relativas (ex: https://facemax.pro/https://facemax-api.onrender.com/...).
 */
const DEFAULT_API_URL = 'https://facemax-api.onrender.com';

function resolveApiBase() {
  const raw = (import.meta.env.VITE_API_URL || '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '');

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : DEFAULT_API_URL;
  return withProtocol.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
}

export const API_BASE = resolveApiBase();

/**
 * Resolve o access token da sessao Supabase (fonte de verdade da autenticacao).
 */
async function getSupabaseToken() {
  if (_accessToken) return _accessToken;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Cria headers padrão com Content-Type e Authorization (se token existir)
 */
async function authHeaders(includeContentType = true) {
  const headers = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  const token = await getSupabaseToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Faz o parse seguro do corpo da resposta JSON.
 * Retorna {} para corpo vazio (ex: HTTP 204) ou JSON inválido,
 * evitando "JSON.parse: unexpected end of data".
 */
export async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * Trata erros de resposta da API, incluindo rate limiting (429).
 * Lança Error com mensagem amigável ao usuário.
 */
async function handleApiError(response) {
  const body = await parseJsonSafe(response);

  if (response.status === 429) {
    const retryAfter = body.retry_after || 60;
    const minutes = Math.ceil(retryAfter / 60);
    throw new Error(
      `Limite de requisições atingido. Tente novamente em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`
    );
  }

  if (response.status === 401) {
    // Token invalido/expirado no backend — limpa o cache e encerra a sessao Supabase.
    _accessToken = null;
    try {
      await supabase.auth.signOut();
    } catch {
      /* noop */
    }
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  // Trata erros de validação do FastAPI (422): detail é uma lista de erros
  if (Array.isArray(body.detail)) {
    const validationMsg = formatValidationErrors(body.detail);
    if (validationMsg) {
      throw new Error(validationMsg);
    }
  }

  // Usa mensagem amigável mapeada
  const friendlyMsg = getFriendlyErrorMessage(body.detail || 'Erro na requisição');
  throw new Error(friendlyMsg);
}

/**
 * Função genérica para requisições autenticadas
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(await authHeaders(options.body instanceof FormData ? false : true)),
        ...options.headers,
      },
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    // Para 204 No Content, retorna null
    if (response.status === 204) {
      return null;
    }

    return parseJsonSafe(response);
  } catch (err) {
    // Se já é um Error com mensagem amigável, relança
    if (err instanceof Error && err.message !== 'Failed to fetch' && !err.message.startsWith('NetworkError')) {
      throw err;
    }
    // Erro de rede (CORS, offline, DNS, etc.) - converte para mensagem amigável
    throw new Error(getFriendlyErrorMessage(err));
  }
}

/**
 * Funções de autenticação (cadastro, login, reset e confirmação de e-mail)
 * passaram a ser feitas diretamente no Supabase Auth — veja src/context/AuthContext.
 * Aqui restam apenas as chamadas de perfil e de negócio.
 */

/**
 * Obtém o perfil do usuário autenticado
 * GET /api/v1/profile/
 */
export async function getProfile() {
  return apiFetch('/api/v1/profile/');
}

/**
 * Atualiza o perfil do usuário autenticado
 * PUT /api/v1/profile/
 */
export async function updateProfile(data) {
  return apiFetch('/api/v1/profile/', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Envia foto frontal para análise via IA
 * POST /api/v1/analyze/
 */
export async function analyzeWithAI(photoFront) {
  return apiFetch('/api/v1/analyze/', {
    method: 'POST',
    body: JSON.stringify({ photo_front: photoFront }),
  });
}

/**
 * Detecta o rosto na imagem e retorna a versão recortada
 * POST /api/v1/analysis/detect-face
 */
export async function detectFace(base64Image) {
  return apiFetch('/api/v1/analysis/detect-face', {
    method: 'POST',
    body: JSON.stringify({ image: base64Image }),
  });
}

/**
 * Cria um pagamento Mercado Pago (PIX ou Checkout Pro)
 * POST /api/v1/payments/create
 */
export async function createPayment(params) {
  return apiFetch('/api/v1/payments/create', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: params.planId,
      amount: params.amount,
      payment_method: params.paymentMethod,
      success_url: params.successUrl,
      pending_url: params.pendingUrl,
    }),
  });
}

/**
 * Consulta status do pagamento
 * GET /api/v1/payments/{paymentId}/status
 */
export async function getPaymentStatus(paymentId) {
  return apiFetch(`/api/v1/payments/${paymentId}/status`);
}

/**
 * Obtém histórico de análises do usuário
 * GET /api/v1/analyze/history
 */
export async function getAnalysisHistory() {
  return apiFetch('/api/v1/analyze/history');
}

// (fim do arquivo)